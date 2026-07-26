const express = require('express');
const { generateHeuristicReport } = require('../services/strategyEngine');
const { generateChatAnswer } = require('../services/aiChatService');
const { RuntimeCache } = require('../services/runtimeCache');

// Weekly/monthly/quarterly reports re-scan up to 500 DB rows and rebuild the
// full multi-section report; caching briefly avoids redoing that work when a
// user reopens the same report window within a couple of minutes (fast to
// load/respond) while still refreshing often enough to stay accurate.
const REPORT_CACHE_TTL_MS = 2 * 60 * 1000;
const reportCache = new RuntimeCache({ maxEntries: 20, defaultTtlMs: REPORT_CACHE_TTL_MS });

function createAiRouter({ getNews }) {
  const router = express.Router();

  router.post('/strategy', async (req, res) => {
    try {
      const { news, period = 'daily' } = req.body;
      let articles = news || [];

      const isDbBackedPeriod = ['weekly', 'monthly', 'quarterly'].includes(period);
      if (isDbBackedPeriod) {
        const cacheKey = `report:${period}`;
        const cached = reportCache.get(cacheKey);
        if (cached) {
          return res.json({ success: true, ...cached, cached: true });
        }

        const daysMap = { weekly: 7, monthly: 30, quarterly: 90 };
        const days = daysMap[period] || 1;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const dbArticles = await getNews({ startDate: startDate.toISOString(), limit: 500 });
        if (dbArticles && dbArticles.length > 0) articles = dbArticles;

        const report = generateHeuristicReport(articles, period);
        const payload = { report, period, articleCount: articles.length };
        reportCache.set(cacheKey, payload);
        return res.json({ success: true, ...payload });
      }

      const report = generateHeuristicReport(articles, period);
      res.json({ success: true, report, period, articleCount: articles.length });
    } catch (error) {
      console.error('[Strategy]', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/chat', async (req, res) => {
    try {
      const { query, context, history } = req.body;
      const answer = generateChatAnswer(query, context, Array.isArray(history) ? history.slice(-10) : []);
      res.json({ success: true, answer });
    } catch (error) {
      console.error('[AI Chat]', error.message);
      res.json({ success: true, answer: 'Sorry, I hit a snag processing that. Could you rephrase your question?' });
    }
  });

  return router;
}

module.exports = { createAiRouter };
