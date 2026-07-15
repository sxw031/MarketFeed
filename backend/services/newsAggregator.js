const { db, query } = require('../models/db');
const { fetchNewsForCompany } = require('./webSearch');
const { COMPANIES } = require('../config/sources');

const NEWS_SELECT_COLUMNS = 'id, company, title, description, url, source, category, publishedAt';
const SOURCE_FILTER_SQL = {
  'Major Media': `(source LIKE '%Reuters%' OR source LIKE '%AP%' OR source LIKE '%BBC%' OR source LIKE '%CNBC%' OR source LIKE '%CNN%' OR source LIKE '%Guardian%')`,
  Financial: `(source LIKE '%Bloomberg%' OR source LIKE '%Financial Times%' OR source LIKE '%WSJ%' OR source LIKE '%Yahoo Finance%' OR source LIKE '%MarketWatch%' OR source LIKE '%Barron%')`,
  'Tech & Industry': `(source LIKE '%TechCrunch%' OR source LIKE '%Verge%' OR source LIKE '%Wired%' OR source LIKE '%ZDNet%' OR source LIKE '%Ars Technica%' OR source LIKE '%TechRadar%')`,
  LinkedIn: `source LIKE '%LinkedIn%'`,
  'Official Website': `source LIKE '%Official%'`
};

// --- Category Classification ---
const CATEGORY_RULES = [
  { category: 'Strategic Insights', keywords: ['partnership', 'collaboration', 'expand', 'growth', 'acquisition', 'merger', 'ceo', 'executive', 'revenue', 'profit', 'earnings', 'strategy', 'invest', 'funding', 'launch', 'hiring', 'layoff', 'rebrand', 'contract', 'deal', 'agreement', 'announce', 'milestone', 'record'] },
  { category: 'Finance', keywords: ['stock', 'ipo', 'bank', 'fintech', 'payment', 'loan', 'credit', 'interest rate', 'equity', 'dividend', 'shares', 'market cap'] },
  { category: 'Marketing', keywords: ['campaign', 'brand', 'marketing', 'social media', 'engagement', 'promotion', 'advertising', 'customer'] },
  { category: 'Technology', keywords: ['ai', 'artificial intelligence', 'cloud', 'software', 'app', 'cybersecurity', 'data', 'platform', 'machine learning', 'api', 'messaging', 'sms', 'rcs'] }
];

function classifyArticle(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) return rule.category;
  }
  return 'General';
}

// --- Storage ---
async function storeArticles(articles) {
  if (!articles || articles.length === 0) return 0;

  return new Promise((resolve, reject) => {
    let stored = 0;
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO news (company, title, description, url, source, category, publishedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const a of articles) {
        // Store as ISO 8601 with T and Z for consistent cross-platform parsing
        const publishedAt = normalizeToISO(a.publishedAt);

        stmt.run([
          a.company,
          a.title,
          (a.description || '').substring(0, 500),
          a.url || '',
          a.source || 'Unknown',
          classifyArticle(a.title, a.description),
          publishedAt
        ], function(err) {
          if (!err && this.changes > 0) stored++;
        });
      }

      stmt.finalize();
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(stored);
      });
    });
  });
}

/**
 * Normalize any date input to ISO 8601 format "YYYY-MM-DDTHH:MM:SSZ"
 * This ensures consistent parsing in both Node.js and browsers across all timezones
 */
function normalizeToISO(input) {
  if (!input) return new Date().toISOString().split('.')[0] + 'Z';
  const d = new Date(input);
  if (isNaN(d.getTime())) return new Date().toISOString().split('.')[0] + 'Z';
  return d.toISOString().split('.')[0] + 'Z';
}

// --- Aggregation Engine ---
async function aggregateAllNews(options = {}) {
  const { onProgress, onError } = options;
  const startTime = Date.now();
  let totalStored = 0;

  console.log(`[Aggregator] Starting sync for ${COMPANIES.length} companies...`);

  const BATCH_SIZE = Math.max(1, Number.parseInt(process.env.AGGREGATION_BATCH_SIZE || '2', 10) || 2);
  for (let i = 0; i < COMPANIES.length; i += BATCH_SIZE) {
    const batch = COMPANIES.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          if (onProgress) onProgress(company.name);
          const articles = await fetchNewsForCompany(company.name);
          if (articles.length > 0) {
            const stored = await storeArticles(articles);
            console.log(`  ✓ ${company.name}: ${articles.length} found, ${stored} new`);
            return stored;
          } else {
            console.log(`  - ${company.name}: no articles found`);
            return 0;
          }
        } catch (err) {
          console.error(`  ✗ ${company.name}: ${err.message}`);
          if (onError) onError(company.name, err.message);
          return 0;
        }
      })
    );

    totalStored += results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value, 0);

    if (i + BATCH_SIZE < COMPANIES.length) {
      await new Promise(r => setTimeout(r, 750));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Aggregator] Done in ${duration}s. Total new articles stored: ${totalStored}`);
  return totalStored;
}

// --- Query Layer ---
function buildNewsWhere(filters = {}, params = []) {
  let sql = ' WHERE 1=1';
  if (filters.companies && filters.companies.length > 0) {
    const placeholders = filters.companies.map(() => '?').join(',');
    sql += ` AND company IN (${placeholders})`;
    params.push(...filters.companies);
  } else if (filters.company) {
    sql += ' AND company = ?';
    params.push(filters.company);
  }

  if (filters.startDate) {
    const startISO = normalizeToISO(filters.startDate);
    sql += ' AND publishedAt >= ?';
    params.push(startISO);
  }

  if (filters.endDate) {
    const endISO = normalizeToISO(filters.endDate);
    sql += ' AND publishedAt <= ?';
    params.push(endISO);
  }

  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.source) {
    if (SOURCE_FILTER_SQL[filters.source]) {
      sql += ` AND ${SOURCE_FILTER_SQL[filters.source]}`;
    } else {
      sql += ' AND source LIKE ?';
      params.push(`%${filters.source}%`);
    }
  }

  if (filters.search) {
    const tokens = filters.search.trim().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length > 0) {
      const tokenClauses = tokens.map(token => {
        params.push(`%${token}%`, `%${token}%`);
        return '(title LIKE ? OR description LIKE ?)';
      });
      sql += ` AND (${tokenClauses.join(' AND ')})`;
    }
  }
  return sql;
}

function buildNewsOrder(sort = 'latest') {
  if (sort === 'relevance') {
    return ` ORDER BY (
      CASE WHEN (lower(title) LIKE '%messaging%' OR lower(title) LIKE '%communication%' OR lower(title) LIKE '%api%' OR lower(title) LIKE '%notification%' OR lower(title) LIKE '%sms%' OR lower(title) LIKE '%rcs%' OR lower(title) LIKE '%whatsapp%' OR lower(title) LIKE '%chatbot%' OR lower(title) LIKE '%omnichannel%' OR lower(title) LIKE '%cpaas%' OR lower(title) LIKE '%customer engagement%' OR lower(title) LIKE '%digital%' OR lower(title) LIKE '%platform%' OR lower(title) LIKE '%enterprise%') THEN 0 ELSE 1 END
    ), publishedAt DESC`;
  }
  if (sort === 'oldest') {
    return ' ORDER BY publishedAt ASC';
  }
  return ' ORDER BY publishedAt DESC';
}

async function getNews(filters = {}) {
  const params = [];
  let sql = `SELECT ${NEWS_SELECT_COLUMNS} FROM news`;
  sql += buildNewsWhere(filters, params);

  if (filters.sort === 'relevance') {
    sql += buildNewsOrder('relevance');
  } else {
    sql += buildNewsOrder(filters.sort);
  }

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  return query.all(sql, params);
}

async function getNewsPage(filters = {}) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(filters.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  const params = [];
  const whereSql = buildNewsWhere(filters, params);

  const countRow = await query.get(`SELECT COUNT(*) as count FROM news${whereSql}`, params);
  const items = await query.all(
    `SELECT ${NEWS_SELECT_COLUMNS} FROM news${whereSql}${buildNewsOrder(filters.sort)} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    items,
    total: countRow?.count || 0,
    page,
    pageSize
  };
}

async function getNewsCount() {
  const row = await query.get('SELECT COUNT(*) as count FROM news');
  return row ? row.count : 0;
}

async function getNewsById(id) {
  return query.get('SELECT * FROM news WHERE id = ?', [id]);
}

function getAvailableCompanies() {
  return COMPANIES.map(c => ({ id: c.id, name: c.name, category: c.category }));
}

async function getSources() {
  const rows = await query.all('SELECT DISTINCT source FROM news ORDER BY source');
  return rows.map(r => r.source);
}

module.exports = {
  aggregateAllNews,
  getNews,
  getNewsPage,
  getNewsCount,
  getNewsById,
  getAvailableCompanies,
  getSources,
  storeArticles,
  classifyArticle,
  normalizeToISO
};
