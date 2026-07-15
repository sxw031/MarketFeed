const express = require('express');
const { generateHeuristicReport } = require('../services/strategyEngine');
const { generateChatAnswer } = require('../services/aiChatService');

function createAiRouter({ getNews }) {
  const router = express.Router();

  router.post('/strategy', async (req, res) => {
    try {
      const { news, period = 'daily' } = req.body;
      let articles = news || [];

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
