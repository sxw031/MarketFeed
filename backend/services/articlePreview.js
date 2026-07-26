const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');

const MAX_TEXT_LENGTH = 4000;

function decodeHtmlEntities(text = '') {
  const entities = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    '#39': "'",
    lt: '<',
    gt: '>',
    '#x27': "'",
    '#x2F': '/'
  };
  return text.replace(/&([a-z0-9#]+);/gi, (match, entity) => entities[entity] ?? match);
}

function cleanText(input = '') {
  return decodeHtmlEntities(
    input
      .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeParagraphs(rawText = '') {
  if (!rawText) return '';
  const parts = rawText
    .split(/\n+|(?<=[.!?])\s{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 30)
    .slice(0, 8);
  return parts.join('\n\n').substring(0, MAX_TEXT_LENGTH);
}

function extractMetaDescription(html = '') {
  const match = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]*content=["']([^"']+)["']/i);
  return match ? cleanText(match[1]) : '';
}

function extractJsonLdText(html = '') {
  const chunks = [];
  const lowerHtml = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const start = lowerHtml.indexOf('<script', cursor);
    if (start === -1) break;
    const openEnd = html.indexOf('>', start);
    if (openEnd === -1) break;

    const openTag = lowerHtml.slice(start, openEnd + 1);
    const closeStart = lowerHtml.indexOf('</script', openEnd + 1);
    if (closeStart === -1) break;
    const closeEnd = html.indexOf('>', closeStart);
    cursor = closeEnd === -1 ? closeStart + 8 : closeEnd + 1;

    if (!openTag.includes('application/ld+json')) continue;
    const jsonPayload = html.slice(openEnd + 1, closeStart).trim();
    if (!jsonPayload) continue;
    try {
      const parsed = JSON.parse(jsonPayload);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (item.description) chunks.push(String(item.description));
        if (item.articleBody) chunks.push(String(item.articleBody));
      });
    } catch (_) {
      // Ignore malformed JSON-LD
    }
  }

  return normalizeParagraphs(cleanText(chunks.join('\n\n')));
}

function extractArticleParagraphs(html = '') {
  const articleSection = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html;
  const paragraphs = articleSection.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const text = paragraphs
    .map(p => cleanText(p))
    .filter(p => p.length > 40)
    .slice(0, 10)
    .join('\n\n');
  return normalizeParagraphs(text);
}

function isPrivateIp(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 0) return true; // "this network"
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local fe80::/10
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
    // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4 address too
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return true; // unknown/unparseable — fail closed
}

function isPrivateHost(hostname = '') {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost') return true;
  if (net.isIP(lower)) return isPrivateIp(lower);
  return false;
}

// Resolve the hostname and verify none of the resolved IPs are private/internal.
// This closes the gap where a public-looking hostname resolves (directly or via
// DNS rebinding) to an internal address such as the cloud metadata endpoint.
async function assertPublicHost(hostname) {
  if (isPrivateHost(hostname)) throw new Error('Unsupported source URL');
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (_) {
    throw new Error('Unsupported source URL');
  }
  if (!addresses.length || addresses.some(a => isPrivateIp(a.address))) {
    throw new Error('Unsupported source URL');
  }
}

async function fetchArticlePreview(url, fallbackSummary = '') {
  if (!url) {
    return {
      summary: fallbackSummary || '',
      preview: fallbackSummary || ''
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_) {
    return {
      summary: fallbackSummary || '',
      preview: fallbackSummary || ''
    };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Unsupported source URL');
  }

  // Manually follow redirects (rather than letting axios auto-follow) so every
  // hop — including ones added by a malicious/compromised origin server after
  // the initial DNS-rebinding-safe check — is re-validated against the private
  // IP ranges before we connect to it.
  const MAX_REDIRECTS = 5;
  let currentUrl = parsedUrl;
  let response;
  for (let redirects = 0; ; redirects++) {
    if (!['http:', 'https:'].includes(currentUrl.protocol)) {
      throw new Error('Unsupported source URL');
    }
    await assertPublicHost(currentUrl.hostname);

    response = await axios.get(currentUrl.toString(), {
      timeout: 8000,
      maxContentLength: 2 * 1024 * 1024,
      maxRedirects: 0,
      validateStatus: status => (status >= 200 && status < 300) || (status >= 300 && status < 400),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MarketFeed/1.0; +https://github.com/sxw031/MarketFeed)'
      }
    });

    const location = response.headers?.location;
    if (response.status >= 300 && response.status < 400 && location) {
      if (redirects >= MAX_REDIRECTS) throw new Error('Too many redirects');
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    break;
  }

  const html = typeof response.data === 'string' ? response.data : '';
  const metaDescription = extractMetaDescription(html);
  const jsonLdText = extractJsonLdText(html);
  const articleText = extractArticleParagraphs(html);

  const summary = (fallbackSummary || metaDescription || jsonLdText || articleText || '').substring(0, 800).trim();
  const preview = (articleText || jsonLdText || metaDescription || fallbackSummary || '').trim();

  return {
    summary,
    preview: preview.substring(0, MAX_TEXT_LENGTH),
    sourceUrl: currentUrl.toString()
  };
}

module.exports = {
  fetchArticlePreview
};
