const axios = require('axios');

const MAX_TEXT_LENGTH = 4000;

function decodeHtmlEntities(text = '') {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');
}

function cleanText(input = '') {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
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
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const chunks = [];

  for (const script of scripts) {
    const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!jsonMatch) continue;
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
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

function isPrivateHost(hostname = '') {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower === '::1') return true;
  if (/^127\./.test(lower) || /^10\./.test(lower) || /^192\.168\./.test(lower)) return true;
  const m = lower.match(/^172\.(\d+)\./);
  return !!(m && Number(m[1]) >= 16 && Number(m[1]) <= 31);
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

  if (!['http:', 'https:'].includes(parsedUrl.protocol) || isPrivateHost(parsedUrl.hostname)) {
    throw new Error('Unsupported source URL');
  }

  const response = await axios.get(parsedUrl.toString(), {
    timeout: 8000,
    maxContentLength: 2 * 1024 * 1024,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MarketFeed/1.0; +https://github.com/sxw031/MarketFeed)'
    }
  });

  const html = typeof response.data === 'string' ? response.data : '';
  const metaDescription = extractMetaDescription(html);
  const jsonLdText = extractJsonLdText(html);
  const articleText = extractArticleParagraphs(html);

  const summary = (fallbackSummary || metaDescription || jsonLdText || articleText || '').substring(0, 800).trim();
  const preview = (articleText || jsonLdText || metaDescription || fallbackSummary || '').trim();

  return {
    summary,
    preview: preview.substring(0, MAX_TEXT_LENGTH),
    sourceUrl: parsedUrl.toString()
  };
}

module.exports = {
  fetchArticlePreview
};
