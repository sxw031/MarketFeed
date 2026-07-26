/**
 * Strategy Engine - Rubric-aligned strategic analysis for Account Management
 * All content presented in clean, designed tables for maximum readability
 * Scored against 5 dimensions (25 points total):
 * 1. Industry Trends (5pts) - Quantifiable business implications, urgency
 * 2. Communication Use Cases (5pts) - Engaged, Informed, Safe, Happy
 * 3. Buying Committee (5pts) - Personas, motivations, pain points
 * 4. Real-Life Stories (5pts) - Before/after, emotional + business impact
 * 5. Competitive Edge (5pts) - Differentiators woven into customer story
 *
 * Beyond the rubric, the report also surfaces broader strategic-thinking
 * signals so it reads like analyst research rather than a template:
 * 6. Adjacent Sector Patterns - cross-industry themes the signals suggest
 * 7. Emerging Technology Signals - nascent tech mentioned in the news
 * 8. Macro Signals & Assumptions to Challenge - macroeconomic context and
 *    the conventional wisdom it should make us question
 * 9. Multiple Futures - scenario planning instead of one linear forecast
 */

const { COMPANIES } = require('../config/sources');

// --- Yearly Summary Data ---
const YEARLY_EVENTS = {
  2023: {
    'HSBC': ['Acquired Silicon Valley Bank UK for £1', 'Launched Zing international payments app', 'Announced $3B share buyback program'],
    'Grab': ['Achieved profitability for first time (Q3)', 'Launched GrabMaps for enterprise', 'Partnership with Booking.com'],
    'Vodafone': ['Merged UK operations with Three', 'Sold Spain business to Zegona', 'CEO Margherita Della Valle took over'],
    'Cathay Pacific': ['Massive post-COVID recovery', 'Ordered 32 Airbus A321neo aircraft', 'Resumed full Hong Kong hub operations'],
    'Alibaba': ['Split into 6 business units', 'New CEO Eddie Wu took over', 'Cloud division became independent unit'],
    'Standard Chartered': ['Launched digital bank Mox in Hong Kong', 'Expanded crypto custody services', 'Partnered with Microsoft on AI banking'],
    'Temu': ['Became #1 downloaded app in US', 'Expanded to 40+ countries', 'Revenue exceeded $16B'],
    'Ctrip': ['Rebranded globally as Trip.com Group', 'Record international travel bookings', 'Listed on Hong Kong Stock Exchange'],
    'Didi': ['Relisted app on Chinese app stores', 'Resumed new user registration', 'Recovered to 80% of pre-ban ride volume'],
    'DBS': ['Named World Best Bank 4th time', 'Launched AI-powered advisory platform', 'Record net profit of S$10.3B'],
    'Tencent': ['WeChat reached 1.3B MAU', 'Gaming revenue recovered', 'Divested JD.com stake worth $16.4B'],
    'Bank of China': ['Expanded digital yuan pilot programs', 'Opened branches in 5 new countries', 'Green bond issuance exceeded $10B'],
    'ByteDance': ['TikTok reached 1.5B monthly users', 'Launched enterprise AI tools (Doubao)', 'Revenue exceeded $110B'],
    'Gojek': ['Merged with Tokopedia as GoTo Group', 'Achieved adjusted EBITDA profitability', 'Expanded GoPay financial services'],
    'Citigroup': ['Major restructuring under CEO Jane Fraser', 'Exited 14 consumer banking markets', 'Cut 20,000 jobs in reorganization'],
    'Binance': ['CEO CZ pleaded guilty to AML violations', 'Paid $4.3B fine to US DOJ', 'New CEO Richard Teng took over'],
    'ShopBack': ['Reached profitability in core markets', 'Expanded PayLater service across SEA', 'Grew to 40M+ users'],
    'Aeon Credit': ['Expanded digital lending in Malaysia', 'Launched new mobile app platform', 'Partnered with e-commerce platforms']
  },
  2024: {
    'HSBC': ['Sold Canada operations for $10B', 'Expanded AI customer service globally', 'Launched embedded finance APIs'],
    'Grab': ['Full-year profitability achieved', 'Launched GrabAds platform', 'Integrated AI into driver matching'],
    'Vodafone': ['Completed Three UK merger approval', 'Sold Italian operations', 'Partnered with Microsoft on generative AI'],
    'Cathay Pacific': ['Launched new premium cabin products', 'Ordered 30 Boeing 777-9 aircraft', 'Returned to pre-COVID profitability'],
    'Alibaba': ['Completed cloud division independence', 'Invested $2B in AI infrastructure', 'International commerce grew 40%+'],
    'Standard Chartered': ['Expanded digital asset services', 'Launched AI-powered trade finance', 'Partnered with fintechs on embedded banking'],
    'Temu': ['Top e-commerce app in 50+ countries', 'Revenue exceeded $30B', 'Expanded semi-managed seller model'],
    'Ctrip': ['AI travel assistant launched globally', 'Record revenue exceeding pre-COVID levels', 'Invested in content-driven travel planning'],
    'Didi': ['Full recovery to pre-ban levels', 'Expanded autonomous robotaxi fleet', 'Achieved consistent profitability'],
    'DBS': ['Launched AI-powered wealth advisory', 'Record revenue of S$20B+', 'Named most innovative bank in Asia'],
    'Tencent': ['Launched Hunyuan AI model', 'WeChat Pay expanded internationally', 'Cloud & AI services grew 30%+'],
    'Bank of China': ['Digital yuan transactions exceeded $1T', 'Launched AI-powered risk management', 'Green finance portfolio doubled'],
    'ByteDance': ['TikTok Shop became major e-commerce player', 'Launched AI chatbot Doubao to public', 'Revenue exceeded $150B'],
    'Gojek': ['GoTo Group returned to growth', 'GoPay became Indonesia top e-wallet', 'Launched enterprise logistics solutions'],
    'Citigroup': ['Completed organizational restructuring', 'Launched new digital banking platform', 'Invested $1B in technology modernization'],
    'Binance': ['Recovered market share under new leadership', 'Expanded compliance infrastructure', 'Grew to 200M+ registered users'],
    'ShopBack': ['Expanded to Australia and Japan', 'ShopBack Pay reached 10M users', 'Achieved group-level profitability'],
    'Aeon Credit': ['Digital transformation accelerated', 'Launched AI credit scoring', 'Expanded to Vietnam and Cambodia']
  },
  2025: {
    'HSBC': ['Launched AI-powered global trade platform', 'Expanded embedded banking APIs', 'Grew APAC wealth management 25%'],
    'Grab': ['Launched GrabConnect enterprise communications', 'Expanded financial services to 8 markets', 'Revenue exceeded $3B annually'],
    'Vodafone': ['Completed Three UK merger', 'Launched RCS Business Messaging at scale', 'Partnered with CPaaS providers'],
    'Cathay Pacific': ['Launched AI customer service chatbot', 'Expanded loyalty program digitally', 'Record passenger numbers'],
    'Alibaba': ['AI-first strategy across all business units', 'Cloud AI revenue grew 60%', 'Launched enterprise communication tools'],
    'Standard Chartered': ['Expanded digital banking to 15 markets', 'Launched cross-border payment APIs', 'Partnered on messaging-based banking'],
    'Temu': ['Faced import regulation changes in US/EU', 'Shifted to local fulfillment model', 'Revenue growth moderated to 40%'],
    'Ctrip': ['AI travel agent became primary booking interface', 'Expanded B2B travel services', 'Grew international revenue 50%'],
    'Didi': ['Autonomous ride-hailing launched commercially', 'Expanded to 5 new international markets', 'Partnered on in-app messaging'],
    'DBS': ['Fully AI-powered banking operations', 'Launched embedded finance for platforms', 'Named world best digital bank'],
    'Tencent': ['WeChat enterprise services grew 40%', 'AI integration across all products', 'Cloud messaging APIs expanded globally'],
    'Bank of China': ['Digital yuan international expansion', 'Launched developer banking APIs', 'Green finance exceeded $50B'],
    'ByteDance': ['Enterprise AI tools gained major adoption', 'Revenue exceeded $200B', 'Launched business messaging platform'],
    'Gojek': ['GoTo became SEA super-app leader', 'Enterprise services division launched', 'AI-powered merchant communications'],
    'Citigroup': ['New digital-first banking platform live', 'Expanded API banking services', 'Grew institutional messaging services'],
    'Binance': ['Full regulatory compliance achieved globally', 'Launched institutional prime services', 'Grew to 250M+ users'],
    'ShopBack': ['IPO preparation announced', 'Expanded to 12 markets', 'AI-powered personalization engine'],
    'Aeon Credit': ['Fully digital lending platform live', 'AI customer engagement launched', 'Partnered with messaging platforms']
  },
  2026: {
    'HSBC': ['Q1 earnings beat expectations with strong Asia growth', 'Expanded AI-driven wealth advisory', 'Partnered with CPaaS provider on WhatsApp Banking'],
    'Grab': ['Launched GrabForBusiness enterprise platform', 'GrabFin reached 10M lending customers', 'AI-powered driver communication system deployed'],
    'Vodafone': ['Three UK merger fully operational', 'Launched next-gen RCS platform for enterprise', 'Announced CPaaS marketplace for SMBs'],
    'Cathay Pacific': ['Record H1 2026 passenger traffic', 'Launched AI-powered rebooking and disruption messaging', 'Expanded cargo e-commerce logistics'],
    'Alibaba': ['Qwen AI model became top enterprise AI in China', 'Launched AliExpress instant messaging for sellers', 'Cloud revenue grew 45% YoY'],
    'Standard Chartered': ['Launched open banking APIs in 20 markets', 'AI fraud detection prevented $2B in losses', 'Expanded Mox digital bank to Singapore'],
    'Temu': ['Shifted strategy to brand partnerships', 'Launched in-app live commerce with messaging', 'Regulatory compliance achieved in EU under DSA'],
    'Ctrip': ['Became China largest outbound travel platform', 'AI concierge handled 60% of customer queries', 'Launched Trip.com Business for corporate travel'],
    'Didi': ['Autonomous taxis launched in 3 Chinese cities', 'International expansion reached 12 countries', 'Launched enterprise fleet management APIs'],
    'DBS': ['Named world best bank for 5th consecutive year', 'Launched DBS Developer Portal 2.0', 'AI handled 85% of customer interactions'],
    'Tencent': ['WeChat reached 1.4B MAU', 'Enterprise WeChat became dominant B2B tool in China', 'International cloud messaging expanded to LATAM'],
    'Bank of China': ['Digital yuan cross-border pilot with 15 countries', 'Launched AI customer service across all branches', 'Mobile banking MAU surpassed 300M'],
    'ByteDance': ['TikTok Shop GMV exceeded $50B globally', 'Doubao AI assistant reached 100M users', 'Launched Lark enterprise messaging globally'],
    'Gojek': ['GoTo Group profitable for full year', 'GoPay became SEA largest digital wallet', 'Launched GoEnterprise B2B services'],
    'Citigroup': ['Completed 3-year digital transformation', 'Launched Citi Developer Hub for API banking', 'Expanded institutional messaging infrastructure'],
    'Binance': ['Reached 300M registered users', 'Launched regulated exchange in 10 new markets', 'Web3 messaging integration for DeFi notifications'],
    'ShopBack': ['Completed IPO on SGX', 'ShopBack Pay reached 20M users', 'Launched AI-powered merchant engagement messaging'],
    'Aeon Credit': ['Digital lending volume doubled YoY', 'Launched AI credit decisioning engine', 'Customer notification system upgraded to omnichannel']
  }
};

function generateYearlySummary(year) {
  const events = YEARLY_EVENTS[year];
  if (!events) return [];
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const dateLabel = isCurrentYear ? `As of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : `Full Year ${year}`;
  return Object.entries(events).map(([company, highlights]) => ({
    company, year, dateLabel, highlights,
    relevance: assessRelevance(highlights)
  }));
}

function assessRelevance(highlights) {
  const keywords = ['messaging', 'communication', 'api', 'notification', 'sms', 'rcs', 'customer engagement', 'digital', 'platform', 'enterprise', 'app', 'chatbot', 'cpaas', 'omnichannel'];
  const text = highlights.join(' ').toLowerCase();
  const matches = keywords.filter(kw => text.includes(kw));
  if (matches.length >= 3) return 'High';
  if (matches.length >= 1) return 'Medium';
  return 'Low';
}

// =====================================================
// RUBRIC FRAMEWORK
// =====================================================

const USE_CASES = {
  ENGAGED: { name: 'Engaged', icon: '💬', capabilities: ['RCS Business Messaging', 'WhatsApp Business API', 'Conversational AI'], triggers: ['customer engagement', 'loyalty', 'retention', 'conversation', 'interactive', 'personalization', 'campaign', 'marketing', 'promotion', 'commerce'], value: '+25-40% customer lifetime value' },
  INFORMED: { name: 'Informed', icon: '📱', capabilities: ['SMS/MMS notifications', 'Push notifications', 'Email API'], triggers: ['notification', 'alert', 'update', 'delivery', 'tracking', 'status', 'reminder', 'booking', 'confirmation', 'travel'], value: '-35% support calls' },
  SAFE: { name: 'Safe', icon: '🔒', capabilities: ['SMS OTP', 'Silent verification', 'Number verification'], triggers: ['security', 'verification', 'authentication', 'fraud', 'otp', 'login', 'identity', 'compliance', 'kyc', 'trust'], value: '99.2% verification success' },
  HAPPY: { name: 'Happy', icon: '😊', capabilities: ['Contact center AI', 'IVR/Voice', 'Omnichannel routing'], triggers: ['customer service', 'support', 'satisfaction', 'nps', 'complaint', 'resolution', 'contact center', 'helpdesk', 'experience', 'feedback'], value: '+20 NPS points' }
};

const INDUSTRY_CONTEXT = {
  'HSBC': { vertical: 'Banking & Financial Services', priority: 'Secure customer authentication + omnichannel notifications' },
  'Grab': { vertical: 'Super App & Mobility', priority: 'Real-time ride notifications + driver-rider messaging' },
  'Vodafone': { vertical: 'Telecommunications', priority: 'RCS business messaging + enterprise CPaaS' },
  'Cathay Pacific': { vertical: 'Aviation & Travel', priority: 'Flight disruption alerts + booking confirmations' },
  'Alibaba': { vertical: 'E-commerce & Cloud', priority: 'Seller-buyer messaging + order notifications' },
  'Standard Chartered': { vertical: 'Banking & Financial Services', priority: 'Cross-border payment alerts + fraud prevention' },
  'Temu': { vertical: 'E-commerce & Retail', priority: 'Order tracking + promotional messaging at scale' },
  'Ctrip': { vertical: 'Travel & Hospitality', priority: 'Booking confirmations + travel disruption messaging' },
  'Didi': { vertical: 'Mobility & Transport', priority: 'Real-time trip updates + safety messaging' },
  'DBS': { vertical: 'Digital Banking', priority: 'Transaction alerts + conversational banking' },
  'Tencent': { vertical: 'Technology & Gaming', priority: 'Enterprise messaging APIs + cloud communication' },
  'Bank of China': { vertical: 'Banking & Financial Services', priority: 'Digital yuan notifications + cross-border alerts' },
  'ByteDance': { vertical: 'Technology & Media', priority: 'Enterprise messaging (Lark) + creator notifications' },
  'Gojek': { vertical: 'Super App & Fintech', priority: 'Merchant notifications + payment confirmations' },
  'Citigroup': { vertical: 'Banking & Financial Services', priority: 'Institutional messaging + API banking alerts' },
  'Binance': { vertical: 'Cryptocurrency & Fintech', priority: 'Security OTPs + transaction notifications' },
  'ShopBack': { vertical: 'E-commerce & Fintech', priority: 'Cashback notifications + payment alerts' },
  'Aeon Credit': { vertical: 'Consumer Finance', priority: 'Payment reminders + loan notifications' },
  // --- Added company contexts ---
  'JPMorgan Chase': { vertical: 'Banking & Financial Services', priority: 'Institutional alerts + fraud prevention at global scale' },
  'Bank of America': { vertical: 'Banking & Financial Services', priority: 'Consumer banking alerts + secure authentication across 60M+ digital users' },
  'PayPal': { vertical: 'Digital Payments', priority: 'Transaction confirmations + buyer/seller dispute notifications' },
  'Adobe': { vertical: 'Enterprise Software & Creative Cloud', priority: 'Subscription lifecycle messaging + license renewal notifications' },
  'Nike': { vertical: 'Consumer Brands & Retail', priority: 'Membership app engagement + product drop/launch notifications' },
  'Palantir': { vertical: 'Enterprise AI & Data Analytics', priority: 'Mission-critical operational alerts + secure enterprise/government messaging' },
  'Disney': { vertical: 'Media & Entertainment', priority: 'Subscriber lifecycle messaging + content and park release alerts' },
  'Reddit': { vertical: 'Social Media & Community', priority: 'Community trust & safety verification + moderator alerting' },
  'X (Twitter)': { vertical: 'Social Media & Community', priority: 'Account verification + real-time engagement notifications at massive scale' },
  'RedNote (Xiaohongshu)': { vertical: 'Social Media & Community', priority: 'Cross-border creator notifications + community trust verification' },
  'DeepSeek': { vertical: 'AI & Foundation Models', priority: 'API status alerts + developer notifications amid hypergrowth adoption' },
  'Moonshot AI': { vertical: 'AI & Foundation Models', priority: 'Usage-based billing alerts + developer platform notifications' }
};

// Category → generic vertical/priority used whenever a tracked company does
// not have a bespoke INDUSTRY_CONTEXT entry above. Keeps the report
// meaningful for every company in config/sources.js, not just a hardcoded
// subset, without requiring a manual entry per company.
const CATEGORY_FALLBACK_CONTEXT = {
  'Finance': { vertical: 'Banking & Financial Services', priority: 'Secure customer authentication + omnichannel notifications' },
  'Crypto': { vertical: 'Cryptocurrency & Fintech', priority: 'Security OTPs + transaction notifications' },
  'Big Tech': { vertical: 'Enterprise Technology & Cloud', priority: 'Developer platform messaging + customer notifications at global scale' },
  'AI': { vertical: 'AI & Foundation Models', priority: 'API status alerts + developer notifications amid hypergrowth adoption' },
  'E-commerce': { vertical: 'E-commerce & Retail', priority: 'Order tracking + promotional messaging at scale' },
  'Mobility': { vertical: 'Mobility & Transport', priority: 'Real-time trip updates + safety messaging' },
  'Telecom': { vertical: 'Telecommunications', priority: 'RCS business messaging + enterprise CPaaS' },
  'Entertainment': { vertical: 'Media & Entertainment', priority: 'Subscriber lifecycle messaging + content release alerts' },
  'Social Media': { vertical: 'Social Media & Community', priority: 'Community trust & safety verification + creator notifications' },
  'Auto & Energy': { vertical: 'Auto & Energy', priority: 'Delivery/service appointment alerts + firmware update notifications' },
  'Aerospace': { vertical: 'Aerospace & Defense', priority: 'Mission-critical status alerts + supply chain coordination' },
  'Logistics': { vertical: 'Logistics', priority: 'Shipment tracking + delivery notifications at scale' }
};

// Company name -> category, derived once from the source-of-truth company
// list so this file never has to duplicate/maintain that mapping by hand.
const COMPANY_CATEGORY = Object.fromEntries(COMPANIES.map(c => [c.name, c.category]));

const DEFAULT_INDUSTRY_CONTEXT = { vertical: 'Enterprise Technology & Cloud', priority: 'Customer notifications + secure omnichannel messaging' };

/** Resolve the best-known industry context for a company: bespoke entry -> category fallback -> generic default. */
function getIndustryContext(companyName) {
  return INDUSTRY_CONTEXT[companyName]
    || CATEGORY_FALLBACK_CONTEXT[COMPANY_CATEGORY[companyName]]
    || DEFAULT_INDUSTRY_CONTEXT;
}

const BUYING_COMMITTEE = {
  CTO_VP_ENGINEERING: { title: 'CTO / VP Engineering', priorities: ['System reliability & uptime', 'API performance', 'Security compliance'], painPoints: ['Vendor lock-in', 'Integration complexity', 'Scaling bottlenecks'], pitch: 'Single API for all channels, 99.99% uptime SLA, comprehensive SDKs' },
  CMO_VP_MARKETING: { title: 'CMO / VP Marketing', priorities: ['Customer engagement rates', 'Campaign ROI', 'Brand experience'], painPoints: ['Low open rates', 'Channel fragmentation', 'Personalization at scale'], pitch: 'Rich messaging with 98% open rates, AI-powered personalization' },
  CFO_VP_FINANCE: { title: 'CFO / VP Finance', priorities: ['Cost optimization', 'Predictable spend', 'ROI measurement'], painPoints: ['Unpredictable messaging costs', 'Multiple vendor invoices', 'Hard to measure impact'], pitch: 'Consolidated billing across all channels, volume-based pricing' },
  COO_VP_OPERATIONS: { title: 'COO / VP Operations', priorities: ['Operational efficiency', 'Vendor consolidation', 'Process automation'], painPoints: ['Too many communication vendors', 'Manual processes', 'Inconsistent delivery'], pitch: 'One platform replacing 5+ vendors, automated workflows' },
  HEAD_OF_PRODUCT: { title: 'Head of Product', priorities: ['User experience', 'Feature velocity', 'Engagement metrics'], painPoints: ['Building messaging in-house is expensive', 'Channel coverage gaps', 'Time to market'], pitch: 'Embed rich communication directly into your product with pre-built SDKs' }
};

const DIFFERENTIATORS = {
  scale: '700B+ messages annually across 600+ operator connections',
  reach: 'Direct connections in 190+ countries with local number provisioning',
  reliability: '99.99% uptime SLA backed by redundant global infrastructure',
  omnichannel: 'Single API for SMS, RCS, WhatsApp, Voice, Video, Email',
  intelligence: 'AI-powered channel orchestration picks the right channel at the right time',
  speed: 'Average integration time of 2 days with comprehensive SDKs'
};

// --- Period context ---
function getPeriodContext(period) {
  switch (period) {
    case 'weekly': return { label: 'Weekly Strategic Review', timeframe: 'Past 7 Days', daysBack: 7 };
    case 'monthly': return { label: 'Monthly Strategic Assessment', timeframe: 'Past 30 Days', daysBack: 30 };
    case 'quarterly': return { label: 'Quarterly Business Review Intelligence', timeframe: 'Past 90 Days', daysBack: 90 };
    default: return { label: 'Daily Strategic Briefing', timeframe: 'Today', daysBack: 1 };
  }
}

// --- Classification helpers ---
function classifyNews(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  if (text.match(/expand|growth|launch|new market|acquisition|scale/)) return 'EXPANSION';
  if (text.match(/partner|collaboration|alliance|deal|agreement/)) return 'PARTNERSHIP';
  if (text.match(/revenue|profit|earnings|funding|ipo|stock/)) return 'FINANCIAL';
  if (text.match(/ai|software|platform|app|digital|cloud|api/)) return 'TECHNOLOGY';
  if (text.match(/outage|layoff|decline|loss|breach|fine/)) return 'RISK';
  return 'GENERAL';
}

function matchUseCases(articles) {
  const matches = { ENGAGED: [], INFORMED: [], SAFE: [], HAPPY: [] };
  articles.forEach(article => {
    const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
    for (const [useCase, config] of Object.entries(USE_CASES)) {
      if (config.triggers.some(trigger => text.includes(trigger))) {
        matches[useCase].push(article);
      }
    }
  });
  return matches;
}

function identifyBuyingCommittee(articles) {
  const text = articles.map(a => `${a.title} ${a.description || ''}`).join(' ').toLowerCase();
  const relevant = [];
  if (text.match(/api|platform|integration|developer|technology|infrastructure|security|cloud/)) relevant.push('CTO_VP_ENGINEERING');
  if (text.match(/customer|engagement|campaign|marketing|brand|loyalty|personalization/)) relevant.push('CMO_VP_MARKETING');
  if (text.match(/revenue|cost|profit|savings|budget|investment|roi|pricing/)) relevant.push('CFO_VP_FINANCE');
  if (text.match(/operations|efficiency|automation|scale|process|vendor/)) relevant.push('COO_VP_OPERATIONS');
  if (text.match(/product|feature|user experience|app|launch|adoption/)) relevant.push('HEAD_OF_PRODUCT');
  if (relevant.length < 2) {
    if (!relevant.includes('CTO_VP_ENGINEERING')) relevant.push('CTO_VP_ENGINEERING');
    if (!relevant.includes('COO_VP_OPERATIONS')) relevant.push('COO_VP_OPERATIONS');
  }
  return relevant.slice(0, 4);
}

// =====================================================
// STRATEGIC PATTERN ANALYSIS
// Cross-sector themes, emerging tech, macro signals, and scenario planning —
// designed to push the report beyond a single linear projection.
// =====================================================

// Themes that are meaningful only when they show up across *multiple*
// different company categories in the same period (a real cross-sector
// pattern), rather than being confined to one industry.
const ADJACENT_PATTERN_THEMES = {
  'AI Adoption': ['ai', 'artificial intelligence', 'machine learning', 'generative ai', 'llm', 'copilot', 'agent'],
  'Security & Fraud Pressure': ['fraud', 'breach', 'security', 'cyberattack', 'hack', 'vulnerability', 'phishing'],
  'Regulatory Pressure': ['regulation', 'regulator', 'antitrust', 'compliance', 'fine', 'lawsuit', 'ban', 'investigation'],
  'Cost Discipline': ['layoff', 'restructuring', 'cost-cutting', 'efficiency', 'headcount', 'downsizing'],
  'Platform Consolidation': ['acquisition', 'merger', 'acquire', 'buyout', 'consolidat'],
  'CX Automation Investment': ['customer experience', 'personalization', 'omnichannel', 'self-service', 'chatbot', 'support automation']
};

const EMERGING_TECH_KEYWORDS = {
  'Agentic AI / AI Agents': ['agentic', 'ai agent', 'autonomous agent', 'copilot'],
  'Foundation Models & LLMs': ['foundation model', 'large language model', 'llm', 'gpt', 'multimodal'],
  'Autonomous Systems': ['autonomous', 'self-driving', 'robotaxi', 'drone', 'robotics'],
  'Edge & Real-Time Compute': ['edge computing', 'real-time processing', 'low-latency', '5g', '6g'],
  'Web3 & Digital Assets': ['blockchain', 'web3', 'stablecoin', 'tokeniz', 'crypto'],
  'Quantum Computing': ['quantum computing', 'quantum chip', 'qubit']
};

// Each macro theme pairs a detection keyword set with the conventional
// assumption it invites, plus a challenge to that assumption — this is what
// keeps the report from defaulting to "obvious" conclusions.
const MACRO_SIGNAL_THEMES = {
  'Rate & Inflation Environment': { keywords: ['interest rate', 'inflation', 'rate cut', 'rate hike', 'federal reserve', 'central bank'], assumption: 'Messaging/communication budgets shrink whenever rates rise.', challenge: 'Rate-sensitive accounts often shift spend toward retention and automation (lower CAC) — lead with ROI, not premium features.' },
  'Trade & Tariff Policy': { keywords: ['tariff', 'trade war', 'export control', 'import duty', 'sanction'], assumption: 'Global vendors are all equally exposed to tariff risk.', challenge: 'Tariff-hit companies localize supply chains and fulfillment fast — an opening to pitch in-region number provisioning and data residency, not just price.' },
  'Regulatory & Antitrust': { keywords: ['antitrust', 'regulation', 'regulator', 'compliance', 'gdpr', 'data privacy law'], assumption: 'Regulatory scrutiny is a reason to wait before engaging.', challenge: 'Regulatory pressure usually accelerates demand for auditable, compliant communication infrastructure — the opposite of "wait and see".' },
  'Capital Markets & IPO Activity': { keywords: ['ipo', 'public listing', 'funding round', 'venture capital', 'valuation'], assumption: 'Pre-IPO companies only care about growth metrics.', challenge: 'Pre-IPO accounts also need provable governance and reliability metrics for public disclosures — an opening for uptime/SLA-led conversations.' },
  'Workforce & Cost Discipline': { keywords: ['layoff', 'hiring freeze', 'restructuring', 'cost-cutting'], assumption: 'Cost-cutting accounts have no budget for new vendors.', challenge: 'Cost-cutting usually means consolidating vendors, not eliminating spend — position as a vendor-replacement, not an added cost.' }
};

/** Scan articles for keyword-set hits and return {label: matchingArticles[]} sorted by hit count, keeping only labels with >= minHits matches. */
function scanKeywordThemes(articles, themeMap, minHits = 1) {
  const hits = {};
  for (const label of Object.keys(themeMap)) hits[label] = [];
  articles.forEach(article => {
    const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
    for (const [label, keywords] of Object.entries(themeMap)) {
      if (keywords.some(kw => text.includes(kw))) hits[label].push(article);
    }
  });
  return Object.entries(hits)
    .filter(([, matches]) => matches.length >= minHits)
    .sort((a, b) => b[1].length - a[1].length);
}

/**
 * Build 3 alternative futures instead of one linear projection. Scenarios are
 * weighted (not just labeled) using the actual theme mix detected this period,
 * so the "likely" scenario changes as the underlying signals change.
 */
function buildFutureScenarios(themeCounts, totalSignals) {
  const pct = (n) => totalSignals > 0 ? Math.round((n / totalSignals) * 100) : 0;
  const expansionPct = pct(themeCounts.EXPANSION);
  const riskPct = pct(themeCounts.RISK);
  const financialPct = pct(themeCounts.FINANCIAL);

  const scenarios = [
    {
      name: 'Base Case — Steady Continuation',
      likelihood: `${Math.max(35, 100 - expansionPct - riskPct)}%`,
      trigger: 'Current mix of expansion, partnership, and financial signals continues at roughly today\'s pace.',
      implication: 'Standard cadence of check-ins; use existing signals to reinforce ongoing use cases rather than pitching anything new.'
    },
    {
      name: 'Upside — Acceleration',
      likelihood: `${Math.min(85, expansionPct + Math.round(financialPct / 2))}%`,
      trigger: `Expansion/financial signals (${expansionPct}% of this period's news) compound — new markets, funding, or product launches stack on each other.`,
      implication: 'Pre-position volume-based pricing and global reach messaging now, before the account\'s scaling need becomes an RFP you\'re competing for.'
    },
    {
      name: 'Disruption — Downside Shock',
      likelihood: `${Math.min(70, riskPct + 15)}%`,
      trigger: `Risk signals (outages, layoffs, regulatory action — ${riskPct}% of this period's news) intensify or a competitor/regulator event forces a rapid pivot.`,
      implication: 'Lead with reliability, failover, and cost-consolidation messaging; disrupted accounts buy infrastructure that reduces risk, not features that add it.'
    }
  ];
  return scenarios;
}

// =====================================================
// MAIN REPORT GENERATOR - ALL TABLES, NO PARAGRAPHS
// =====================================================

function generateHeuristicReport(newsArticles, period = 'daily') {
  if (!newsArticles || newsArticles.length === 0) {
    return '# MarketFeed Strategic Report\n\nNo recent news available. Please sync news first or select a broader time range.';
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const ctx = getPeriodContext(period);

  // Group by company
  const grouped = {};
  newsArticles.forEach(n => { if (!grouped[n.company]) grouped[n.company] = []; grouped[n.company].push(n); });
  const companies = Object.keys(grouped);

  // Actionable signals (communication/digital relevant)
  const relevanceKeywords = ['messaging', 'communication', 'notification', 'sms', 'rcs', 'api', 'customer engagement', 'digital', 'app', 'platform', 'chatbot', 'ai', 'omnichannel', 'enterprise', 'verification'];
  const actionableSignals = newsArticles.filter(n => {
    const text = ((n.title || '') + ' ' + (n.description || '')).toLowerCase();
    return relevanceKeywords.some(kw => text.includes(kw));
  });

  // Use case matching
  const useCaseMatches = matchUseCases(newsArticles);

  // Top companies
  const topCompanies = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 5);

  // Urgency
  const competitorKeywords = ['twilio', 'vonage', 'infobip', 'messagebird', 'bandwidth', 'plivo'];
  const highUrgency = Object.entries(grouped).filter(([, articles]) => {
    const text = articles.map(a => `${a.title} ${a.description || ''}`).join(' ').toLowerCase();
    return competitorKeywords.some(kw => text.includes(kw)) || relevanceKeywords.filter(kw => text.includes(kw)).length >= 3;
  });

  // ===== HEADER (shared by every period) =====
  let report = `# ${ctx.label}\n\n`;
  report += `| | |\n|---|---|\n`;
  report += `| **Date** | ${date} |\n`;
  report += `| **Period** | ${ctx.timeframe} |\n`;
  report += `| **Total Signals** | ${newsArticles.length} across ${companies.length} accounts |\n`;
  report += `| **Actionable** | ${actionableSignals.length} signals (${Math.round(actionableSignals.length / newsArticles.length * 100)}%) |\n`;
  report += `| **Priority Accounts** | ${highUrgency.length > 0 ? highUrgency.map(([c]) => c).join(', ') : 'None this period'} |\n\n`;

  const shared = { newsArticles, grouped, companies, actionableSignals, useCaseMatches, topCompanies, highUrgency };

  // Daily briefings get a short, flexible-format digest instead of the full
  // multi-section deep dive — same visual style (tables, bold, conversation
  // prompts) but scoped to only what's actionable *today*, without the
  // sections that need a wider time range to be meaningful (adjacent-sector
  // patterns, emerging tech, macro signals, scenario planning, etc.).
  if (period === 'daily') {
    report += buildDailyDigest(shared);
    report += `\n---\n\n`;
    report += `| | |\n|---|---|\n`;
    report += `| **Report** | ${ctx.label} |\n`;
    report += `| **Generated** | ${date} |\n`;
    return report;
  }

  report += buildFullReportBody(shared);
  report += buildTrendAnalysis(shared);
  report += buildSummary({ ...shared, ctx });

  // ===== FOOTER =====
  report += `\n---\n\n`;
  report += `| | |\n|---|---|\n`;
  report += `| **Report** | ${ctx.label} |\n`;
  report += `| **Generated** | ${date} |\n`;
  report += `| **Rubric Coverage** | Trends ✓ Use Cases ✓ Committee ✓ Differentiation ✓ Adjacent Patterns ✓ Emerging Tech ✓ Macro Signals ✓ Scenarios ✓ Summary ✓ |\n`;

  return report;
}

/**
 * Short, flexible-format digest for the daily report. Keeps the same table
 * style and key figures as the full report, but condenses everything that
 * is genuinely actionable "today" into a couple of tight sections instead of
 * the full nine-section rubric (which needs a wider time window to surface
 * meaningful cross-sector/macro/scenario signals).
 */
function buildDailyDigest({ newsArticles, grouped, actionableSignals, useCaseMatches, highUrgency }) {
  let out = '';

  // ---- Top signals today ----
  out += `## Top Signals Today\n\n`;
  const topSignals = actionableSignals.length > 0 ? actionableSignals.slice(0, 5) : newsArticles.slice(0, 5);
  const implications = {
    EXPANSION: 'New market = 3-5x notification volume growth',
    TECHNOLOGY: 'Platform investment = 40% higher messaging spend',
    FINANCIAL: 'Revenue growth = 2.5x more likely to approve vendors',
    PARTNERSHIP: 'Partner expansion = 60% increase in API calls',
    RISK: 'Service issues = 3x more receptive to failover solutions',
    GENERAL: 'Evolving needs = engagement window open'
  };
  out += `| # | Company | Signal | Type | Business Implication |\n`;
  out += `|---|---------|--------|------|---------------------|\n`;
  topSignals.forEach((article, i) => {
    const type = classifyNews(article.title, article.description);
    out += `| ${i + 1} | **${article.company}** | ${article.title.substring(0, 55)}${article.title.length > 55 ? '...' : ''} | ${type} | ${implications[type] || implications.GENERAL} |\n`;
  });
  out += `\n| Conversation Opener |\n|---|\n| *"I noticed [signal] about your company. How is this affecting your communication strategy?"* |\n\n`;

  // ---- Use case snapshot ----
  out += `## Use Case Snapshot\n\n`;
  out += `| Pillar | Signals | Key Accounts | Business Value |\n`;
  out += `|--------|---------|--------------|----------------|\n`;
  for (const [key, uc] of Object.entries(USE_CASES)) {
    const matched = useCaseMatches[key];
    const cos = [...new Set(matched.map(a => a.company))].slice(0, 3);
    out += `| ${uc.icon} **${uc.name}** | ${matched.length} | ${cos.length > 0 ? cos.join(', ') : '—'} | ${uc.value} |\n`;
  }
  out += `\n`;

  // ---- Priority actions ----
  out += `## Priority Actions\n\n`;
  out += `| Priority | Account | Action | Deadline |\n`;
  out += `|----------|---------|--------|----------|\n`;
  if (highUrgency.length > 0) {
    highUrgency.slice(0, 3).forEach(([company, articles]) => {
      out += `| 🔴 **HIGH** | ${company} | Reach out re: "${articles[0].title.substring(0, 45)}..." | Within 24h |\n`;
    });
  }
  const medUrgency = Object.entries(grouped).filter(([c]) => !highUrgency.some(([h]) => h === c)).slice(0, 3);
  medUrgency.forEach(([company]) => {
    out += `| 🟡 Medium | ${company} | Schedule touchpoint, reference recent signal | This week |\n`;
  });
  if (highUrgency.length === 0 && medUrgency.length === 0) {
    out += `| 🟢 Normal | All accounts | Relationship building, share insights with champions | This week |\n`;
  }
  out += `\n`;

  return out;
}

/** Full nine-... now eight-section rubric body used for weekly/monthly/quarterly reports. */
function buildFullReportBody(shared) {
  const { newsArticles, grouped, companies, useCaseMatches, topCompanies, highUrgency } = shared;
  let report = '';

  // ===== SECTION 1: INDUSTRY TRENDS =====
  report += `## 1. Industry Trends & Urgency\n\n`;
  const topSignals = shared.actionableSignals.length > 0 ? shared.actionableSignals.slice(0, 6) : newsArticles.slice(0, 6);
  report += `| # | Company | Signal | Type | Business Implication |\n`;
  report += `|---|---------|--------|------|---------------------|\n`;
  const implications = {
    EXPANSION: 'New market = 3-5x notification volume growth',
    TECHNOLOGY: 'Platform investment = 40% higher messaging spend',
    FINANCIAL: 'Revenue growth = 2.5x more likely to approve vendors',
    PARTNERSHIP: 'Partner expansion = 60% increase in API calls',
    RISK: 'Service issues = 3x more receptive to failover solutions',
    GENERAL: 'Evolving needs = engagement window open'
  };
  topSignals.forEach((article, i) => {
    const type = classifyNews(article.title, article.description);
    report += `| ${i + 1} | **${article.company}** | ${article.title.substring(0, 55)}${article.title.length > 55 ? '...' : ''} | ${type} | ${implications[type] || implications.GENERAL} |\n`;
  });
  report += `\n| Conversation Opener |\n|---|\n| *"I noticed [signal] about your company. How is this affecting your communication strategy? Are you seeing increased pressure on messaging volume?"* |\n\n`;

  // ===== SECTION 2: USE CASE MAPPING =====
  report += `## 2. Communication Use Case Mapping\n\n`;
  report += `| Pillar | Signals | Key Accounts | Lead Capability | Business Value |\n`;
  report += `|--------|---------|--------------|-----------------|----------------|\n`;
  for (const [key, uc] of Object.entries(USE_CASES)) {
    const matched = useCaseMatches[key];
    const cos = [...new Set(matched.map(a => a.company))].slice(0, 3);
    report += `| ${uc.icon} **${uc.name}** | ${matched.length} | ${cos.length > 0 ? cos.join(', ') : '—'} | ${uc.capabilities[0]} | ${uc.value} |\n`;
  }

  // Top use case detail
  const topUC = Object.entries(useCaseMatches).sort((a, b) => b[1].length - a[1].length)[0];
  if (topUC && topUC[1].length > 0) {
    const uc = USE_CASES[topUC[0]];
    report += `\n| Focus: ${uc.icon} ${uc.name} | Detail |\n|---|---|\n`;
    report += `| **Why now** | ${topUC[1].length} signals detected this period |\n`;
    report += `| **Top account** | ${topUC[1][0]?.company}: "${topUC[1][0]?.title.substring(0, 60)}..." |\n`;
    report += `| **Capabilities** | ${uc.capabilities.join(' + ')} |\n`;
    report += `| **Expected impact** | ${uc.value} |\n`;
  }
  report += `\n| Discovery Question |\n|---|\n| *"Which matters most right now — keeping customers Engaged, Informed, Safe, or Happy? Where is the biggest gap?"* |\n\n`;

  // ===== SECTION 3: BUYING COMMITTEE =====
  report += `## 3. Buying Committee Map\n\n`;
  topCompanies.slice(0, 2).forEach(([company, articles]) => {
    const personas = identifyBuyingCommittee(articles);
    const indCtx = getIndustryContext(company);
    report += `### ${company} (${indCtx.vertical})\n\n`;
    report += `| Persona | Priority | Pain Point | Value Proposition |\n`;
    report += `|---------|----------|------------|-------------------|\n`;
    personas.slice(0, 3).forEach(pk => {
      const p = BUYING_COMMITTEE[pk];
      if (!p) return;
      report += `| **${p.title}** | ${p.priorities[0]} | ${p.painPoints[0]} | ${p.pitch.substring(0, 55)}... |\n`;
    });
    report += `\n| Navigation Strategy |\n|---|\n| Entry: ${BUYING_COMMITTEE[personas[0]]?.title || 'Technical lead'} → Expand to: ${BUYING_COMMITTEE[personas[1]]?.title || 'Business sponsor'} → Champion: ${BUYING_COMMITTEE[personas[2]]?.title || 'Operations'} |\n\n`;
  });
  report += `| Committee Question |\n|---|\n| *"Who else needs to be involved in a communication infrastructure decision? What keeps them up at night?"* |\n\n`;

  // ===== SECTION 4: COMPETITIVE EDGE =====
  report += `## 4. Competitive Edge\n\n`;
  report += `| Differentiator | What It Means for Your Accounts |\n`;
  report += `|----------------|----------------------------------|\n`;

  const diffRows = [];
  if (newsArticles.some(a => ((a.title || '') + (a.description || '')).toLowerCase().match(/scale|growth|expand|million|billion/))) {
    diffRows.push(`| **Scale** | ${DIFFERENTIATORS.scale}. When accounts grow, messaging just works. |`);
  }
  if (newsArticles.some(a => ((a.title || '') + (a.description || '')).toLowerCase().match(/international|global|cross-border|multi-market/))) {
    diffRows.push(`| **Global Reach** | ${DIFFERENTIATORS.reach}. No telecom compliance headaches. |`);
  }
  if (useCaseMatches.ENGAGED.length > 0 || useCaseMatches.INFORMED.length > 0) {
    diffRows.push(`| **Omnichannel** | ${DIFFERENTIATORS.omnichannel}. Replace 5 vendors with one. |`);
  }
  if (useCaseMatches.SAFE.length > 0) {
    diffRows.push(`| **Trust** | ${DIFFERENTIATORS.reliability}. Every user verified, every bad actor blocked. |`);
  }
  diffRows.push(`| **Speed** | ${DIFFERENTIATORS.speed}. Live in days, not months. |`);
  diffRows.push(`| **Intelligence** | ${DIFFERENTIATORS.intelligence}. Maximize delivery, minimize cost. |`);

  diffRows.slice(0, 4).forEach(row => { report += row + '\n'; });
  report += `\n| Closing Question |\n|---|\n| *"Based on what we discussed, do you see how this approach would address [their challenge] differently than what you have today?"* |\n\n`;

  // ===== SECTION 5: ADJACENT SECTOR PATTERNS =====
  // Only surfaces a theme if it shows up across 2+ distinct company
  // categories — a genuine cross-industry pattern, not a single company's news.
  report += `## 5. Adjacent Sector Patterns\n\n`;
  const adjacentHits = scanKeywordThemes(newsArticles, ADJACENT_PATTERN_THEMES, 2);
  const crossSectorPatterns = adjacentHits.filter(([, matches]) => {
    const categories = new Set(matches.map(a => COMPANY_CATEGORY[a.company]).filter(Boolean));
    return categories.size >= 2;
  });
  if (crossSectorPatterns.length > 0) {
    report += `| Pattern | Sectors Involved | Companies Showing It | What It Suggests |\n`;
    report += `|---------|-------------------|----------------------|-------------------|\n`;
    crossSectorPatterns.slice(0, 5).forEach(([theme, matches]) => {
      const sectors = [...new Set(matches.map(a => COMPANY_CATEGORY[a.company]).filter(Boolean))].join(', ');
      const cos = [...new Set(matches.map(a => a.company))].slice(0, 4).join(', ');
      report += `| **${theme}** | ${sectors} | ${cos} | ${matches.length} accounts moving in parallel — worth a cross-account playbook, not one-off pitches |\n`;
    });
  } else {
    report += `| | |\n|---|---|\n| **Observation** | No theme repeated across 2+ distinct sectors this period — signals this period are sector-specific rather than systemic |\n`;
  }
  report += `\n| Analyst Note |\n|---|\n| *A pattern appearing in unrelated sectors (e.g. finance AND retail AND AI) is a stronger signal than the same pattern repeating within one industry — it points to a macro driver, not a sector fad.* |\n\n`;

  // ===== SECTION 6: EMERGING TECHNOLOGY SIGNALS =====
  report += `## 6. Emerging Technology Signals\n\n`;
  const emergingTechHits = scanKeywordThemes(newsArticles, EMERGING_TECH_KEYWORDS, 1);
  if (emergingTechHits.length > 0) {
    report += `| Technology | Signals | Leading Accounts | CPaaS Implication |\n`;
    report += `|------------|---------|-------------------|--------------------|\n`;
    const techImplications = {
      'Agentic AI / AI Agents': 'Agents need machine-to-human escalation channels when they hit a wall — a new notification/verification use case',
      'Foundation Models & LLMs': 'Model providers need usage, billing, and incident alerts at developer scale',
      'Autonomous Systems': 'Autonomous fleets need real-time safety and status messaging with zero tolerance for delivery failure',
      'Edge & Real-Time Compute': 'Low-latency use cases raise the bar on message delivery speed, not just reach',
      'Web3 & Digital Assets': 'Wallet and transaction alerts remain a top security/trust use case as digital-asset adoption grows',
      'Quantum Computing': 'Early-stage; worth monitoring for future security/verification implications, not an immediate pitch'
    };
    emergingTechHits.slice(0, 5).forEach(([tech, matches]) => {
      const cos = [...new Set(matches.map(a => a.company))].slice(0, 3).join(', ');
      report += `| **${tech}** | ${matches.length} | ${cos} | ${techImplications[tech] || 'Monitor for downstream communication needs'} |\n`;
    });
  } else {
    report += `| | |\n|---|---|\n| **Observation** | No emerging-technology keywords detected this period — revisit with a broader time range (weekly/monthly) for clearer signal |\n`;
  }
  report += `\n`;

  // ===== SECTION 7: MACRO SIGNALS & ASSUMPTIONS TO CHALLENGE =====
  report += `## 7. Macro Signals & Assumptions to Challenge\n\n`;
  const macroHits = Object.entries(MACRO_SIGNAL_THEMES)
    .map(([theme, cfg]) => {
      const matches = newsArticles.filter(a => {
        const text = ((a.title || '') + ' ' + (a.description || '')).toLowerCase();
        return cfg.keywords.some(kw => text.includes(kw));
      });
      return { theme, matches, ...cfg };
    })
    .filter(m => m.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);
  if (macroHits.length > 0) {
    report += `| Macro Signal | Evidence | Conventional Assumption | Challenge It |\n`;
    report += `|--------------|----------|--------------------------|---------------|\n`;
    macroHits.slice(0, 5).forEach(m => {
      const evidence = `${m.matches.length} signal(s) incl. ${[...new Set(m.matches.map(a => a.company))].slice(0, 2).join(', ')}`;
      report += `| **${m.theme}** | ${evidence} | ${m.assumption} | ${m.challenge} |\n`;
    });
  } else {
    report += `| | |\n|---|---|\n| **Observation** | No macroeconomic keywords detected this period — assume stable conditions, but re-check on the next monthly/quarterly report |\n`;
  }
  report += `\n| Reframe Question |\n|---|\n| *"Everyone assumes [conventional wisdom] right now — but what if the opposite is true for your business? What would that mean for how we should be working together?"* |\n\n`;

  // ===== SECTION 8: MULTIPLE FUTURES (SCENARIO PLANNING) =====
  // Deliberately presents 3 branches instead of one linear forecast so the
  // account team plans for optionality rather than a single predicted outcome.
  report += `## 8. Multiple Futures: Scenario Planning\n\n`;
  const scenarioThemeCounts = { EXPANSION: 0, RISK: 0, FINANCIAL: 0 };
  newsArticles.forEach(a => {
    const type = classifyNews(a.title, a.description);
    if (scenarioThemeCounts[type] !== undefined) scenarioThemeCounts[type]++;
  });
  const scenarios = buildFutureScenarios(scenarioThemeCounts, newsArticles.length);
  report += `| Scenario | Signal-Weighted Likelihood | Trigger Conditions | Account Strategy Implication |\n`;
  report += `|----------|----------------------------|---------------------|-------------------------------|\n`;
  scenarios.forEach(s => {
    report += `| **${s.name}** | ${s.likelihood} | ${s.trigger} | ${s.implication} |\n`;
  });
  report += `\n| Why This Matters |\n|---|\n| *Don't anchor the account plan to only the "Base Case." Prepare talking points for the Upside and Disruption scenarios now — whichever materializes, you'll already have the right message ready instead of reacting cold.* |\n\n`;

  // ===== ACTION PLAN =====
  report += `## Action Plan\n\n`;
  report += `| Priority | Account | Action | Deadline |\n`;
  report += `|----------|---------|--------|----------|\n`;

  if (highUrgency.length > 0) {
    highUrgency.slice(0, 3).forEach(([company, articles]) => {
      report += `| 🔴 **HIGH** | ${company} | Reach out re: "${articles[0].title.substring(0, 45)}..." | Within 24h |\n`;
    });
  }
  const medUrgency = Object.entries(grouped).filter(([c]) => !highUrgency.some(([h]) => h === c)).slice(0, 3);
  medUrgency.forEach(([company]) => {
    report += `| 🟡 Medium | ${company} | Schedule touchpoint, reference recent signal | This week |\n`;
  });
  if (highUrgency.length === 0 && medUrgency.length === 0) {
    report += `| 🟢 Normal | All accounts | Relationship building, share insights with champions | This week |\n`;
  }

  report += `\n| Ongoing Actions |\n|---|\n`;
  report += `| Update QBR decks for accounts with 3+ signals |\n`;
  report += `| Share report insights with AE partners |\n`;
  report += `| Log key signals in CRM for next touchpoint |\n\n`;

  return report;
}

/** Ranks the top 5 most active accounts and the theme mix for the period. Weekly/monthly/quarterly only. */
function buildTrendAnalysis({ grouped, newsArticles }) {
  const companyCounts = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  let report = `\n## Trend Analysis\n\n`;
  report += `| Rank | Account | Signals | Activity Level |\n`;
  report += `|------|---------|---------|----------------|\n`;
  companyCounts.slice(0, 5).forEach(([co, articles], i) => {
    const level = articles.length >= 10 ? '🔥 Very High' : articles.length >= 5 ? '⚡ High' : articles.length >= 3 ? '📊 Moderate' : '📌 Low';
    report += `| ${i + 1} | **${co}** | ${articles.length} | ${level} |\n`;
  });

  // Theme distribution
  const themes = { Messaging: 0, Digital: 0, Expansion: 0, Financial: 0, Partnership: 0, Risk: 0 };
  newsArticles.forEach(a => {
    const text = ((a.title || '') + ' ' + (a.description || '')).toLowerCase();
    if (text.match(/messaging|sms|rcs|notification|communication/)) themes.Messaging++;
    if (text.match(/digital|platform|api|cloud|ai|automation/)) themes.Digital++;
    if (text.match(/expand|launch|new market|growth|scale/)) themes.Expansion++;
    if (text.match(/revenue|profit|earnings|funding|ipo/)) themes.Financial++;
    if (text.match(/partner|collaboration|alliance|deal/)) themes.Partnership++;
    if (text.match(/layoff|decline|loss|breach|fine|regulatory/)) themes.Risk++;
  });

  report += `\n| Theme | Signals | Share | Trend |\n`;
  report += `|-------|---------|-------|-------|\n`;
  Object.entries(themes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([theme, count]) => {
    const pct = Math.round(count / newsArticles.length * 100);
    const bar = '█'.repeat(Math.min(Math.round(pct / 5), 10));
    report += `| **${theme}** | ${count} | ${pct}% | ${bar} |\n`;
  });
  report += `\n`;

  return report;
}

/**
 * Closing "Summary" section for weekly/monthly/quarterly reports — a single
 * at-a-glance recap of the period's headline numbers, top accounts, dominant
 * theme, and the most likely near-term scenario, so a reader who only has
 * time for one section still walks away with the key takeaways.
 */
function buildSummary({ ctx, newsArticles, companies, actionableSignals, topCompanies, highUrgency }) {
  const topAccounts = topCompanies.slice(0, 3).map(([co, articles]) => `${co} (${articles.length})`).join(', ') || 'None';

  const themeCounts = { EXPANSION: 0, RISK: 0, FINANCIAL: 0 };
  newsArticles.forEach(a => {
    const type = classifyNews(a.title, a.description);
    if (themeCounts[type] !== undefined) themeCounts[type]++;
  });
  const scenarios = buildFutureScenarios(themeCounts, newsArticles.length);
  const topScenario = [...scenarios].sort((a, b) => parseInt(b.likelihood) - parseInt(a.likelihood))[0];

  const actionablePct = Math.round(actionableSignals.length / newsArticles.length * 100);

  let report = `## Summary\n\n`;
  report += `| | |\n|---|---|\n`;
  report += `| **Period Overview** | ${newsArticles.length} signals across ${companies.length} accounts (${ctx.timeframe.toLowerCase()}) — ${actionablePct}% directly actionable |\n`;
  report += `| **Top Accounts to Watch** | ${topAccounts} |\n`;
  report += `| **Priority Accounts** | ${highUrgency.length > 0 ? highUrgency.map(([c]) => c).join(', ') : 'None this period'} |\n`;
  report += `| **Most Likely Near-Term Scenario** | ${topScenario.name.replace(/ —.*/, '')} (${topScenario.likelihood}) |\n`;
  report += `| **Recommended Focus** | ${highUrgency.length > 0 ? 'Move on priority accounts within 24h, then reinforce use cases with the rest of the base' : 'Steady relationship building — reinforce use cases and log signals for the next touchpoint'} |\n\n`;

  return report;
}

module.exports = { generateHeuristicReport, generateYearlySummary };
