/**
 * AI Chat Service - Smart heuristic Q&A for account managers.
 * Extracted from server.js to keep route handlers thin and the
 * intent-detection/answer-building logic unit-testable in isolation.
 */
const { COMPANIES } = require('../config/sources');

const COMPANY_NAMES = COMPANIES.map(c => c.name);

const COMPANY_ALIASES = { 'dbs': 'DBS', 'hsbc': 'HSBC', 'grab': 'Grab', 'temu': 'Temu', 'didi': 'Didi', 'gojek': 'Gojek', 'citi': 'Citigroup', 'citibank': 'Citigroup', 'alibaba': 'Alibaba', 'ali': 'Alibaba', 'tiktok': 'ByteDance', 'bytedance': 'ByteDance', 'tencent': 'Tencent', 'wechat': 'Tencent', 'binance': 'Binance', 'crypto': 'Binance', 'cathay': 'Cathay Pacific', 'vodafone': 'Vodafone', 'stanchart': 'Standard Chartered', 'sc': 'Standard Chartered', 'boc': 'Bank of China', 'shopback': 'ShopBack', 'aeon': 'Aeon Credit', 'ctrip': 'Ctrip', 'trip.com': 'Ctrip', 'tesla': 'Tesla', 'tsla': 'Tesla', 'helios': 'Helios Energy', 'coinbase': 'Coinbase', 'apple': 'Apple', 'iphone': 'Apple', 'alphabet': 'Alphabet', 'google': 'Alphabet', 'nvidia': 'NVIDIA', 'nvda': 'NVIDIA', 'databricks': 'Databricks', 'netflix': 'Netflix', 'meta': 'Meta', 'facebook': 'Meta', 'instagram': 'Meta', 'spacex': 'SpaceX', 'stripe': 'Stripe', 'microsoft': 'Microsoft', 'msft': 'Microsoft', 'amazon': 'Amazon', 'aws': 'Amazon', 'shein': 'Shein', 'samsung': 'Samsung', 'walmart': 'Walmart', 'openai': 'OpenAI', 'chatgpt': 'OpenAI', 'gpt': 'OpenAI', 'sf express': 'SF Express', '顺丰': 'SF Express', 'catl': 'CATL', '宁德时代': 'CATL', 'jpmorgan': 'JPMorgan', 'jpm': 'JPMorgan', 'tsmc': 'TSMC', 'anthropic': 'Anthropic', 'claude': 'Anthropic', 'singtel': 'Singtel', 'starhub': 'StarHub' };

const RELEVANCE_KEYWORDS = ['messaging', 'communication', 'api', 'digital', 'platform', 'app', 'notification', 'customer', 'mobile', 'cloud', 'engagement', 'chatbot', 'ai', 'automation'];
const ENGAGEMENT_KEYWORDS = ['messaging', 'communication', 'api', 'digital', 'platform', 'notification', 'customer engagement', 'chatbot', 'rcs', 'sms', 'mobile', 'cloud communication', 'omnichannel'];
const RISK_KEYWORDS = ['layoff', 'cut', 'decline', 'loss', 'fine', 'penalty', 'lawsuit', 'investigation', 'breach', 'hack', 'downturn', 'restructur', 'close', 'shut'];
const STOP_WORDS = ['the', 'and', 'for', 'are', 'was', 'what', 'how', 'why', 'who', 'when', 'where', 'can', 'does', 'about', 'with', 'this', 'that', 'from', 'have', 'has'];

// Words that mean "keep talking about the same subject as before" so a
// multi-turn conversation doesn't force the user to repeat the company name.
const FOLLOWUP_WORDS = ['it', 'them', 'they', 'that', 'this one', 'the company', 'same', 'also', 'and them', 'what about'];

function findMentionedCompanies(q) {
  const found = new Set();
  COMPANY_NAMES.forEach(c => { if (q.includes(c.toLowerCase())) found.add(c); });
  Object.keys(COMPANY_ALIASES).forEach(a => { if (q.includes(a)) found.add(COMPANY_ALIASES[a]); });
  return [...found];
}

function findMentionedCompany(q) {
  return findMentionedCompanies(q)[0] || null;
}

function isFollowUpQuery(q) {
  const trimmed = q.trim();
  if (trimmed.split(/\s+/).length <= 6 && FOLLOWUP_WORDS.some(w => trimmed.includes(w))) return true;
  return false;
}

/** Find the most recently discussed company in the conversation history. */
function lastMentionedCompanyFromHistory(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (!turn || !turn.content) continue;
    const q = String(turn.content).toLowerCase();
    const found = findMentionedCompany(q);
    if (found) return found;
  }
  return null;
}

function detectIntent(query) {
  return {
    isAboutTrends: /trend|overview|summary|what.s happening|update|latest|market|today/i.test(query),
    isAboutOpportunity: /opportunity|csm|engagement|outreach|upsell|cross.sell|prospect|pipeline/i.test(query),
    isAboutRisk: /risk|threat|concern|problem|issue|challenge|warning|negative/i.test(query),
    isAboutStrategy: /strategy|recommend|suggest|action|next step|what should|how to|approach/i.test(query),
    isGreeting: /^(hi|hello|hey|good morning|good afternoon|sup|yo)\b/i.test(query.trim()),
    // "Deep think" mode: the user wants a thorough, multi-angle analysis
    // rather than a single quick answer (comparisons, "why", "deep dive"...).
    isDeepThink: /deep\s*dive|deep\s*think|analy[sz]e|in[- ]depth|comprehensive|compare|vs\.?\s|versus|why (is|are|did|does)|thorough/i.test(query)
  };
}

function buildGreetingAnswer(news) {
  const count = news.length;
  const companies = [...new Set(news.map(n => n.company))].length;
  let answer = `Hey there! 👋\n\nI'm currently tracking **${count} articles** across **${companies} companies** in your portfolio. Here's what I can help with:\n\n`;
  answer += `- Ask about a specific company: *"What's happening with HSBC?"*\n`;
  answer += `- Get market trends: *"Give me an overview"*\n`;
  answer += `- Find opportunities: *"Any engagement opportunities?"*\n`;
  answer += `- Strategic advice: *"What should I focus on this week?"*\n\n`;
  answer += `What would you like to know?`;
  return answer;
}

function buildCompanyAnswer(mentionedCompany, news) {
  const companyNews = news.filter(n => n.company === mentionedCompany);
  if (companyNews.length === 0) {
    let answer = `I don't have recent news about **${mentionedCompany}** in your current view.\n\n`;
    answer += `**Quick fixes:**\n`;
    answer += `- Expand the time range to 48h or 1 week\n`;
    answer += `- Click Sync Latest to fetch the latest\n`;
    answer += `- Check if ${mentionedCompany} is in your selected companies filter`;
    return answer;
  }

  const strategic = companyNews.filter(n => n.category === 'Strategic Insights');
  const finance = companyNews.filter(n => n.category === 'Finance');
  const tech = companyNews.filter(n => n.category === 'Technology');

  let answer = `## ${mentionedCompany}\n\n`;
  answer += `I've got **${companyNews.length} recent articles** on ${mentionedCompany}. Let me break it down:\n\n`;

  if (strategic.length > 0) {
    answer += `### 🚀 Strategic Moves\n`;
    strategic.slice(0, 3).forEach(n => { answer += `- **${n.title}** — *${n.source}*\n`; });
    answer += `\n`;
  }

  if (finance.length > 0) {
    answer += `### 💰 Financial Updates\n`;
    finance.slice(0, 2).forEach(n => { answer += `- ${n.title} — *${n.source}*\n`; });
    answer += `\n`;
  }

  if (tech.length > 0) {
    answer += `### 💻 Technology & Digital\n`;
    tech.slice(0, 2).forEach(n => { answer += `- ${n.title} — *${n.source}*\n`; });
    answer += `\n`;
  }

  const relevantSignals = companyNews.filter(n => RELEVANCE_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw)));

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
  return answer;
}

function buildOpportunityAnswer(news) {
  const opportunities = news.filter(n => ENGAGEMENT_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw)));

  let answer = `## 🎯 Engagement Radar\n\n`;

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
    answer += `3. Generate a Market Intelligence Report for detailed per-account action plans\n`;
  } else {
    answer += `No strong CPaaS/messaging signals detected right now. This is normal — not every news cycle will surface opportunities.\n\n`;
    answer += `**What to do:**\n`;
    answer += `- Expand to 1-week view for broader signal detection\n`;
    answer += `- Check the Market Intelligence Report for pattern-based recommendations\n`;
    answer += `- Focus on relationship maintenance with your top accounts`;
  }
  return answer;
}

function buildTrendsAnswer(news) {
  const companies = [...new Set(news.map(n => n.company))];
  const categories = {};
  news.forEach(n => { categories[n.category || 'General'] = (categories[n.category || 'General'] || 0) + 1; });
  const counts = {};
  news.forEach(n => { counts[n.company] = (counts[n.company] || 0) + 1; });
  const topCompanies = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let answer = `## 📊 Market Pulse\n\n`;
  answer += `Here's your snapshot across **${news.length} articles** from **${companies.length} companies**:\n\n`;

  answer += `### Most Active This Cycle\n`;
  topCompanies.forEach(([co, cnt], i) => {
    const bar = '█'.repeat(Math.min(cnt, 10));
    answer += `${i + 1}. **${co}** — ${cnt} articles ${bar}\n`;
  });

  answer += `\n### Category Breakdown\n`;
  answer += `| Category | Count | % |\n|----------|-------|---|\n`;
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    answer += `| ${cat} | ${count} | ${Math.round(count / news.length * 100)}% |\n`;
  });

  answer += `\n### Key Takeaway\n`;
  const topCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  answer += `The dominant theme is **${topCat[0]}** (${topCat[1]} articles). `;
  if (topCat[0] === 'Strategic Insights') {
    answer += `This suggests significant corporate activity — mergers, partnerships, and expansions are in play. Great time for proactive CSM outreach.`;
  } else if (topCat[0] === 'Technology') {
    answer += `Tech-heavy cycles often signal digital transformation budgets being deployed — a prime opportunity for CPaaS conversations.`;
  } else {
    answer += `Keep monitoring for strategic signals that could translate into engagement opportunities.`;
  }
  return answer;
}

function buildRiskAnswer(news) {
  const risks = news.filter(n => RISK_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw)));

  let answer = `## ⚠️ Risk Radar\n\n`;
  if (risks.length > 0) {
    answer += `Detected **${risks.length} potential risk signals** across your accounts:\n\n`;
    risks.slice(0, 5).forEach(n => { answer += `- **${n.company}**: ${n.title}\n`; });
    answer += `\n**CSM Implication:** These accounts may be going through internal changes. Approach with empathy, focus on value demonstration, and be prepared for potential budget discussions or stakeholder changes.`;
  } else {
    answer += `No significant risk signals detected in the current view. Your accounts appear stable. This is a good time for growth-oriented conversations rather than defensive plays.`;
  }
  return answer;
}

function buildStrategyAnswer(news) {
  const strategic = news.filter(n => n.category === 'Strategic Insights');
  const topStrategic = [...new Set(strategic.map(n => n.company))].slice(0, 5);

  let answer = `## 🧭 This Week's Playbook\n\n`;
  answer += `Based on ${news.length} signals I'm tracking, here's my recommended focus:\n\n`;
  answer += `### Priority Accounts\n`;
  if (topStrategic.length > 0) {
    topStrategic.forEach((co, i) => {
      const coNews = strategic.filter(n => n.company === co);
      answer += `${i + 1}. **${co}** — ${coNews.length} strategic signal${coNews.length > 1 ? 's' : ''} (${coNews[0].title.substring(0, 50)}...)\n`;
    });
  }
  answer += `\n### Recommended Actions\n\n`;
  answer += `1. **Immediate:** Schedule touchpoints with accounts showing expansion/partnership signals\n`;
  answer += `2. **This week:** Prepare QBR materials incorporating the latest strategic moves\n`;
  answer += `3. **Ongoing:** Monitor for digital transformation announcements — these are your strongest entry points\n`;
  answer += `4. **Proactive:** Share relevant industry insights with your champions to stay top-of-mind\n\n`;
  answer += `*Pro tip: Click "Generate Market Intelligence Report" for a detailed, per-account action plan you can share with your team.*`;
  return answer;
}

function buildSearchAnswer(query, q, news) {
  const words = q.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.includes(w));
  const relevant = news.filter(n => {
    const text = ((n.title || '') + ' ' + (n.description || '') + ' ' + (n.company || '')).toLowerCase();
    return words.some(w => text.includes(w));
  });

  if (relevant.length === 0) {
    let answer = `Hmm, I couldn't find articles matching "${query}" in your current view.\n\n`;
    answer += `**Here's what might help:**\n\n`;
    answer += `- Try a company name: *"Tell me about Grab"*\n`;
    answer += `- Ask about trends: *"What's the market overview?"*\n`;
    answer += `- Find opportunities: *"Any engagement signals?"*\n`;
    answer += `- Get strategic advice: *"What should I focus on?"*\n`;
    answer += `- Expand time range to 1 week for more data\n\n`;
    answer += `I work best when you ask about the companies I track or about market patterns I can detect from the news.`;
    return answer;
  }

  let answer = `## Results for "${query}"\n\n`;
  answer += `Found **${relevant.length} matching articles**:\n\n`;

  const byCompany = {};
  relevant.forEach(n => { if (!byCompany[n.company]) byCompany[n.company] = []; byCompany[n.company].push(n); });

  Object.entries(byCompany).slice(0, 5).forEach(([co, arts]) => {
    answer += `**${co}**\n`;
    arts.slice(0, 2).forEach(a => { answer += `- ${a.title} *(${a.source})*\n`; });
    answer += `\n`;
  });

  if (relevant.length > 8) answer += `*Showing top results. ${relevant.length - 8} more available — try narrowing by company or category.*`;
  return answer;
}

function buildComparisonAnswer(companies, news) {
  let answer = `## \u2696\ufe0f Comparison: ${companies.join(' vs ')}\n\n`;
  const perCompany = companies.map(co => {
    const coNews = news.filter(n => n.company === co);
    const strategic = coNews.filter(n => n.category === 'Strategic Insights').length;
    const risk = coNews.filter(n => RISK_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw))).length;
    const engagement = coNews.filter(n => ENGAGEMENT_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw))).length;
    return { co, coNews, strategic, risk, engagement };
  });

  answer += `| Company | Articles | Strategic | Risk signals | Engagement signals |\n|---|---|---|---|---|\n`;
  perCompany.forEach(p => {
    answer += `| **${p.co}** | ${p.coNews.length} | ${p.strategic} | ${p.risk} | ${p.engagement} |\n`;
  });

  const strongest = [...perCompany].sort((a, b) => b.engagement - a.engagement)[0];
  answer += `\n### Takeaway\n`;
  if (strongest && strongest.engagement > 0) {
    answer += `**${strongest.co}** currently shows the strongest engagement signal (${strongest.engagement} matching articles) \u2014 prioritize outreach there first. `;
  }
  const riskiest = [...perCompany].sort((a, b) => b.risk - a.risk)[0];
  if (riskiest && riskiest.risk > 0) {
    answer += `**${riskiest.co}** has ${riskiest.risk} risk signal${riskiest.risk > 1 ? 's' : ''} \u2014 approach with care and focus on value reinforcement.`;
  }
  return answer;
}

/**
 * "Deep think" mode: combine trend, risk, opportunity and strategy analysis
 * into one multi-step chain of reasoning instead of a single quick answer.
 * Triggered for complex questions (comparisons, "why", "deep dive", etc.).
 */
function buildDeepThinkAnswer(query, news, mentionedCompany) {
  const scoped = mentionedCompany ? news.filter(n => n.company === mentionedCompany) : news;
  const subject = mentionedCompany || 'your portfolio';

  let answer = `## \ud83e\udde0 Deep Think: ${subject}\n\n`;
  answer += `*Working through this in steps rather than a single answer, since it's a complex question.*\n\n`;

  answer += `### 1. Situation\n`;
  answer += `${scoped.length} relevant article${scoped.length === 1 ? '' : 's'} in the current view`;
  answer += mentionedCompany ? ` about **${mentionedCompany}**.\n\n` : ` across your tracked companies.\n\n`;

  const strategic = scoped.filter(n => n.category === 'Strategic Insights');
  const risks = scoped.filter(n => RISK_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw)));
  const engagement = scoped.filter(n => ENGAGEMENT_KEYWORDS.some(kw => ((n.title || '') + (n.description || '')).toLowerCase().includes(kw)));

  answer += `### 2. Analysis\n`;
  answer += `- **Strategic activity:** ${strategic.length} item${strategic.length === 1 ? '' : 's'}${strategic[0] ? ` (e.g. "${strategic[0].title.substring(0, 70)}")` : ''}\n`;
  answer += `- **Risk signals:** ${risks.length}${risks[0] ? ` (e.g. "${risks[0].title.substring(0, 70)}")` : ' \u2014 none detected'}\n`;
  answer += `- **Engagement signals:** ${engagement.length}${engagement[0] ? ` (e.g. "${engagement[0].title.substring(0, 70)}")` : ' \u2014 none detected'}\n\n`;

  answer += `### 3. Implications\n`;
  if (risks.length > strategic.length && risks.length > 0) {
    answer += `The signal mix skews defensive right now. Expect budget scrutiny or internal change \u2014 this is a moment for reassurance and value demonstration, not upsell pressure.\n\n`;
  } else if (strategic.length > 0 || engagement.length > 0) {
    answer += `The signal mix skews toward growth and change \u2014 new initiatives typically mean new stakeholders and new budget conversations, which is a good entry point.\n\n`;
  } else {
    answer += `Signal volume is currently low, so treat this as a stable, low-news period rather than a change in trajectory.\n\n`;
  }

  answer += `### 4. Recommendation\n`;
  if (risks.length > 0 && risks.length >= engagement.length) {
    answer += `1. Lead with relationship maintenance and quick wins, not new asks\n2. Confirm your champion is still in place\n3. Revisit this account again in a week for signal changes`;
  } else if (engagement.length > 0 || strategic.length > 0) {
    answer += `1. Reach out referencing the specific initiative above\n2. Propose a short call tied to their stated direction\n3. Loop in a case study relevant to what they're doing`;
  } else {
    answer += `1. No urgent action needed \u2014 keep this account on a standard check-in cadence\n2. Use the quiet period to prep account plans for when news picks back up`;
  }
  return answer;
}

/**
 * Build a heuristic AI chat answer for the given query and news context.
 * Supports multi-turn conversations: pass the prior turns as `history` so
 * follow-up questions ("what about them?") resolve to the right company,
 * and complex questions automatically get a deeper, multi-step answer.
 * @param {string} query - Raw user query.
 * @param {Array} context - News articles the user currently has in view.
 * @param {Array} history - Prior turns as [{role: 'user'|'bot', content: string}, ...].
 * @returns {string} Markdown-formatted answer.
 */
function generateChatAnswer(query, context, history) {
  if (!query) {
    return 'Hi! I\'m your AlphaFeed assistant. Ask me about any of the 50+ companies I track, market trends, or engagement opportunities.';
  }

  const q = query.toLowerCase();
  const news = context || [];
  let mentionedCompanies = findMentionedCompanies(q);

  // Resolve follow-up questions ("what about them?") using conversation history.
  if (mentionedCompanies.length === 0 && isFollowUpQuery(q)) {
    const prior = lastMentionedCompanyFromHistory(history);
    if (prior) mentionedCompanies = [prior];
  }

  const mentionedCompany = mentionedCompanies[0] || null;
  const { isAboutTrends, isAboutOpportunity, isAboutRisk, isAboutStrategy, isGreeting, isDeepThink } = detectIntent(query);

  if (isGreeting) return buildGreetingAnswer(news);
  if (mentionedCompanies.length >= 2) return buildComparisonAnswer(mentionedCompanies, news);
  if (isDeepThink) return buildDeepThinkAnswer(query, news, mentionedCompany);
  if (mentionedCompany) return buildCompanyAnswer(mentionedCompany, news);
  if (isAboutOpportunity) return buildOpportunityAnswer(news);
  if (isAboutTrends) return buildTrendsAnswer(news);
  if (isAboutRisk) return buildRiskAnswer(news);
  if (isAboutStrategy) return buildStrategyAnswer(news);
  return buildSearchAnswer(query, q, news);
}

module.exports = { generateChatAnswer };
