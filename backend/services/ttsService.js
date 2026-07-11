/**
 * TTS Service - Dual engine: Google TTS (primary, HTTP) + edge-tts (fallback, WebSocket)
 * Google TTS: 100% reliable via HTTPS, works on any server
 * edge-tts: Better voice quality but requires WebSocket to Bing (may fail on some hosts)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

/**
 * Generate speech - tries edge-tts first, falls back to Google TTS
 */
async function generateSpeech(text, options = {}) {
  const maxLength = options.maxLength || 5000;

  // Clean text for speech
  const cleanText = text
    .replace(/[#*_\[\](){}|>]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .substring(0, maxLength)
    .trim();

  if (!cleanText || cleanText.length < 10) {
    throw new Error('No text to synthesize');
  }

  console.log(`[TTS] Generating speech for ${cleanText.length} chars...`);

  // Try edge-tts first (better quality)
  try {
    const buffer = await edgeTTS(cleanText);
    if (buffer && buffer.length > 1000) {
      console.log(`[TTS] edge-tts success: ${buffer.length} bytes`);
      return buffer;
    }
  } catch (err) {
    console.warn(`[TTS] edge-tts failed: ${err.message}, using Google TTS`);
  }

  // Fallback: Google TTS (always works)
  const buffer = await googleTTS(cleanText);
  console.log(`[TTS] Google TTS success: ${buffer.length} bytes`);
  return buffer;
}

/**
 * edge-tts: Microsoft Neural Voice (AndrewNeural - warm, confident)
 */
function edgeTTS(text) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.join(os.tmpdir(), 'tts_' + crypto.randomBytes(4).toString('hex'));
    fs.mkdirSync(tmpDir, { recursive: true });
    const textFile = path.join(tmpDir, 'input.txt');
    const outputFile = path.join(tmpDir, 'output.mp3');
    fs.writeFileSync(textFile, text, 'utf8');

    const args = ['-m', 'edge_tts', '--voice', 'en-US-AndrewNeural', '--rate', '+5%', '--file', textFile, '--write-media', outputFile];

    execFile('python3', args, { timeout: 30000 }, (error) => {
      try {
        if (error || !fs.existsSync(outputFile)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          return reject(new Error(error ? error.message : 'No output'));
        }
        const buffer = fs.readFileSync(outputFile);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        resolve(buffer);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Google TTS: HTTP-based, no WebSocket, works everywhere
 */
async function googleTTS(text) {
  const chunks = splitIntoChunks(text, 180);
  console.log(`[TTS] Google TTS: ${chunks.length} chunks`);
  const buffers = [];

  for (let i = 0; i < chunks.length; i++) {
    const encoded = encodeURIComponent(chunks[i]);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encoded}`;

    for (let retry = 0; retry < 3; retry++) {
      try {
        const buf = await httpGet(url);
        if (buf.length > 100) { buffers.push(buf); break; }
      } catch (e) {
        if (retry === 2) console.warn(`[TTS] Chunk ${i + 1} failed after 3 retries`);
        await sleep(150 * (retry + 1));
      }
    }
    if (i < chunks.length - 1) await sleep(80);
  }

  if (buffers.length === 0) throw new Error('Google TTS: No audio generated');
  return Buffer.concat(buffers);
}

/**
 * Generate podcast script - concise, natural rhythm, slight humor
 */
function generatePodcastScript(news) {
  if (!news || news.length === 0) return null;

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const sinchKeywords = ['messaging', 'sms', 'communication', 'api', 'cloud', 'cpaas', 'digital',
    'notification', 'verification', 'authentication', 'omnichannel', 'mobile', 'platform',
    'partnership', 'expansion', 'enterprise', 'fintech', 'banking', 'customer experience'];

  const scored = news.map(article => {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    let score = sinchKeywords.filter(kw => text.includes(kw)).length * 2;
    if (text.includes('sinch')) score += 10;
    return { ...article, score };
  });

  const top5 = scored.sort((a, b) => b.score - a.score).slice(0, 5);

  const transitions = ['First up.', 'Next.', 'Moving on.', 'Also worth noting.', 'And finally.'];
  const sinchHooks = [
    'That is right in our wheelhouse.',
    'Classic opportunity for a Sinch conversation.',
    'Where there is platform investment, there is API demand.',
    'New markets mean new messaging needs.',
    'Growth mode. Perfect time to reach out.'
  ];

  let script = `Hey there. Welcome to your MarketFeed Briefing for ${date}. `;
  script += `Got ${top5.length} stories. Let us dive in. `;

  top5.forEach((article, idx) => {
    script += `${transitions[idx]} ${article.company}. `;

    const title = article.title.replace(/['"–—|]/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = (article.description || '').replace(/['"–—|]/g, ' ').replace(/\s+/g, ' ').trim();

    // Only use desc if it adds meaningful new info
    const titleLower = title.toLowerCase();
    if (desc.length > 50 && !desc.toLowerCase().startsWith(titleLower.substring(0, 30))) {
      const short = desc.length > 100 ? desc.substring(0, 100).replace(/\s\S*$/, '') : desc;
      script += `${short}. `;
    } else {
      script += `${title}. `;
    }

    // Add Sinch angle for high-scoring articles
    if (article.score >= 4) {
      script += `${sinchHooks[idx]} `;
    }
  });

  script += `That is your update. `;
  script += `Remember. The best customer conversations start with. Hey, I saw this news about your company. `;
  script += `Simple but effective. Go crush it today. See you tomorrow!`;

  return script;
}

/**
 * Generate report audio summary script
 */
function generateReportScript(reportText) {
  if (!reportText) return null;
  let script = `Here is your strategic report summary. `;
  const lines = reportText.split('\n').filter(l => l.trim());
  const sections = [];
  let current = null;

  lines.forEach(line => {
    if (line.startsWith('#')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^#+\s*/, '').replace(/[*_#]/g, '').trim(), content: [] };
    } else if (current && line.trim() && !line.includes('|') && !line.startsWith('---')) {
      const clean = line.replace(/[*_#\[\]()>|]/g, '').replace(/https?:\/\/\S+/g, '').trim();
      if (clean.length > 10) current.content.push(clean);
    }
  });
  if (current) sections.push(current);

  sections.slice(0, 5).forEach(s => {
    if (s.title) script += `${s.title}. `;
    script += s.content.slice(0, 2).join('. ') + '. ';
  });

  script += `End of summary. See the written report for full details.`;
  return script;
}

// ===== Helpers =====
function splitIntoChunks(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      if (s.length > maxLen) {
        const parts = s.match(new RegExp(`.{1,${maxLen}}(?:\\s|$)`, 'g')) || [s];
        parts.forEach(p => { if (p.trim()) chunks.push(p.trim()); });
        current = '';
      } else {
        current = s;
      }
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), 10000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { clearTimeout(timer); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
      res.on('error', e => { clearTimeout(timer); reject(e); });
    }).on('error', e => { clearTimeout(timer); reject(e); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { generateSpeech, generatePodcastScript, generateReportScript };
