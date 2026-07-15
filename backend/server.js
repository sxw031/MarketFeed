require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, getNews, getNewsCount } = require('./services/newsAggregator');
const { generateHeuristicReport } = require('./services/strategyEngine');
const { initIPOTable, getIPOs, getIPOStats } = require('./services/ipoTracker');
const { generateChatAnswer } = require('./services/aiChatService');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Middleware
app.use(compression()); // gzip all responses
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Basic rate limiting (in-memory, per IP)
const rateLimitMap = new Map();
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // 100 requests per minute per IP
    const record = rateLimitMap.get(ip) || { count: 0, start: now };
    if (now - record.start > windowMs) {
      record.count = 1; record.start = now;
    } else {
      record.count++;
    }
    rateLimitMap.set(ip, record);
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
  }
  next();
});
// Cleanup rate limit map every 5 minutes
setInterval(() => { const now = Date.now(); for (const [k, v] of rateLimitMap) { if (now - v.start > 120000) rateLimitMap.delete(k); } }, 300000);

// Static files. HTML/CSS/JS must always revalidate so bug fixes and UI
// changes reach users immediately after a deploy instead of being served
// stale from the browser cache for up to a day. Images can still be cached
// aggressively since their content rarely changes.
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(html)$/)) {
      res.setHeader('Cache-Control', 'no-cache'); // always revalidate with ETag
    } else if (filePath.match(/\.(css|js)$/)) {
      res.setHeader('Cache-Control', 'no-cache'); // always revalidate with ETag
    } else if (filePath.match(/\.(png|jpg|svg|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
    }
  }
}));

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache for news API
function getCached(key) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  apiCache.set(key, { data, ts: Date.now() });
  // Limit cache size
  if (apiCache.size > 50) {
    const oldest = apiCache.keys().next().value;
    apiCache.delete(oldest);
  }
}

// API Routes
app.use('/api/news', newsRoutes);

// AI Strategy Report (heuristic, no API key needed)
// Supports period: 'daily', 'weekly', 'monthly', 'quarterly'
app.post('/api/news/ai/strategy', async (req, res) => {
  try {
    const { news, period = 'daily' } = req.body;
    let articles = news || [];

    // For weekly/monthly/quarterly, fetch from DB if no news provided or if period requires more data
    if (['weekly', 'monthly', 'quarterly'].includes(period)) {
      const daysMap = { weekly: 7, monthly: 30, quarterly: 90 };
      const days = daysMap[period] || 1;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const dbArticles = await getNews({ startDate: startDate.toISOString(), limit: 500 });
      if (dbArticles && dbArticles.length > 0) articles = dbArticles;
    }

    const report = generateHeuristicReport(articles, period);
    res.json({ success: true, report, period, articleCount: articles.length });
  } catch (error) {
    console.error('[Strategy]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Chat - Smart heuristic Q&A for account managers
app.post('/api/news/ai/chat', async (req, res) => {
  try {
    const { query, context, history } = req.body;
    const answer = generateChatAnswer(query, context, Array.isArray(history) ? history.slice(-10) : []);
    res.json({ success: true, answer });
  } catch (error) {
    console.error('[AI Chat]', error.message);
    res.json({ success: true, answer: 'Sorry, I hit a snag processing that. Could you rephrase your question?' });
  }
});

// ==================== EMAIL SUBSCRIPTION ====================
const { initSubscriptionTable, subscribe, unsubscribe, getActiveSubscriptions, generateStrategySuggestions } = require('./services/emailService');
initSubscriptionTable().catch(e => console.error('[Email] Table init error:', e.message));

app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, companies, frequency } = req.body;
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ success: false, error: 'Valid email required' });
    }
    const result = await subscribe({ email, companies: companies || [], frequency: frequency || 'daily' });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.get('/api/unsubscribe', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, error: 'Token required' });
  const success = await unsubscribe(token);
  if (success) {
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:3rem;"><h2>Unsubscribed</h2><p>You have been successfully unsubscribed from AlphaFeed digests.</p></body></html>');
  } else {
    res.status(404).send('<html><body style="font-family:sans-serif;text-align:center;padding:3rem;"><h2>Not Found</h2><p>Subscription not found or already unsubscribed.</p></body></html>');
  }
});

app.get('/api/subscriptions', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  const rows = await getActiveSubscriptions('daily');
  const weekly = await getActiveSubscriptions('weekly');
  const monthly = await getActiveSubscriptions('monthly');
  const all = [...rows, ...weekly, ...monthly].filter(r => r.email === email);
  res.json({ success: true, data: all.length > 0 ? all[0] : null });
});

// ==================== IPO TRACKER ====================
initIPOTable().catch(e => console.error('[IPO] Table init error:', e.message));

app.get('/api/ipo', async (req, res) => {
  try {
    const { window = '6months', status } = req.query;
    const ipos = await getIPOs({ window, status });
    const stats = await getIPOStats();
    res.json({ success: true, data: ipos, stats });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AlphaFeed is running', uptime: Math.round(process.uptime()) });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AlphaFeed] Running on port ${PORT}`);

  // DB maintenance on startup
  const { cleanupOldArticles } = require('./models/db');
  setTimeout(() => cleanupOldArticles(), 5000);

  // Auto-sync on startup (non-blocking)
  setTimeout(async () => {
    try {
      const count = await getNewsCount();
      console.log(`[Startup] Current news count: ${count}`);
      if (count < 10) {
        console.log('[Startup] Low news count, triggering initial sync...');
        await aggregateAllNews({
          onProgress: (name) => console.log(`  Syncing: ${name}`)
        });
      }
    } catch (err) {
      console.error('[Startup] Auto-sync failed:', err.message);
    }
  }, 2000);

  // Recurring sync every 2 hours
  setInterval(async () => {
    console.log('[Scheduled] Running periodic sync...');
    try {
      await aggregateAllNews({});
    } catch (err) {
      console.error('[Scheduled] Sync failed:', err.message);
    }
  }, 2 * 60 * 60 * 1000);
});

module.exports = app;
