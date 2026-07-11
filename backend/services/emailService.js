const { query } = require('../models/db');
const { COMPANIES } = require('../config/sources');

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

// Generate a random unsubscribe token
function generateToken() {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
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
        <a href="${podcastUrl}">▶ Play Podcast</a>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-title">📰 Top 3 News Highlights</div>
      ${topNews.map((n, i) => `
      <div class="news-item">
        <h3><a href="${n.url}">${i + 1}. ${n.title}</a></h3>
        <p>${n.description || ''}</p>
        <div class="news-meta"><span class="badge">${n.company}</span> ${n.source} · ${new Date(n.publishedAt).toLocaleDateString()}</div>
      </div>`).join('')}
    </div>

    <div class="section">
      <div class="section-title">💡 Suggested Actions</div>
      <div class="strategy-card">
        <ul style="padding-left: 1.2rem; margin: 0;">
          ${strategy.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>You're receiving this because you subscribed to AlphaFeed ${freqLabel} Digest.</p>
      <p><a href="{{UNSUBSCRIBE_URL}}?token=${unsubscribeToken}">Unsubscribe</a> · <a href="{{APP_URL}}">Open AlphaFeed</a></p>
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
  suggestions.push(`Review the full digest on AlphaFeed for deeper analysis and strategy reports.`);

  return suggestions.slice(0, 4);
}

module.exports = {
  initSubscriptionTable,
  subscribe,
  unsubscribe,
  getActiveSubscriptions,
  generateEmailHTML,
  generateStrategySuggestions
};
