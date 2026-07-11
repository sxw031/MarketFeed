const { query } = require('../models/db');

// Initialize IPO tracking table
async function initIPOTable() {
  await query.run(`CREATE TABLE IF NOT EXISTS ipo_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    ticker TEXT,
    industry TEXT,
    expected_date TEXT,
    valuation TEXT,
    status TEXT DEFAULT 'rumored',
    exchange TEXT,
    description TEXT,
    source_url TEXT,
    added_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  await query.run(`CREATE INDEX IF NOT EXISTS idx_ipo_date ON ipo_watchlist(expected_date)`);
  await query.run(`CREATE INDEX IF NOT EXISTS idx_ipo_status ON ipo_watchlist(status)`);

  // Seed with known upcoming IPOs if table is empty
  const count = await query.get('SELECT COUNT(*) as cnt FROM ipo_watchlist');
  if (count.cnt === 0) {
    await seedIPOData();
  }
}

async function seedIPOData() {
  const ipos = [
    { company_name: 'Stripe', ticker: 'STRP', industry: 'Fintech', expected_date: '2025-09-01', valuation: '$65B', status: 'rumored', exchange: 'NYSE', description: 'Global payments infrastructure company. Has been one of the most anticipated IPOs for years.' },
    { company_name: 'SpaceX', ticker: 'SPACEX', industry: 'Aerospace', expected_date: '2026-06-01', valuation: '$350B', status: 'rumored', exchange: 'NASDAQ', description: 'Space exploration and satellite internet (Starlink). Elon Musk has hinted at potential Starlink spinoff IPO.' },
    { company_name: 'Databricks', ticker: 'DBR', industry: 'AI/Data', expected_date: '2025-12-01', valuation: '$43B', status: 'preparing', exchange: 'NASDAQ', description: 'Data lakehouse platform. Recently raised at $43B valuation, actively preparing for public listing.' },
    { company_name: 'Shein', ticker: 'SHEIN', industry: 'E-commerce/Fashion', expected_date: '2025-09-01', valuation: '$66B', status: 'filed', exchange: 'LSE', description: 'Fast-fashion e-commerce giant. Filed for London Stock Exchange IPO amid US regulatory challenges.' },
    { company_name: 'Klarna', ticker: 'KLAR', industry: 'Fintech', expected_date: '2025-08-01', valuation: '$14.6B', status: 'filed', exchange: 'NYSE', description: 'Buy-now-pay-later leader. Filed S-1 with SEC for US IPO.' },
    { company_name: 'CoreWeave', ticker: 'CRWV', industry: 'Cloud/AI', expected_date: '2025-07-15', valuation: '$35B', status: 'filed', exchange: 'NASDAQ', description: 'AI cloud computing infrastructure provider. Filed for IPO to fund GPU expansion.' },
    { company_name: 'Cerebras Systems', ticker: 'CBRS', industry: 'AI Hardware', expected_date: '2025-09-01', valuation: '$8B', status: 'filed', exchange: 'NASDAQ', description: 'AI chip maker with wafer-scale processors. Filed S-1 for NASDAQ listing.' },
    { company_name: 'Discord', ticker: 'DISC', industry: 'Social/Gaming', expected_date: '2026-03-01', valuation: '$15B', status: 'rumored', exchange: 'NASDAQ', description: 'Communication platform for communities. Rejected Microsoft acquisition, exploring IPO path.' },
    { company_name: 'Plaid', ticker: 'PLAD', industry: 'Fintech', expected_date: '2025-12-01', valuation: '$13.4B', status: 'preparing', exchange: 'NYSE', description: 'Financial data connectivity platform. Building out revenue before going public.' },
    { company_name: 'Canva', ticker: 'CNVA', industry: 'Design/SaaS', expected_date: '2026-01-01', valuation: '$26B', status: 'rumored', exchange: 'NASDAQ', description: 'Online design platform with 170M+ monthly users. Profitable and exploring IPO timing.' },
    { company_name: 'Revolut', ticker: 'RVLT', industry: 'Fintech', expected_date: '2025-10-01', valuation: '$45B', status: 'preparing', exchange: 'LSE', description: 'Digital banking super-app. Obtained UK banking license, preparing London listing.' },
    { company_name: 'Impossible Foods', ticker: 'IMPF', industry: 'Food Tech', expected_date: '2026-03-01', valuation: '$7B', status: 'rumored', exchange: 'NASDAQ', description: 'Plant-based meat alternatives. Exploring IPO after restructuring and cost cuts.' },
    { company_name: 'Chime', ticker: 'CHME', industry: 'Fintech', expected_date: '2025-10-01', valuation: '$25B', status: 'preparing', exchange: 'NYSE', description: 'Digital-first banking platform. Confidentially filed for IPO.' },
    { company_name: 'Medline Industries', ticker: 'MDLN', industry: 'Healthcare', expected_date: '2025-11-01', valuation: '$34B', status: 'preparing', exchange: 'NYSE', description: 'Medical supplies manufacturer and distributor. One of largest private US companies.' },
    { company_name: 'Fanatics', ticker: 'FNTC', industry: 'Sports/E-commerce', expected_date: '2026-06-01', valuation: '$31B', status: 'rumored', exchange: 'NYSE', description: 'Sports merchandise, betting, and collectibles platform.' },
    { company_name: 'Anthropic', ticker: 'ANTH', industry: 'AI', expected_date: '2026-09-01', valuation: '$60B', status: 'rumored', exchange: 'NASDAQ', description: 'AI safety company behind Claude. Rapidly growing revenue, potential IPO candidate.' },
    { company_name: 'OpenAI', ticker: 'OAII', industry: 'AI', expected_date: '2026-12-01', valuation: '$150B+', status: 'rumored', exchange: 'NASDAQ', description: 'Creator of ChatGPT and GPT models. Restructuring to for-profit entity, potential future IPO.' },
    { company_name: 'Figma', ticker: 'FIGM', industry: 'Design/SaaS', expected_date: '2026-03-01', valuation: '$12.5B', status: 'rumored', exchange: 'NYSE', description: 'Collaborative design tool. After failed Adobe acquisition, IPO is likely path forward.' },
    { company_name: 'Instacart (Maplebear)', ticker: 'CART', industry: 'Delivery', expected_date: '2025-08-01', valuation: '$12B', status: 'public', exchange: 'NASDAQ', description: 'Grocery delivery platform. Already public since Sep 2023.' },
    { company_name: 'ServiceTitan', ticker: 'TTAN', industry: 'SaaS', expected_date: '2025-07-20', valuation: '$9.5B', status: 'filed', exchange: 'NASDAQ', description: 'Software for trades businesses. Filed for IPO with strong revenue growth.' },
    { company_name: 'Wiz', ticker: 'WIZ', industry: 'Cybersecurity', expected_date: '2025-10-01', valuation: '$12B', status: 'preparing', exchange: 'NASDAQ', description: 'Cloud security platform. Rejected Google acquisition offer, pursuing independent IPO.' }
  ];

  for (const ipo of ipos) {
    await query.run(
      `INSERT INTO ipo_watchlist (company_name, ticker, industry, expected_date, valuation, status, exchange, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [ipo.company_name, ipo.ticker, ipo.industry, ipo.expected_date, ipo.valuation, ipo.status, ipo.exchange, ipo.description]
    );
  }
  console.log(`[IPO] Seeded ${ipos.length} companies`);
}

// Get IPOs filtered by time window
async function getIPOs({ window = '6months', status = null } = {}) {
  const now = new Date();
  let endDate;

  switch (window) {
    case '1week': endDate = new Date(now.getTime() + 7 * 86400000); break;
    case '1month': endDate = new Date(now.getTime() + 30 * 86400000); break;
    case '3months': endDate = new Date(now.getTime() + 90 * 86400000); break;
    case '6months':
    default: endDate = new Date(now.getTime() + 180 * 86400000); break;
  }

  let sql = `SELECT * FROM ipo_watchlist WHERE expected_date <= ? AND status != 'public'`;
  const params = [endDate.toISOString().split('T')[0]];

  if (status && status !== 'all') {
    sql += ` AND status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY expected_date ASC`;
  return await query.all(sql, params);
}

// Get IPO stats
async function getIPOStats() {
  const total = await query.get('SELECT COUNT(*) as cnt FROM ipo_watchlist WHERE status != ?', ['public']);
  const filed = await query.get('SELECT COUNT(*) as cnt FROM ipo_watchlist WHERE status = ?', ['filed']);
  const preparing = await query.get('SELECT COUNT(*) as cnt FROM ipo_watchlist WHERE status = ?', ['preparing']);
  const rumored = await query.get('SELECT COUNT(*) as cnt FROM ipo_watchlist WHERE status = ?', ['rumored']);
  return { total: total.cnt, filed: filed.cnt, preparing: preparing.cnt, rumored: rumored.cnt };
}

module.exports = { initIPOTable, getIPOs, getIPOStats };
