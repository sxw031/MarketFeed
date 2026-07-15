require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const newsRoutes = require('./routes/news');
const { createAiRouter } = require('./routes/ai');
const { aggregateAllNews, getNews, getNewsCount } = require('./services/newsAggregator');
const { initIPOTable, getIPOs, getIPOStats } = require('./services/ipoTracker');
const { cleanupOldArticles } = require('./models/db');
const { startBackgroundSync } = require('./services/backgroundSync');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow the configured app origins plus the current request host so
// preview/custom domains on the same deployment do not get blocked.
const DEFAULT_PROD_ORIGINS = ['https://marketfeed.onrender.com'];
const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => normalizeOrigin(o.trim()))
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
const defaultOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : (isProduction ? DEFAULT_PROD_ORIGINS : [...DEFAULT_PROD_ORIGINS, ...DEFAULT_DEV_ORIGINS]);
const allowedOrigins = new Set([
  ...defaultOrigins,
  normalizeOrigin(process.env.APP_URL)
].filter(Boolean));

function requestOriginFor(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  if (!host) return null;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || (isProduction ? 'https' : 'http'))
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

const corsOptionsDelegate = (req, callback) => {
  const origin = normalizeOrigin(req.header('Origin'));
  const requestOrigin = requestOriginFor(req);
  callback(null, {
    origin(originToCheck, done) {
      const normalizedOrigin = normalizeOrigin(originToCheck || origin);
      // Allow non-browser requests (no Origin header, e.g. curl/server-to-server)
      if (!normalizedOrigin) return done(null, true);
      if (allowedOrigins.has(normalizedOrigin)) return done(null, true);
      if (requestOrigin && normalizedOrigin === requestOrigin) return done(null, true);
      done(new Error('Not allowed by CORS'));
    }
  });
};

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
app.use(cors(corsOptionsDelegate));
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

// API Routes
app.use('/api/news', newsRoutes);
app.use('/api/news/ai', createAiRouter({ getNews }));

// ==================== EMAIL SUBSCRIPTION ====================
const { initSubscriptionTable, subscribe, unsubscribe, sendDigestEmails } = require('./services/emailService');
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

// Note: a previous `/api/subscriptions?email=` lookup endpoint was removed —
// it allowed anyone who knew (or guessed) an email address to retrieve that
// user's subscription details (frequency, tracked companies) with no
// authentication. It was unused by the frontend, so no UI changes needed.

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
  startBackgroundSync({ aggregateAllNews, getNewsCount, cleanupOldArticles, sendDigestEmails, getNews });
});

module.exports = app;
