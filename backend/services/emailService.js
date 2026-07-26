const crypto = require('crypto');
const { query } = require('../models/db');
const { COMPANIES } = require('../config/sources');

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

// Only allow http/https URLs in generated email links/hrefs. Article URLs
// originate from third-party RSS feeds and must not be rendered verbatim.
function safeUrl(url) {
  const trimmed = String(url || '').trim();
  return /^https?:\/\//i.test(trimmed) ? escapeHtml(trimmed) : '#';
}

// Initialize subscription table
async function initSubscriptionTable() {
  await query.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    companies TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'daily',
    created_at TEXT DEFAULT (datetime('now')),
    last_sent TEXT,
    active INTEGER DEFAULT 1,
    unsubscribe_token TEXT UNIQUE
  )`);
  await query.run(`CREATE INDEX IF NOT EXISTS idx_sub_email ON subscriptions(email)`);
  await query.run(`CREATE INDEX IF NOT EXISTS idx_sub_active ON subscriptions(active)`);
}

// Generate a cryptographically secure random unsubscribe token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Subscribe a user
async function subscribe({ email, companies, frequency }) {
  if (!email || !companies || !companies.length) {
    throw new Error('Email and at least one company are required');
  }
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
    throw new Error('Frequency must be daily, weekly, or monthly');
  }

  // Check if already subscribed
  const existing = await query.get('SELECT id FROM subscriptions WHERE email = ? AND active = 1', [email]);
  const token = generateToken();

  if (existing) {
    // Update existing subscription
    await query.run(
      'UPDATE subscriptions SET companies = ?, frequency = ?, unsubscribe_token = ? WHERE id = ?',
      [JSON.stringify(companies), frequency, token, existing.id]
    );
    return { updated: true, token };
  }

  await query.run(
    'INSERT INTO subscriptions (email, companies, frequency, unsubscribe_token) VALUES (?, ?, ?, ?)',
    [email, JSON.stringify(companies), frequency, token]
  );
  return { created: true, token };
}

// Unsubscribe
async function unsubscribe(token) {
  const result = await query.run('UPDATE subscriptions SET active = 0 WHERE unsubscribe_token = ?', [token]);
  return result.changes > 0;
}

// Get all active subscriptions for a given frequency
async function getActiveSubscriptions(frequency) {
  const rows = await query.all(
    'SELECT * FROM subscriptions WHERE active = 1 AND frequency = ?',
    [frequency]
  );
  return rows.map(r => ({ ...r, companies: JSON.parse(r.companies) }));
}

// --- Digest sending (SMTP via nodemailer) ---
// Sending is only attempted when SMTP_HOST/SMTP_USER/SMTP_PASS are configured.
// Without them, this is a documented no-op so subscriptions can still be collected
// in environments (e.g. local dev, sandboxes) that don't have real mail credentials.
const FREQUENCY_INTERVAL_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
};

let cachedTransporter = null;
let loggedMissingSmtpConfig = false;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getMailTransporter() {
  if (!isSmtpConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;
  // Lazy-require so environments without the dependency installed (or without
  // SMTP configured) never pay the cost of loading it.
  const nodemailer = require('nodemailer');
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return cachedTransporter;
}

// Find subscriptions of a given frequency that are due to receive a digest
// (never sent, or last sent longer ago than the frequency's interval).
async function getDueSubscriptions(frequency) {
  const intervalMs = FREQUENCY_INTERVAL_MS[frequency];
  if (!intervalMs) return [];
  const cutoffISO = new Date(Date.now() - intervalMs).toISOString();
  const rows = await query.all(
    `SELECT * FROM subscriptions WHERE active = 1 AND frequency = ? AND (last_sent IS NULL OR last_sent <= ?)`,
    [frequency, cutoffISO]
  );
  return rows.map(r => ({ ...r, companies: JSON.parse(r.companies) }));
}

async function markDigestSent(subscriptionId) {
  await query.run('UPDATE subscriptions SET last_sent = ? WHERE id = ?', [new Date().toISOString(), subscriptionId]);
}

/**
 * Send digest emails for a given frequency ('daily' | 'weekly' | 'monthly').
 * `getNews` is injected (from newsAggregator) to avoid a hard dependency cycle.
 * Returns a summary of how many digests were sent/skipped/failed.
 */
async function sendDigestEmails(frequency, { getNews, appUrl, unsubscribeUrl } = {}) {
  const due = await getDueSubscriptions(frequency);
  if (due.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  const transporter = getMailTransporter();
  if (!transporter) {
    if (!loggedMissingSmtpConfig) {
      console.log('[Email] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — digest emails will not be sent. Set these env vars to enable delivery.');
      loggedMissingSmtpConfig = true;
    }
    return { sent: 0, skipped: due.length, failed: 0 };
  }

  const resolvedAppUrl = appUrl || process.env.APP_URL || 'http://localhost:3000';
  const resolvedUnsubUrl = unsubscribeUrl || process.env.UNSUBSCRIBE_URL || `${resolvedAppUrl}/api/unsubscribe`;
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  let sent = 0, failed = 0;
  for (const sub of due) {
    try {
      const news = getNews ? await getNews({ companies: sub.companies, limit: 20, sort: 'latest' }) : [];
      const topNews = news.slice(0, 3);
      const strategy = generateStrategySuggestions(news);
      const html = generateEmailHTML({
        topNews,
        strategy,
        podcastUrl: null,
        frequency,
        unsubscribeToken: sub.unsubscribe_token
      })
        .replace('{{UNSUBSCRIBE_URL}}', resolvedUnsubUrl)
        .replace('{{APP_URL}}', resolvedAppUrl);

      await transporter.sendMail({
        from: fromAddress,
        to: sub.email,
        subject: `AlphaFeed ${frequency.charAt(0).toUpperCase()}${frequency.slice(1)} Digest`,
        html
      });
      await markDigestSent(sub.id);
      sent++;
    } catch (err) {
      console.error(`[Email] Failed to send ${frequency} digest to ${sub.email}:`, err.message);
      failed++;
    }
  }
  return { sent, skipped: 0, failed };
}

// Generate email HTML content
function generateEmailHTML({ topNews, strategy, podcastUrl, frequency, unsubscribeToken }) {
  const freqLabel = frequency === 'daily' ? 'Daily' : frequency === 'weekly' ? 'Weekly' : 'Monthly';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 2rem; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 1.5rem; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.8); margin: 0.5rem 0 0; font-size: 0.9rem; }
    .section { padding: 1.5rem 2rem; }
    .section-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #eef2ff; }
    .podcast-card { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; text-align: center; }
    .podcast-card a { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 0.6rem 1.5rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem; }
    .news-item { padding: 1rem 0; border-bottom: 1px solid #f1f5f9; }
    .news-item:last-child { border-bottom: none; }
    .news-item h3 { margin: 0 0 0.4rem; font-size: 0.95rem; color: #1e293b; }
    .news-item h3 a { color: #6366f1; text-decoration: none; }
    .news-item p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
    .news-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 0.3rem; }
    .strategy-card { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem; margin-top: 0.5rem; }
    .strategy-card li { font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 1.5rem 2rem; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0.3rem 0; font-size: 0.75rem; color: #94a3b8; }
    .footer a { color: #6366f1; text-decoration: none; }
    .badge { display: inline-block; background: #eef2ff; color: #6366f1; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right: 0.3rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AlphaFeed ${freqLabel} Digest</h1>
      <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    ${podcastUrl ? `
    <div class="section">
      <div class="section-title">🎧 3-Minute Audio Brief</div>
      <div class="podcast-card">
        <p style="margin: 0 0 0.75rem; font-size: 0.85rem; color: #475569;">Listen to your personalized market summary</p>
        <a href="${safeUrl(podcastUrl)}">▶ Play Podcast</a>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-title">📰 Top 3 News Highlights</div>
      ${topNews.map((n, i) => `
      <div class="news-item">
        <h3><a href="${safeUrl(n.url)}">${i + 1}. ${escapeHtml(n.title)}</a></h3>
        <p>${escapeHtml(n.description || '')}</p>
        <div class="news-meta"><span class="badge">${escapeHtml(n.company)}</span> ${escapeHtml(n.source)} · ${new Date(n.publishedAt).toLocaleDateString()}</div>
      </div>`).join('')}
    </div>

    <div class="section">
      <div class="section-title">💡 Suggested Actions</div>
      <div class="strategy-card">
        <ul style="padding-left: 1.2rem; margin: 0;">
          ${strategy.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>You're receiving this because you subscribed to AlphaFeed ${freqLabel} Digest.</p>
      <p><a href="{{UNSUBSCRIBE_URL}}?token=${encodeURIComponent(unsubscribeToken)}">Unsubscribe</a> · <a href="{{APP_URL}}">Open AlphaFeed</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Generate strategy suggestions based on news
function generateStrategySuggestions(news) {
  const suggestions = [];
  const companies = [...new Set(news.map(n => n.company))];

  if (news.length === 0) {
    return ['No significant news today. Good time to review your portfolio strategy.'];
  }

  // Analyze news themes
  const themes = {
    growth: news.filter(n => /growth|expand|launch|partner/i.test(n.title + ' ' + (n.description || ''))),
    risk: news.filter(n => /risk|decline|loss|probe|fine|lawsuit/i.test(n.title + ' ' + (n.description || ''))),
    innovation: news.filter(n => /ai|tech|innovat|digital|platform/i.test(n.title + ' ' + (n.description || '')))
  };

  if (themes.growth.length > 0) {
    const co = themes.growth[0].company;
    suggestions.push(`${co} shows growth signals — consider increasing engagement or exploring partnership opportunities.`);
  }
  if (themes.risk.length > 0) {
    const co = themes.risk[0].company;
    suggestions.push(`Monitor ${co} closely — risk indicators detected. Review exposure and contingency plans.`);
  }
  if (themes.innovation.length > 0) {
    suggestions.push(`Innovation trend detected across ${themes.innovation.length} article(s). Explore how emerging tech could impact your strategy.`);
  }
  if (companies.length > 3) {
    suggestions.push(`${companies.length} companies in your watchlist had news activity. Prioritize outreach to the most active ones.`);
  }

  // Always add a general action
  suggestions.push(`Review the full digest on AlphaFeed for deeper analysis and Market Intelligence reports.`);

  return suggestions.slice(0, 4);
}

module.exports = {
  initSubscriptionTable,
  subscribe,
  unsubscribe,
  getActiveSubscriptions,
  generateEmailHTML,
  generateStrategySuggestions,
  sendDigestEmails,
  isSmtpConfigured
};
