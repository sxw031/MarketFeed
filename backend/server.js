require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, getNews, getNewsCount } = require('./services/newsAggregator');
const { generateHeuristicReport } = require('./services/strategyEngine');
const { initIPOTable, getIPOs, getIPOStats } = require('./services/ipoTracker');

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

// Static files with aggressive caching for assets
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache images/css/js longer
    if (filePath.match(/\.(png|jpg|svg|ico|css|js)$/)) {
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
    const { query, context } = req.body;
    if (!query) return res.json({ success: true, answer: 'Hi! I\'m your MarketFeed assistant. Ask me about any of the 40+ companies I track, market trends, or engagement opportunities.' });

    const q = query.toLowerCase();
    const news = context || [];
    const { COMPANIES } = require('./config/sources');
    const companyNames = COMPANIES.map(c => c.name);

    // Detect mentioned company (handle partial matches too)
    let mentionedCompany = companyNames.find(c => q.includes(c.toLowerCase()));
    if (!mentionedCompany) {
      // Try partial/alias matching
      const aliases = { 'dbs': 'DBS', 'hsbc': 'HSBC', 'grab': 'Grab', 'temu': 'Temu', 'didi': 'Didi', 'gojek': 'Gojek', 'citi': 'Citigroup', 'citibank': 'Citigroup', 'alibaba': 'Alibaba', 'ali': 'Alibaba', 'tiktok': 'ByteDance', 'bytedance': 'ByteDance', 'tencent': 'Tencent', 'wechat': 'Tencent', 'binance': 'Binance', 'crypto': 'Binance', 'cathay': 'Cathay Pacific', 'vodafone': 'Vodafone', 'stanchart': 'Standard Chartered', 'sc': 'Standard Chartered', 'boc': 'Bank of China', 'shopback': 'ShopBack', 'aeon': 'Aeon Credit', 'ctrip': 'Ctrip', 'trip.com': 'Ctrip', 'tesla': 'Tesla', 'tsla': 'Tesla', 'helios': 'Helios Energy', 'coinbase': 'Coinbase', 'apple': 'Apple', 'iphone': 'Apple', 'alphabet': 'Alphabet', 'google': 'Alphabet', 'nvidia': 'NVIDIA', 'nvda': 'NVIDIA', 'databricks': 'Databricks', 'netflix': 'Netflix', 'meta': 'Meta', 'facebook': 'Meta', 'instagram': 'Meta', 'spacex': 'SpaceX', 'stripe': 'Stripe', 'microsoft': 'Microsoft', 'msft': 'Microsoft', 'amazon': 'Amazon', 'aws': 'Amazon', 'shein': 'Shein', 'samsung': 'Samsung', 'walmart': 'Walmart', 'openai': 'OpenAI', 'chatgpt': 'OpenAI', 'gpt': 'OpenAI', 'sf express': 'SF Express', '顺丰': 'SF Express', 'catl': 'CATL', '宁德时代': 'CATL', 'jpmorgan': 'JPMorgan', 'jpm': 'JPMorgan', 'tsmc': 'TSMC', 'anthropic': 'Anthropic', 'claude': 'Anthropic', 'singtel': 'Singtel', 'starhub': 'StarHub' };
      const matchedAlias = Object.keys(aliases).find(a => q.includes(a));
      if (matchedAlias) mentionedCompany = aliases[matchedAlias];
    }

    // Detect intent
    const isAboutTrends = /trend|overview|summary|what.s happening|update|latest|market|today/i.test(query);
    const isAboutOpportunity = /opportunity|csm|engagement|outreach|upsell|cross.sell|prospect|pipeline/i.test(query);
    const isAboutRisk = /risk|threat|concern|problem|issue|challenge|warning|negative/i.test(query);
    const isAboutStrategy = /strategy|recommend|suggest|action|next step|what should|how to|approach/i.test(query);
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|sup|yo)\b/i.test(query.trim());

    let answer = '';

    if (isGreeting) {
      const count = news.length;
      const companies = [...new Set(news.map(n => n.company))].length;
      answer = `Hey there! 👋\n\nI'm currently tracking **${count} articles** across **${companies} companies** in your portfolio. Here's what I can help with:\n\n`;
      answer += `- Ask about a specific company: *"What's happening with HSBC?"*\n`;
      answer += `- Get market trends: *"Give me an overview"*\n`;
      answer += `- Find opportunities: *"Any engagement opportunities?"*\n`;
      answer += `- Strategic advice: *"What should I focus on this week?"*\n\n`;
      answer += `What would you like to know?`;
    } else if (mentionedCompany) {
      const companyNews = news.filter(n => n.company === mentionedCompany);
      if (companyNews.length > 0) {
        const strategic = companyNews.filter(n => n.category === 'Strategic Insights');
        const finance = companyNews.filter(n => n.category === 'Finance');
        const tech = companyNews.filter(n => n.category === 'Technology');

        answer = `## ${mentionedCompany}\n\n`;
        answer += `I've got **${companyNews.length} recent articles** on ${mentionedCompany}. Let me break it down:\n\n`;

        if (strategic.length > 0) {
          answer += `### 🚀 Strategic Moves\n`;
          strategic.slice(0, 3).forEach(n => {
            answer += `- **${n.title}** — *${n.source}*\n`;
          });
          answer += `\n`;
        }

        if (finance.length > 0) {
          answer += `### 💰 Financial Updates\n`;
          finance.slice(0, 2).forEach(n => {
            answer += `- ${n.title} — *${n.source}*\n`;
          });
          answer += `\n`;
        }

        if (tech.length > 0) {
          answer += `### 💻 Technology & Digital\n`;
          tech.slice(0, 2).forEach(n => {
            answer += `- ${n.title} — *${n.source}*\n`;
          });
          answer += `\n`;
        }

        // Provide engagement angle
        const relevanceKw = ['messaging', 'communication', 'api', 'digital', 'platform', 'app', 'notification', 'customer', 'mobile', 'cloud', 'engagement', 'chatbot', 'ai', 'automation'];
        const relevantSignals = companyNews.filter(n => relevanceKw.some(kw => ((n.title||'')+(n.description||'')).toLowerCase().includes(kw)));
        
        answer += `---\n\n`;
        if (relevantSignals.length > 0) {
          answer += `### 🎯 Your Engagement Angle\n\n`;
          answer += `I spotted **${relevantSignals.length} signal${relevantSignals.length > 1 ? 's' : ''}** that could be relevant for outreach. `;
          answer += `${mentionedCompany} appears to be investing in digital/communication infrastructure. `;
          answer += `This could be a good time to:\n\n`;
          answer += `1. **Schedule a check-in** to discuss their evolving communication needs\n`;
          answer += `2. **Share a case study** about similar companies using CPaaS solutions\n`;
          answer += `3. **Propose a QBR topic** around: *${relevantSignals[0].title.substring(0, 60)}*\n`;
        } else {
          answer += `### 💡 CSM Note\n\n`;
          answer += `No direct communication/messaging signals this cycle, but stay engaged. Monitor for digital transformation or customer experience initiatives that could open doors for engagement.`;
        }
      } else {
        answer = `I don't have recent news about **${mentionedCompany}** in your current view.\n\n`;
        answer += `**Quick fixes:**\n`;
        answer += `- Expand the time range to 48h or 1 week\n`;
        answer += `- Click Refresh to fetch the latest\n`;
        answer += `- Check if ${mentionedCompany} is in your selected companies filter`;
      }
    } else if (isAboutOpportunity) {
      const engagementKw = ['messaging', 'communication', 'api', 'digital', 'platform', 'notification', 'customer engagement', 'chatbot', 'rcs', 'sms', 'mobile', 'cloud communication', 'omnichannel'];
      const opportunities = news.filter(n => engagementKw.some(kw => ((n.title||'')+(n.description||'')).toLowerCase().includes(kw)));
      
      answer = `## 🎯 Engagement Radar\n\n`;
      
      if (opportunities.length > 0) {
        answer += `Great news — I found **${opportunities.length} signals** across your accounts that align with communication & engagement opportunities:\n\n`;
        const byCompany = {};
        opportunities.forEach(n => { if (!byCompany[n.company]) byCompany[n.company] = []; byCompany[n.company].push(n); });
        
        const sorted = Object.entries(byCompany).sort((a, b) => b[1].length - a[1].length);
        sorted.slice(0, 6).forEach(([co, arts]) => {
          const strength = arts.length >= 3 ? '🔥 Hot' : arts.length >= 2 ? '⚡ Warm' : '📌 Watch';
          answer += `**${co}** ${strength}\n`;
          arts.slice(0, 2).forEach(a => { answer += `  - ${a.title}\n`; });
          answer += `\n`;
        });
        
        answer += `---\n\n`;
        answer += `**Recommended Actions:**\n`;
        answer += `1. Prioritize the 🔥 Hot accounts for immediate outreach\n`;
        answer += `2. Prepare talking points around their digital initiatives\n`;
        answer += `3. Generate a Strategy Report for detailed per-account action plans\n`;
      } else {
        answer += `No strong CPaaS/messaging signals detected right now. This is normal — not every news cycle will surface opportunities.\n\n`;
        answer += `**What to do:**\n`;
        answer += `- Expand to 1-week view for broader signal detection\n`;
        answer += `- Check the Strategy Report for pattern-based recommendations\n`;
        answer += `- Focus on relationship maintenance with your top accounts`;
      }
    } else if (isAboutTrends) {
      const companies = [...new Set(news.map(n => n.company))];
      const categories = {};
      news.forEach(n => { categories[n.category || 'General'] = (categories[n.category || 'General'] || 0) + 1; });
      const counts = {};
      news.forEach(n => { counts[n.company] = (counts[n.company] || 0) + 1; });
      const topCompanies = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);

      answer = `## 📊 Market Pulse\n\n`;
      answer += `Here's your snapshot across **${news.length} articles** from **${companies.length} companies**:\n\n`;
      
      answer += `### Most Active This Cycle\n`;
      topCompanies.forEach(([co, cnt], i) => {
        const bar = '█'.repeat(Math.min(cnt, 10));
        answer += `${i+1}. **${co}** — ${cnt} articles ${bar}\n`;
      });
      
      answer += `\n### Category Breakdown\n`;
      answer += `| Category | Count | % |\n|----------|-------|---|\n`;
      Object.entries(categories).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        answer += `| ${cat} | ${count} | ${Math.round(count/news.length*100)}% |\n`;
      });
      
      answer += `\n### Key Takeaway\n`;
      const topCat = Object.entries(categories).sort((a,b) => b[1]-a[1])[0];
      answer += `The dominant theme is **${topCat[0]}** (${topCat[1]} articles). `;
      if (topCat[0] === 'Strategic Insights') {
        answer += `This suggests significant corporate activity — mergers, partnerships, and expansions are in play. Great time for proactive CSM outreach.`;
      } else if (topCat[0] === 'Technology') {
        answer += `Tech-heavy cycles often signal digital transformation budgets being deployed — a prime opportunity for CPaaS conversations.`;
      } else {
        answer += `Keep monitoring for strategic signals that could translate into engagement opportunities.`;
      }
    } else if (isAboutRisk) {
      const riskKw = ['layoff', 'cut', 'decline', 'loss', 'fine', 'penalty', 'lawsuit', 'investigation', 'breach', 'hack', 'downturn', 'restructur', 'close', 'shut'];
      const risks = news.filter(n => riskKw.some(kw => ((n.title||'')+(n.description||'')).toLowerCase().includes(kw)));
      
      answer = `## ⚠️ Risk Radar\n\n`;
      if (risks.length > 0) {
        answer += `Detected **${risks.length} potential risk signals** across your accounts:\n\n`;
        risks.slice(0, 5).forEach(n => {
          answer += `- **${n.company}**: ${n.title}\n`;
        });
        answer += `\n**CSM Implication:** These accounts may be going through internal changes. Approach with empathy, focus on value demonstration, and be prepared for potential budget discussions or stakeholder changes.`;
      } else {
        answer += `No significant risk signals detected in the current view. Your accounts appear stable. This is a good time for growth-oriented conversations rather than defensive plays.`;
      }
    } else if (isAboutStrategy) {
      const strategic = news.filter(n => n.category === 'Strategic Insights');
      const topStrategic = [...new Set(strategic.map(n => n.company))].slice(0, 5);
      
      answer = `## 🧭 This Week's Playbook\n\n`;
      answer += `Based on ${news.length} signals I'm tracking, here's my recommended focus:\n\n`;
      answer += `### Priority Accounts\n`;
      if (topStrategic.length > 0) {
        topStrategic.forEach((co, i) => {
          const coNews = strategic.filter(n => n.company === co);
          answer += `${i+1}. **${co}** — ${coNews.length} strategic signal${coNews.length > 1 ? 's' : ''} (${coNews[0].title.substring(0, 50)}...)\n`;
        });
      }
      answer += `\n### Recommended Actions\n\n`;
      answer += `1. **Immediate:** Schedule touchpoints with accounts showing expansion/partnership signals\n`;
      answer += `2. **This week:** Prepare QBR materials incorporating the latest strategic moves\n`;
      answer += `3. **Ongoing:** Monitor for digital transformation announcements — these are your strongest entry points\n`;
      answer += `4. **Proactive:** Share relevant industry insights with your champions to stay top-of-mind\n\n`;
      answer += `*Pro tip: Click "Generate Strategy Report" for a detailed, per-account action plan you can share with your team.*`;
    } else {
      // Smart keyword search with context
      const words = q.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'are', 'was', 'what', 'how', 'why', 'who', 'when', 'where', 'can', 'does', 'about', 'with', 'this', 'that', 'from', 'have', 'has'].includes(w));
      const relevant = news.filter(n => {
        const text = ((n.title || '') + ' ' + (n.description || '') + ' ' + (n.company || '')).toLowerCase();
        return words.some(w => text.includes(w));
      });
      
      if (relevant.length > 0) {
        answer = `## Results for "${query}"\n\n`;
        answer += `Found **${relevant.length} matching articles**:\n\n`;
        
        // Group by company for cleaner display
        const byCompany = {};
        relevant.forEach(n => { if (!byCompany[n.company]) byCompany[n.company] = []; byCompany[n.company].push(n); });
        
        Object.entries(byCompany).slice(0, 5).forEach(([co, arts]) => {
          answer += `**${co}**\n`;
          arts.slice(0, 2).forEach(a => { answer += `- ${a.title} *(${a.source})*\n`; });
          answer += `\n`;
        });
        
        if (relevant.length > 8) answer += `*Showing top results. ${relevant.length - 8} more available — try narrowing by company or category.*`;
      } else {
        answer = `Hmm, I couldn't find articles matching "${query}" in your current view.\n\n`;
        answer += `**Here's what might help:**\n\n`;
        answer += `- Try a company name: *"Tell me about Grab"*\n`;
        answer += `- Ask about trends: *"What's the market overview?"*\n`;
        answer += `- Find opportunities: *"Any engagement signals?"*\n`;
        answer += `- Get strategic advice: *"What should I focus on?"*\n`;
        answer += `- Expand time range to 1 week for more data\n\n`;
        answer += `I work best when you ask about the companies I track or about market patterns I can detect from the news.`;
      }
    }

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
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:3rem;"><h2>Unsubscribed</h2><p>You have been successfully unsubscribed from MarketFeed digests.</p></body></html>');
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
  res.json({ success: true, message: 'MarketFeed is running', uptime: Math.round(process.uptime()) });
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
  console.log(`[MarketFeed] Running on port ${PORT}`);

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
