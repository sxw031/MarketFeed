const COMPANIES = [
  // === Finance & Banking ===
  { id: 'hsbc', name: 'HSBC', domain: 'hsbc.com', category: 'Finance', logoUrl: 'https://logo.clearbit.com/hsbc.com', website: { url: 'https://www.hsbc.com/news-and-media/media-releases' } },
  { id: 'dbs', name: 'DBS', domain: 'dbs.com', category: 'Finance', logoUrl: 'https://logo.clearbit.com/dbs.com', website: { url: 'https://www.dbs.com/newsroom/default.page' } },
  { id: 'bankofchina', name: 'Bank of China', domain: 'boc.cn', category: 'Finance', logoUrl: '/img/bankofchina.png', website: { url: 'https://www.boc.cn/en/aboutboc/ab1/index.html' } },
  { id: 'citigroup', name: 'Citigroup', domain: 'citigroup.com', category: 'Finance', logoUrl: 'https://logo.clearbit.com/citigroup.com', website: { url: 'https://www.citigroup.com/global/news/press-releases' } },
  { id: 'standard-chartered', name: 'Standard Chartered', domain: 'sc.com', category: 'Finance', logoUrl: 'https://logo.clearbit.com/sc.com', website: { url: 'https://www.sc.com/en/media/' } },
  { id: 'jpmorgan', name: 'JPMorgan Chase', domain: 'jpmorganchase.com', category: 'Finance', logoUrl: 'https://logo.clearbit.com/jpmorganchase.com', website: { url: 'https://www.jpmorganchase.com/newsroom' } },
  { id: 'aeoncredit', name: 'Aeon Credit', domain: 'aeoncredit.com.my', category: 'Finance', logoUrl: 'https://logo.clearbit.com/aeoncredit.com.my', website: { url: 'https://www.aeoncredit.com.my/news-announcements' } },
  { id: 'bofa', name: 'Bank of America', domain: 'bankofamerica.com', category: 'Finance', logoUrl: 'https://logo.clearbit.com/bankofamerica.com', website: { url: 'https://newsroom.bankofamerica.com/' } },

  // === Crypto & Fintech ===
  { id: 'binance', name: 'Binance', domain: 'binance.com', category: 'Crypto', logoUrl: 'https://logo.clearbit.com/binance.com', website: { url: 'https://www.binance.com/en/blog/news' } },
  { id: 'coinbase', name: 'Coinbase', domain: 'coinbase.com', category: 'Crypto', logoUrl: 'https://logo.clearbit.com/coinbase.com', website: { url: 'https://www.coinbase.com/blog' } },
  { id: 'stripe', name: 'Stripe', domain: 'stripe.com', category: 'Crypto', logoUrl: 'https://logo.clearbit.com/stripe.com', website: { url: 'https://stripe.com/newsroom' } },
  { id: 'paypal', name: 'PayPal', domain: 'paypal.com', category: 'Crypto', logoUrl: 'https://logo.clearbit.com/paypal.com', website: { url: 'https://newsroom.paypal-corp.com/' } },

  // === Big Tech ===
  { id: 'apple', name: 'Apple', domain: 'apple.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/apple.com', website: { url: 'https://www.apple.com/newsroom/' } },
  { id: 'alphabet', name: 'Alphabet (Google)', domain: 'abc.xyz', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/google.com', website: { url: 'https://blog.google/' } },
  { id: 'microsoft', name: 'Microsoft', domain: 'microsoft.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/microsoft.com', website: { url: 'https://news.microsoft.com/' } },
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/amazon.com', website: { url: 'https://www.aboutamazon.com/news' } },
  { id: 'meta', name: 'Meta', domain: 'meta.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/meta.com', website: { url: 'https://about.fb.com/news/' } },
  { id: 'nvidia', name: 'Nvidia', domain: 'nvidia.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/nvidia.com', website: { url: 'https://nvidianews.nvidia.com/' } },
  { id: 'samsung', name: 'Samsung', domain: 'samsung.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/samsung.com', website: { url: 'https://news.samsung.com/global' } },
  { id: 'tsmc', name: 'TSMC', domain: 'tsmc.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/tsmc.com', website: { url: 'https://pr.tsmc.com/english/news/releases' } },
  { id: 'adobe', name: 'Adobe', domain: 'adobe.com', category: 'Big Tech', logoUrl: 'https://logo.clearbit.com/adobe.com', website: { url: 'https://news.adobe.com/' } },

  // === AI & Data ===
  { id: 'openai', name: 'OpenAI', domain: 'openai.com', category: 'AI', logoUrl: 'https://logo.clearbit.com/openai.com', website: { url: 'https://openai.com/blog' } },
  { id: 'anthropic', name: 'Anthropic', domain: 'anthropic.com', category: 'AI', logoUrl: 'https://logo.clearbit.com/anthropic.com', website: { url: 'https://www.anthropic.com/news' } },
  { id: 'databricks', name: 'Databricks', domain: 'databricks.com', category: 'AI', logoUrl: 'https://logo.clearbit.com/databricks.com', website: { url: 'https://www.databricks.com/blog' } },
  { id: 'bytedance', name: 'ByteDance', domain: 'bytedance.com', category: 'AI', logoUrl: '/img/bytedance.png', website: { url: 'https://www.bytedance.com/en/news' } },
  { id: 'palantir', name: 'Palantir', domain: 'palantir.com', category: 'AI', logoUrl: 'https://logo.clearbit.com/palantir.com', website: { url: 'https://www.palantir.com/newsroom/' } },
  { id: 'deepseek', name: 'DeepSeek', domain: 'deepseek.com', category: 'AI', logoUrl: 'https://logo.clearbit.com/deepseek.com', website: { url: 'https://www.deepseek.com/en' } },
  { id: 'moonshot-ai', name: 'Moonshot AI', domain: 'moonshot.cn', category: 'AI', logoUrl: 'https://logo.clearbit.com/moonshot.cn', website: { url: 'https://www.moonshot.cn/' } },

  // === E-commerce & Retail ===
  { id: 'alibaba', name: 'Alibaba', domain: 'alibaba.com', category: 'E-commerce', logoUrl: 'https://logo.clearbit.com/alibaba.com', website: { url: 'https://www.alizila.com/' } },
  { id: 'temu', name: 'Temu', domain: 'temu.com', category: 'E-commerce', logoUrl: 'https://logo.clearbit.com/temu.com', website: { url: 'https://www.temu.com/' } },
  { id: 'shein', name: 'Shein', domain: 'shein.com', category: 'E-commerce', logoUrl: 'https://logo.clearbit.com/shein.com', website: { url: 'https://www.shein.com/campaign/aboutus' } },
  { id: 'shopback', name: 'ShopBack', domain: 'shopback.com', category: 'E-commerce', logoUrl: 'https://logo.clearbit.com/shopback.com', website: { url: 'https://corporate.shopback.com/news' } },
  { id: 'walmart', name: 'Walmart', domain: 'walmart.com', category: 'E-commerce', logoUrl: 'https://logo.clearbit.com/walmart.com', website: { url: 'https://corporate.walmart.com/newsroom' } },
  { id: 'nike', name: 'Nike', domain: 'nike.com', category: 'E-commerce', logoUrl: 'https://logo.clearbit.com/nike.com', website: { url: 'https://about.nike.com/en/newsroom' } },

  // === Mobility & Travel ===
  { id: 'grab', name: 'Grab', domain: 'grab.com', category: 'Mobility', logoUrl: 'https://logo.clearbit.com/grab.com', website: { url: 'https://www.grab.com/sg/press/' } },
  { id: 'didi', name: 'Didi', domain: 'didiglobal.com', category: 'Mobility', logoUrl: 'https://logo.clearbit.com/didiglobal.com', website: { url: 'https://www.didiglobal.com/news' } },
  { id: 'gojek', name: 'Gojek', domain: 'gojek.com', category: 'Mobility', logoUrl: 'https://logo.clearbit.com/gojek.com', website: { url: 'https://www.gojek.com/en-id/news/' } },
  { id: 'cathay', name: 'Cathay Pacific', domain: 'cathaypacific.com', category: 'Mobility', logoUrl: 'https://logo.clearbit.com/cathaypacific.com', website: { url: 'https://news.cathaypacific.com/' } },
  { id: 'ctrip', name: 'Ctrip', domain: 'trip.com', category: 'Mobility', logoUrl: 'https://logo.clearbit.com/trip.com', website: { url: 'https://ir.trip.com/news-releases' } },

  // === Telecom ===
  { id: 'vodafone', name: 'Vodafone', domain: 'vodafone.com', category: 'Telecom', logoUrl: 'https://logo.clearbit.com/vodafone.com', website: { url: 'https://www.vodafone.com/news' } },
  { id: 'singtel', name: 'Singtel', domain: 'singtel.com', category: 'Telecom', logoUrl: 'https://logo.clearbit.com/singtel.com', website: { url: 'https://www.singtel.com/about-us/media-centre/news-releases' } },
  { id: 'starhub', name: 'StarHub', domain: 'starhub.com', category: 'Telecom', logoUrl: 'https://logo.clearbit.com/starhub.com', website: { url: 'https://www.starhub.com/about-us/newsroom.html' } },

  // === Entertainment & Media ===
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', category: 'Entertainment', logoUrl: 'https://logo.clearbit.com/netflix.com', website: { url: 'https://about.netflix.com/en/newsroom' } },
  { id: 'tencent', name: 'Tencent', domain: 'tencent.com', category: 'Entertainment', logoUrl: 'https://logo.clearbit.com/tencent.com', website: { url: 'https://www.tencent.com/en-us/media.html' } },
  { id: 'disney', name: 'Disney', domain: 'disney.com', category: 'Entertainment', logoUrl: 'https://logo.clearbit.com/disney.com', website: { url: 'https://thewaltdisneycompany.com/news/' } },

  // === Social Media ===
  { id: 'reddit', name: 'Reddit', domain: 'redditinc.com', category: 'Social Media', logoUrl: 'https://logo.clearbit.com/reddit.com', website: { url: 'https://redditinc.com/press' } },
  { id: 'x', name: 'X (Twitter)', domain: 'x.com', category: 'Social Media', logoUrl: 'https://logo.clearbit.com/x.com', website: { url: 'https://blog.x.com/en_us' } },
  { id: 'rednote', name: 'RedNote (Xiaohongshu)', domain: 'xiaohongshu.com', category: 'Social Media', logoUrl: 'https://logo.clearbit.com/xiaohongshu.com', website: { url: 'https://www.xiaohongshu.com/' } },

  // === Automotive & Energy ===
  { id: 'tesla', name: 'Tesla', domain: 'tesla.com', category: 'Auto & Energy', logoUrl: 'https://logo.clearbit.com/tesla.com', website: { url: 'https://ir.tesla.com/press' } },
  { id: 'helios', name: 'Helios Energy', domain: 'heliosenergy.com', category: 'Auto & Energy', logoUrl: 'https://logo.clearbit.com/heliosenergy.com', website: { url: 'https://www.heliosenergy.com/news' } },
  { id: 'catl', name: 'CATL (宁德时代)', domain: 'catl.com', category: 'Auto & Energy', logoUrl: 'https://logo.clearbit.com/catl.com', website: { url: 'https://www.catl.com/en/news/' } },

  // === Logistics & Aerospace ===
  { id: 'spacex', name: 'SpaceX', domain: 'spacex.com', category: 'Aerospace', logoUrl: 'https://logo.clearbit.com/spacex.com', website: { url: 'https://www.spacex.com/updates/' } },
  { id: 'sf-express', name: 'SF Express (顺丰)', domain: 'sf-express.com', category: 'Logistics', logoUrl: 'https://logo.clearbit.com/sf-express.com', website: { url: 'https://www.sf-express.com/en/news/' } },
];

// Category definitions for the UI selector
const CATEGORIES = [
  { id: 'all', name: 'All Companies', icon: '🌐' },
  { id: 'Finance', name: 'Finance & Banking', icon: '🏦' },
  { id: 'Crypto', name: 'Crypto & Fintech', icon: '₿' },
  { id: 'Big Tech', name: 'Big Tech', icon: '💻' },
  { id: 'AI', name: 'AI & Data', icon: '🤖' },
  { id: 'E-commerce', name: 'E-commerce & Retail', icon: '🛒' },
  { id: 'Mobility', name: 'Mobility & Travel', icon: '✈️' },
  { id: 'Telecom', name: 'Telecom', icon: '📡' },
  { id: 'Entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'Social Media', name: 'Social Media', icon: '📱' },
  { id: 'Auto & Energy', name: 'Auto & Energy', icon: '⚡' },
  { id: 'Aerospace', name: 'Aerospace', icon: '🚀' },
  { id: 'Logistics', name: 'Logistics', icon: '📦' },
];

module.exports = { COMPANIES, CATEGORIES };
