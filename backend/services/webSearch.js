const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});

const SOURCE_STATE = new Map();
const SOURCE_COOLDOWN_MS = 30 * 60 * 1000;
const TARGET_ARTICLE_COUNT = Number.parseInt(process.env.TARGET_ARTICLE_COUNT || '8', 10);
const SOURCE_ORDER = [
  { key: 'google', run: (company) => fetchGoogleNewsRSS(company, { limit: 8 }) },
  { key: 'official', run: (company) => fetchOfficialWebsiteNews(company, { limit: 5 }) },
  { key: 'bing', run: (company) => fetchBingNewsRSS(company, { limit: 4 }) },
  { key: 'linkedin', run: (company) => fetchLinkedInNews(company, { limit: 3 }) }
];

// --- Login-wall / paywall domains to filter out ---
const LOGIN_WALL_DOMAINS = [
  'linkedin.com/pulse', 'linkedin.com/posts',
  'ft.com', 'wsj.com', 'bloomberg.com/news',
  'economist.com', 'hbr.org',
  'seekingalpha.com', 'barrons.com',
  'nytimes.com', 'washingtonpost.com',
  'paywallninja.com', 'medium.com',
  'theathletic.com', 'telegraph.co.uk'
];

// URLs that require login/account to view content
const LOGIN_REQUIRED_PATTERNS = [
  /temu\.com\/((?!about|press|newsroom).)*$/i,  // Temu product pages require login
  /\/login/i,
  /\/signin/i,
  /\/sign-in/i,
  /\/auth\//i,
  /\/account\//i,
  /\/my-account/i,
  /\/register/i,
  /\/subscribe/i,
  /\/membership/i,
  /\/paywall/i,
  /\/premium/i,
  /\?login=true/i,
  /\?redirect.*login/i
];

function isLoginWall(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return LOGIN_WALL_DOMAINS.some(domain => lower.includes(domain));
}

function isLoginRequired(url) {
  if (!url) return false;
  return LOGIN_REQUIRED_PATTERNS.some(pattern => pattern.test(url));
}

// --- Source categorization for cleaner display ---
const SOURCE_CATEGORIES = {
  'Reuters': 'Major Media',
  'AP News': 'Major Media',
  'BBC': 'Major Media',
  'CNBC': 'Major Media',
  'CNN': 'Major Media',
  'Bloomberg': 'Financial',
  'Financial Times': 'Financial',
  'The Wall Street Journal': 'Financial',
  'Yahoo Finance': 'Financial',
  'MarketWatch': 'Financial',
  'TechCrunch': 'Tech & Industry',
  'The Verge': 'Tech & Industry',
  'Wired': 'Tech & Industry',
  'Ars Technica': 'Tech & Industry',
  'ZDNet': 'Tech & Industry',
  'LinkedIn': 'Professional',
  'Official Website': 'Official'
};

function categorizeSource(source) {
  if (!source) return 'Other';
  for (const [name, category] of Object.entries(SOURCE_CATEGORIES)) {
    if (source.toLowerCase().includes(name.toLowerCase())) return category;
  }
  return 'News';
}

function getSourceState(company, sourceKey) {
  return SOURCE_STATE.get(`${company}:${sourceKey}`) || { failCount: 0, cooldownUntil: 0, lastSuccessAt: 0 };
}

function setSourceState(company, sourceKey, nextState) {
  SOURCE_STATE.set(`${company}:${sourceKey}`, nextState);
}

function shouldSkipSource(company, sourceKey) {
  const state = getSourceState(company, sourceKey);
  return state.cooldownUntil > Date.now();
}

function recordSourceResult(company, sourceKey, articleCount, error) {
  const state = getSourceState(company, sourceKey);
  if (error || articleCount === 0) {
    const failCount = state.failCount + 1;
    const cooldownMs = Math.min(SOURCE_COOLDOWN_MS * failCount, 4 * 60 * 60 * 1000);
    setSourceState(company, sourceKey, {
      failCount,
      cooldownUntil: Date.now() + cooldownMs,
      lastSuccessAt: state.lastSuccessAt
    });
    return;
  }

  const lowValueCooldownMs = articleCount <= 1 && ['bing', 'linkedin'].includes(sourceKey)
    ? 15 * 60 * 1000
    : 0;
  setSourceState(company, sourceKey, {
    failCount: 0,
    cooldownUntil: Date.now() + lowValueCooldownMs,
    lastSuccessAt: Date.now()
  });
}

function mergeUniqueArticles(existing, incoming) {
  const seen = new Set(existing.map(article => article.title.toLowerCase().substring(0, 60)));
  for (const article of incoming) {
    const key = article.title.toLowerCase().substring(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    existing.push(article);
  }
  return existing;
}

// --- Source 1: Google News RSS (Primary, most reliable) ---
async function fetchGoogleNewsRSS(company, options = {}) {
  const limit = options.limit || 10;
  const query = encodeURIComponent(`"${company}" when:1d`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    console.log(`[Google News] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit)
      .filter(item => !isLoginWall(item.link) && !isLoginRequired(item.link))
      .map(item => {
        const titleParts = (item.title || '').split(' - ');
        const source = titleParts.length > 1 ? titleParts.pop().trim() : 'Google News';
        const title = titleParts.join(' - ').trim();

        return {
          title: title || item.title,
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source,
          sourceCategory: categorizeSource(source),
          company,
          category: 'General',
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        };
      });

    console.log(`[Google News] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Google News] ${company} failed:`, error.message);
    return [];
  }
}

// --- Source 2: Bing News RSS (Fallback) ---
async function fetchBingNewsRSS(company, options = {}) {
  const limit = options.limit || 8;
  const query = encodeURIComponent(company);
  const url = `https://www.bing.com/news/search?q=${query}&format=rss&count=${limit}`;

  try {
    console.log(`[Bing RSS] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit)
      .filter(item => !isLoginWall(item.link) && !isLoginRequired(item.link))
      .map(item => ({
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        source: item.creator || 'Bing News',
        sourceCategory: categorizeSource(item.creator || 'Bing News'),
        company,
        category: 'General',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      }));

    console.log(`[Bing RSS] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Bing RSS] ${company} failed:`, error.message);
    return [];
  }
}

// --- LinkedIn company slug mapping for targeted searches ---
const LINKEDIN_SLUGS = {
  'HSBC': 'hsbc',
  'Grab': 'grab',
  'Vodafone': 'vodafone',
  'Cathay Pacific': 'cathay-pacific-airways',
  'Alibaba': 'alibaba-group',
  'Standard Chartered': 'standard-chartered-bank',
  'Temu': 'temu-official',
  'Ctrip': 'trip-com-group',
  'Didi': 'didi-global',
  'DBS': 'dbs-bank',
  'Tencent': 'tencent',
  'Bank of China': 'bank-of-china',
  'ByteDance': 'bytedance',
  'Gojek': 'gojek',
  'Citigroup': 'citi',
  'Binance': 'binance',
  'ShopBack': 'shopback',
  'Aeon Credit': 'aeon-credit-service',
  'Tesla': 'tesla-motors',
  'Helios Energy': 'helios-energy',
  'Coinbase': 'coinbase',
  'Apple': 'apple',
  'Alphabet': 'google',
  'NVIDIA': 'nvidia',
  'Databricks': 'databricks',
  'Netflix': 'netflix',
  'Meta': 'meta',
  'SpaceX': 'spacex',
  'Stripe': 'stripe',
  'Microsoft': 'microsoft',
  'Amazon': 'amazon',
  'Shein': 'shein',
  'Samsung': 'samsung-electronics',
  'Walmart': 'walmart',
  'OpenAI': 'openai',
  'SF Express': 'sf-express',
  'CATL': 'catl',
  'JPMorgan': 'jpmorgan',
  'TSMC': 'tsmc',
  'Anthropic': 'anthropic',
  'Singtel': 'singtel',
  'StarHub': 'starhub'
};

// --- Source 3: LinkedIn News (multi-strategy search) ---
async function fetchLinkedInNews(company, options = {}) {
  const limit = options.limit || 8;
  const slug = LINKEDIN_SLUGS[company] || company.toLowerCase().replace(/\s+/g, '-');

  // Strategy 1: Search for company name + LinkedIn mentions in Google News
  // (captures news articles that reference LinkedIn posts/announcements)
  const queries = [
    `"${company}" linkedin announcement OR update OR launch OR partnership`,
    `"${company}" site:linkedin.com`,
    `${slug} linkedin.com/company news OR post`
  ];

  const allArticles = [];

  for (const q of queries) {
    if (allArticles.length >= limit) break;
    try {
      const encoded = encodeURIComponent(q);
      const url = `https://news.google.com/rss/search?q=${encoded}&hl=en&gl=US&ceid=US:en`;
      const response = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const feed = await parser.parseString(response.data);
      const items = (feed.items || []).slice(0, Math.ceil(limit / 2));

      for (const item of items) {
        const itemUrl = (item.link || '').toLowerCase();
        // Skip login-wall LinkedIn pages (pulse requires auth, individual posts may too)
        if (itemUrl.includes('linkedin.com/pulse/')) continue;

        const titleParts = (item.title || '').split(' - ');
        const sourceName = titleParts.length > 1 ? titleParts.pop().trim() : 'LinkedIn';
        const title = titleParts.join(' - ').trim() || item.title;

        allArticles.push({
          title,
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source: itemUrl.includes('linkedin.com') ? 'LinkedIn' : `LinkedIn (via ${sourceName})`,
          sourceCategory: 'Professional',
          company,
          category: 'General',
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        });
      }
    } catch (e) {
      // Continue to next query
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = allArticles.filter(a => {
    const key = a.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[LinkedIn] ${company}: found ${unique.length} articles (multi-strategy)`);
  return unique.slice(0, limit);
}

// --- Source 4: Official Website News (deep crawl with multiple paths) ---
// Each company has multiple search paths for deeper coverage:
// newsroom, press releases, blog, investor relations, announcements
const COMPANY_OFFICIAL_PATHS = {
  'HSBC': {
    domain: 'hsbc.com',
    paths: ['news-and-media', 'news', 'media-releases', 'investors', 'who-we-are'],
    searchTerms: ['press release', 'announcement', 'update', 'report']
  },
  'Grab': {
    domain: 'grab.com',
    paths: ['press', 'blog', 'driver', 'merchant'],
    altDomains: ['engineering.grab.com'],
    searchTerms: ['launch', 'partnership', 'expansion']
  },
  'Vodafone': {
    domain: 'vodafone.com',
    paths: ['news', 'business/news', 'about-vodafone/press-releases', 'investors'],
    searchTerms: ['announcement', 'partnership', 'technology']
  },
  'Cathay Pacific': {
    domain: 'cathaypacific.com',
    paths: ['press-room', 'about-us', 'sustainability'],
    altDomains: ['news.cathaypacific.com'],
    searchTerms: ['announcement', 'route', 'service']
  },
  'Alibaba': {
    domain: 'alizila.com',
    paths: ['', 'technology', 'business', 'esg'],
    altDomains: ['alibabagroup.com/en-US/news'],
    searchTerms: ['announcement', 'earnings', 'launch']
  },
  'Standard Chartered': {
    domain: 'sc.com',
    paths: ['en/media', 'en/about-us', 'en/sustainability', 'en/banking'],
    searchTerms: ['press release', 'announcement', 'report']
  },
  'Temu': {
    domain: 'temu.com',
    paths: [],
    // Temu has login walls - use news about Temu from other sources instead
    altDomains: [],
    searchTerms: ['Temu announcement', 'Temu expansion', 'Temu launch'],
    useGenericSearch: true
  },
  'Ctrip': {
    domain: 'trip.com',
    paths: ['newsroom', 'blog'],
    altDomains: ['ir.trip.com'],
    searchTerms: ['press release', 'earnings', 'partnership']
  },
  'Didi': {
    domain: 'didiglobal.com',
    paths: ['news', 'blog', 'about-us'],
    searchTerms: ['announcement', 'update', 'expansion']
  },
  'DBS': {
    domain: 'dbs.com',
    paths: ['newsroom', 'about-us', 'sustainability', 'innovation'],
    searchTerms: ['press release', 'announcement', 'digital banking']
  },
  'Tencent': {
    domain: 'tencent.com',
    paths: ['en-us/media', 'en-us/about', 'en-us/investors'],
    searchTerms: ['announcement', 'earnings', 'technology', 'partnership']
  },
  'Bank of China': {
    domain: 'boc.cn',
    paths: ['en/aboutboc', 'en/investor', 'en/custserv'],
    altDomains: ['bankofchina.com'],
    searchTerms: ['announcement', 'financial results', 'service']
  },
  'ByteDance': {
    domain: 'bytedance.com',
    paths: ['en/news', 'en/about'],
    searchTerms: ['announcement', 'product', 'AI', 'launch']
  },
  'Gojek': {
    domain: 'gojek.com',
    paths: ['en-id/news', 'blog'],
    altDomains: ['gotocompany.com', 'gotofinancial.com'],
    searchTerms: ['announcement', 'partnership', 'launch']
  },
  'Citigroup': {
    domain: 'citigroup.com',
    paths: ['global/news', 'global/news/press-releases', 'about/corporate-governance', 'investors'],
    searchTerms: ['press release', 'announcement', 'earnings']
  },
  'Binance': {
    domain: 'binance.com',
    paths: ['en/blog', 'en/blog/news', 'en/blog/ecosystem'],
    searchTerms: ['announcement', 'listing', 'partnership', 'update']
  },
  'ShopBack': {
    domain: 'shopback.com',
    paths: ['blog'],
    altDomains: ['corporate.shopback.com'],
    searchTerms: ['announcement', 'partnership', 'launch']
  },
  'Aeon Credit': {
    domain: 'aeoncredit.com.my',
    paths: ['news-announcements', 'investor-relations', 'about-us'],
    searchTerms: ['announcement', 'financial results', 'service']
  },
  'Tesla': {
    domain: 'tesla.com',
    paths: ['blog', 'updates'],
    altDomains: ['ir.tesla.com'],
    searchTerms: ['announcement', 'delivery', 'earnings', 'product']
  },
  'Helios Energy': {
    domain: 'heliosenergy.com',
    paths: ['news', 'projects', 'about'],
    searchTerms: ['announcement', 'project', 'energy'],
    useGenericSearch: true
  },
  'Coinbase': {
    domain: 'coinbase.com',
    paths: ['blog', 'blog/company-news', 'press'],
    altDomains: ['blog.coinbase.com'],
    searchTerms: ['announcement', 'listing', 'update', 'policy']
  },
  'Apple': {
    domain: 'apple.com',
    paths: ['newsroom', 'newsroom/topics/apple-intelligence'],
    searchTerms: ['announcement', 'launch', 'update', 'press release']
  },
  'Alphabet': {
    domain: 'blog.google',
    paths: ['', 'technology', 'products'],
    altDomains: ['abc.xyz/investor', 'ai.google/discover'],
    searchTerms: ['announcement', 'AI', 'earnings', 'launch']
  },
  'NVIDIA': {
    domain: 'nvidia.com',
    paths: ['en-us/about-nvidia/press-releases', 'blog'],
    altDomains: ['nvidianews.nvidia.com'],
    searchTerms: ['announcement', 'GPU', 'AI', 'earnings']
  },
  'Databricks': {
    domain: 'databricks.com',
    paths: ['blog', 'company/newsroom', 'company/press-releases'],
    searchTerms: ['announcement', 'launch', 'partnership', 'AI']
  },
  'Netflix': {
    domain: 'about.netflix.com',
    paths: ['news', 'en/news'],
    altDomains: ['ir.netflix.net'],
    searchTerms: ['announcement', 'earnings', 'content', 'subscriber']
  },
  'Meta': {
    domain: 'about.fb.com',
    paths: ['news', 'company-info'],
    altDomains: ['ai.meta.com/blog', 'engineering.fb.com'],
    searchTerms: ['announcement', 'AI', 'metaverse', 'earnings']
  },
  'SpaceX': {
    domain: 'spacex.com',
    paths: ['updates', 'launches'],
    searchTerms: ['launch', 'mission', 'starship', 'announcement'],
    useGenericSearch: true
  },
  'Stripe': {
    domain: 'stripe.com',
    paths: ['newsroom', 'blog', 'blog/engineering'],
    searchTerms: ['announcement', 'launch', 'partnership', 'payments']
  },
  'Microsoft': {
    domain: 'microsoft.com',
    paths: ['en-us/microsoft-365/blog', 'en-us/ai/blog'],
    altDomains: ['news.microsoft.com', 'blogs.microsoft.com'],
    searchTerms: ['announcement', 'AI', 'Azure', 'earnings']
  },
  'Amazon': {
    domain: 'aboutamazon.com',
    paths: ['news', 'news/aws'],
    altDomains: ['aws.amazon.com/blogs/aws', 'press.aboutamazon.com'],
    searchTerms: ['announcement', 'AWS', 'launch', 'earnings']
  },
  'Shein': {
    domain: 'sheingroup.com',
    paths: ['newsroom', 'sustainability'],
    searchTerms: ['announcement', 'expansion', 'IPO', 'partnership']
  },
  'Samsung': {
    domain: 'samsung.com',
    paths: ['global/galaxy/news', 'semiconductor/newsroom'],
    altDomains: ['news.samsung.com'],
    searchTerms: ['announcement', 'launch', 'Galaxy', 'chip']
  },
  'Walmart': {
    domain: 'corporate.walmart.com',
    paths: ['newsroom', 'purpose', 'about'],
    searchTerms: ['announcement', 'earnings', 'expansion', 'technology']
  },
  'OpenAI': {
    domain: 'openai.com',
    paths: ['blog', 'research', 'index/announcements'],
    searchTerms: ['announcement', 'GPT', 'model', 'safety', 'launch']
  },
  'SF Express': {
    domain: 'sf-express.com',
    paths: ['en/news', 'en/about'],
    altDomains: ['ir.sf-express.com'],
    searchTerms: ['announcement', 'logistics', 'earnings', 'expansion']
  },
  'CATL': {
    domain: 'catl.com',
    paths: ['en/news', 'en/about'],
    searchTerms: ['announcement', 'battery', 'partnership', 'factory']
  },
  'JPMorgan': {
    domain: 'jpmorganchase.com',
    paths: ['news-stories', 'ir'],
    searchTerms: ['press release', 'announcement', 'earnings', 'banking']
  },
  'TSMC': {
    domain: 'tsmc.com',
    paths: ['english/news-events', 'english/investorRelations'],
    searchTerms: ['announcement', 'earnings', 'technology', 'fab']
  },
  'Anthropic': {
    domain: 'anthropic.com',
    paths: ['news', 'research', 'index/news'],
    searchTerms: ['announcement', 'Claude', 'safety', 'model']
  },
  'Singtel': {
    domain: 'singtel.com',
    paths: ['about-us/media-centre', 'about-us/news-releases'],
    searchTerms: ['announcement', 'partnership', '5G', 'digital']
  },
  'StarHub': {
    domain: 'starhub.com',
    paths: ['about-us/newsroom', 'about-us/investor-relations'],
    searchTerms: ['announcement', 'partnership', 'launch', '5G']
  }
};

async function fetchOfficialWebsiteNews(company, options = {}) {
  const config = COMPANY_OFFICIAL_PATHS[company];
  if (!config) return [];

  const limit = options.limit || 10;
  const allArticles = [];

  // Build multiple search queries for deeper coverage
  const searchQueries = [];

  if (config.useGenericSearch) {
    // For companies with login walls (like Temu), search for official news elsewhere
    config.searchTerms.forEach(term => {
      searchQueries.push(`"${term}" official`);
    });
  } else {
    // Primary domain search with different paths
    searchQueries.push(`site:${config.domain} ${company}`);

    // Search specific subpaths
    if (config.paths.length > 0) {
      const pathStr = config.paths.slice(0, 3).map(p => p ? `inurl:${p}` : '').filter(Boolean).join(' OR ');
      if (pathStr) searchQueries.push(`site:${config.domain} (${pathStr})`);
    }

    // Alt domains
    if (config.altDomains && config.altDomains.length > 0) {
      config.altDomains.forEach(alt => {
        searchQueries.push(`site:${alt}`);
      });
    }

    // Search terms on the domain
    if (config.searchTerms.length > 0) {
      const terms = config.searchTerms.slice(0, 2).join(' OR ');
      searchQueries.push(`site:${config.domain} (${terms})`);
    }
  }

  // Execute searches (limit to 3 queries to stay fast)
  for (const q of searchQueries.slice(0, 3)) {
    if (allArticles.length >= limit) break;
    try {
      const encoded = encodeURIComponent(q);
      const url = `https://news.google.com/rss/search?q=${encoded}&hl=en&gl=US&ceid=US:en`;
      const response = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const feed = await parser.parseString(response.data);
      const items = (feed.items || []).slice(0, Math.ceil(limit / 2));

      for (const item of items) {
        const itemUrl = (item.link || '').toLowerCase();

        // Filter out login-wall pages
        if (isLoginWall(itemUrl)) continue;
        if (isLoginRequired(itemUrl)) continue;

        const titleParts = (item.title || '').split(' - ');
        const sourceSite = titleParts.length > 1 ? titleParts.pop().trim() : 'Official';
        const title = titleParts.join(' - ').trim() || item.title;

        allArticles.push({
          title,
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source: 'Official Website',
          sourceCategory: 'Official',
          company,
          category: detectCategory(title, item.contentSnippet || ''),
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
        });
      }
    } catch (e) {
      // Continue to next query
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = allArticles.filter(a => {
    const key = a.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[Official] ${company}: found ${unique.length} articles (deep crawl)`);
  return unique.slice(0, limit);
}

/**
 * Detect article category from title and description
 */
function detectCategory(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  if (text.match(/earnings|revenue|profit|financial results|quarterly|annual report|dividend/)) return 'Finance';
  if (text.match(/appoint|ceo|cfo|board|resign|hire|leadership/)) return 'Leadership';
  if (text.match(/partnership|collaboration|alliance|agreement|deal|acquisition|merger/)) return 'Strategic Insights';
  if (text.match(/launch|product|feature|platform|api|technology|ai|digital/)) return 'Technology';
  if (text.match(/expand|market|growth|new office|region/)) return 'Strategic Insights';
  if (text.match(/sustainability|esg|carbon|green|climate/)) return 'ESG';
  return 'General';
}

// --- Main Fetch Function ---
async function fetchNewsForCompany(company) {
  const articles = [];
  const timeoutMs = Number.parseInt(process.env.SOURCE_TIMEOUT_MS || '12000', 10);

  for (const source of SOURCE_ORDER) {
    if (articles.length >= TARGET_ARTICLE_COUNT) break;
    if (shouldSkipSource(company, source.key)) continue;

    try {
      const batch = await Promise.race([
        source.run(company),
        new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs))
      ]);
      recordSourceResult(company, source.key, batch.length, null);
      mergeUniqueArticles(articles, batch || []);
    } catch (error) {
      recordSourceResult(company, source.key, 0, error);
    }
  }

  return articles;
}

module.exports = { fetchNewsForCompany, fetchGoogleNewsRSS, fetchBingNewsRSS, fetchLinkedInNews, fetchOfficialWebsiteNews, categorizeSource };
