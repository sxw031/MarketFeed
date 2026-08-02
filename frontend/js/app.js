const API_BASE = window.MarketFeedApi.API_BASE;
const SELECTED_COMPANIES_KEY = 'mf_companies';

let allNews = [];
let totalNewsCount = 0;
let totalNewsPages = 1;
let resultsCapped = false;
let availableCompanies = [];
let selectedCompanies = JSON.parse(localStorage.getItem(SELECTED_COMPANIES_KEY) || '[]');
let activeTimeRange = null;
let activeTimeRangeKey = '24h';
let activeTimeRangeBounds = null;
let currentSort = 'latest'; // 'latest' or 'relevance'
let pollingTimer = null;
let currentPage = 1;
let pageSize = parseInt(localStorage.getItem('mf_pageSize') || '20');
let aiChatHistory = []; // multi-turn AI chat memory: [{role, content}, ...]
let activeNewsRequestId = 0;
let activeNewsAbortController = null;
const TIME_RANGE_WINDOWS = {
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000
};
const TIME_RANGE_ALIASES = {
  '1week': '1w',
  'week': '1w',
  '7d': '1w',
  '1month': '1m',
  'month': '1m',
  '30d': '1m'
};

// A "range key" is either a rolling window (6h/24h/...) or a 4-digit year.
function isYearRangeKey(rangeKey) {
  return /^\d{4}$/.test(rangeKey || '');
}

// Logo URLs - reliable sources for each company
const LOGO_MAP = {
  'HSBC': 'https://img.logo.dev/hsbc.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'DBS': 'https://img.logo.dev/dbs.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Bank of China': 'https://img.logo.dev/boc.cn?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Citigroup': 'https://img.logo.dev/citigroup.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Standard Chartered': 'https://img.logo.dev/sc.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'JPMorgan Chase': 'https://img.logo.dev/jpmorganchase.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Aeon Credit': 'https://img.logo.dev/aeoncredit.com.my?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Binance': 'https://img.logo.dev/binance.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Coinbase': 'https://img.logo.dev/coinbase.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Stripe': 'https://img.logo.dev/stripe.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Apple': 'https://img.logo.dev/apple.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Alphabet (Google)': 'https://img.logo.dev/google.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Microsoft': 'https://img.logo.dev/microsoft.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Amazon': 'https://img.logo.dev/amazon.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Meta': 'https://img.logo.dev/meta.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Nvidia': 'https://img.logo.dev/nvidia.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Samsung': 'https://img.logo.dev/samsung.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'TSMC': 'https://img.logo.dev/tsmc.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'OpenAI': 'https://img.logo.dev/openai.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Anthropic': 'https://img.logo.dev/anthropic.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Databricks': 'https://img.logo.dev/databricks.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'ByteDance': 'https://img.logo.dev/bytedance.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Alibaba': 'https://img.logo.dev/alibaba.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Temu': 'https://img.logo.dev/temu.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Shein': 'https://img.logo.dev/shein.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'ShopBack': 'https://img.logo.dev/shopback.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Walmart': 'https://img.logo.dev/walmart.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Grab': 'https://img.logo.dev/grab.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Didi': 'https://img.logo.dev/didiglobal.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Gojek': 'https://img.logo.dev/gojek.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Cathay Pacific': 'https://img.logo.dev/cathaypacific.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Ctrip': 'https://img.logo.dev/trip.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Vodafone': 'https://img.logo.dev/vodafone.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Singtel': 'https://img.logo.dev/singtel.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'StarHub': 'https://img.logo.dev/starhub.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Netflix': 'https://img.logo.dev/netflix.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Tencent': 'https://img.logo.dev/tencent.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Tesla': 'https://img.logo.dev/tesla.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Helios Energy': 'https://img.logo.dev/heliosenergy.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'CATL (宁德时代)': 'https://img.logo.dev/catl.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'SpaceX': 'https://img.logo.dev/spacex.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'SF Express (顺丰)': 'https://img.logo.dev/sf-express.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Bank of America': 'https://img.logo.dev/bankofamerica.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'PayPal': 'https://img.logo.dev/paypal.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Adobe': 'https://img.logo.dev/adobe.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Palantir': 'https://img.logo.dev/palantir.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'DeepSeek': 'https://img.logo.dev/deepseek.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Moonshot AI': 'https://img.logo.dev/moonshot.cn?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Disney': 'https://img.logo.dev/disney.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Nike': 'https://img.logo.dev/nike.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'Reddit': 'https://img.logo.dev/reddit.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'X (Twitter)': 'https://img.logo.dev/x.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
  'RedNote (Xiaohongshu)': 'https://img.logo.dev/xiaohongshu.com?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ',
};

// Relevance keywords for sorting
const RELEVANCE_KEYWORDS = [
  'messaging', 'sms', 'communication', 'api', 'cpaas', 'cloud', 'digital transformation',
  'customer engagement', 'notification', 'verification', 'otp', 'rcs', 'whatsapp',
  'chatbot', 'omnichannel', 'mobile', 'fintech', 'payment', 'authentication',
  'enterprise', 'saas', 'platform', 'integration', 'partner', 'expansion',
  'acquisition', 'revenue', 'growth', 'strategy', 'market', 'launch'
];

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Default: show last 24 hours
  activeTimeRangeBounds = getTimeRangeBounds(activeTimeRangeKey);
  activeTimeRange = activeTimeRangeBounds.startDate;

  // Set up event listeners immediately so all buttons work before data loads
  setupEventListeners();

  // Theme
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = 'fas fa-sun';
  }

  await loadCompanies();
  await loadNews();
});

// ==================== DATA LOADING ====================
let availableCategories = [];
let activeCategoryFilter = 'all';

async function loadCompanies() {
  try {
    const data = await window.MarketFeedApi.fetchCompanies();
    availableCompanies = data.data;
    availableCategories = data.categories || [];
    renderCategoryTabs();
    renderCompanyGrid();
  } catch (e) { console.error('loadCompanies:', e); }
}

function renderCategoryTabs() {
  const container = document.getElementById('categoryTabs');
  if (!container || !availableCategories.length) return;
  container.innerHTML = availableCategories.map(cat =>
    `<button class="btn-category ${cat.id === activeCategoryFilter ? 'active' : ''}" data-category="${cat.id}">${cat.icon} ${cat.name}</button>`
  ).join('');
  container.querySelectorAll('.btn-category').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategoryFilter = btn.dataset.category;
      container.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCompanyGrid();
    });
  });
}

function getActiveNewsFilters(overrides = {}) {
  activeTimeRangeBounds = getTimeRangeBounds(activeTimeRangeKey);
  const { startDate, endDate } = activeTimeRangeBounds;
  activeTimeRange = startDate;
  const category = document.getElementById('categoryFilter')?.value || '';
  const source = document.getElementById('sourceFilter')?.value || '';
  const search = document.getElementById('searchInput')?.value.trim() || '';
  return {
    startDate,
    endDate,
    category,
    source,
    search,
    companies: selectedCompanies,
    sort: currentSort,
    page: currentPage,
    pageSize,
    ...overrides
  };
}

function shouldShowFullTimeWindow(rangeKey = activeTimeRangeKey) {
  const normalizedRangeKey = TIME_RANGE_ALIASES[rangeKey] || rangeKey;
  return Boolean(TIME_RANGE_WINDOWS[normalizedRangeKey]);
}

async function loadNews(silent = false, options = {}) {
  if (options.resetPage) currentPage = 1;
  if (!silent) showLoading(true);
  const requestId = ++activeNewsRequestId;
  const previousNews = Array.isArray(allNews) ? [...allNews] : [];
  const previousTotalNewsCount = totalNewsCount;
  const previousTotalNewsPages = totalNewsPages;
  const previousResultsCapped = resultsCapped;
  if (activeNewsAbortController) activeNewsAbortController.abort();
  activeNewsAbortController = new AbortController();
  try {
    const useFullTimeWindow = shouldShowFullTimeWindow();
    const data = await window.MarketFeedApi.fetchNewsPage(
      getActiveNewsFilters(useFullTimeWindow ? { page: 1, pageSize: 'all' } : {}),
      { signal: activeNewsAbortController.signal }
    );
    if (requestId !== activeNewsRequestId) return;
    allNews = data.data || [];
    totalNewsCount = data.total || allNews.length;
    totalNewsPages = useFullTimeWindow ? 1 : (data.totalPages || 1);
    currentPage = useFullTimeWindow ? 1 : (data.page || currentPage);
    resultsCapped = useFullTimeWindow && !!data.capped;
    updateResultsSummary(totalNewsCount);
    renderNews();
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error('loadNews:', e);
    if (previousNews.length > 0) {
      allNews = previousNews;
      totalNewsCount = previousTotalNewsCount || previousNews.length;
      totalNewsPages = previousTotalNewsPages || 1;
      resultsCapped = previousResultsCapped;
      updateResultsSummary(totalNewsCount);
      renderNews();
      if (!silent) showToast('Could not refresh the latest news. Showing the previously loaded articles instead.', 'error');
    } else {
      allNews = [];
      totalNewsCount = 0;
      totalNewsPages = 1;
      resultsCapped = false;
      updateResultsSummary(0);
      if (!silent) showEmptyState(true, e.message || 'Unable to reach the server.');
    }
  } finally {
    if (requestId === activeNewsRequestId && !silent) showLoading(false);
  }
}

function getTimeRangeStart(rangeKey) {
  const { startDate } = getTimeRangeBounds(rangeKey);
  return startDate;
}

function getTimeRangeLabel(rangeKey) {
  const labels = {
    '6h': 'last 6 hours',
    '24h': 'last 24 hours',
    '72h': 'last 72 hours',
    '1w': 'last 1 week',
    '1m': 'last 1 month'
  };
  const normalizedRangeKey = TIME_RANGE_ALIASES[rangeKey] || rangeKey;
  if (labels[normalizedRangeKey]) return labels[normalizedRangeKey];
  if (isYearRangeKey(normalizedRangeKey)) return normalizedRangeKey;
  return 'last 24 hours';
}

function getTimeRangeBounds(rangeKey) {
  const normalizedRangeKey = TIME_RANGE_ALIASES[rangeKey] || rangeKey;
  const now = new Date();
  const windowMs = TIME_RANGE_WINDOWS[normalizedRangeKey];
  if (windowMs) {
    return {
      startDate: new Date(Date.now() - windowMs).toISOString(),
      endDate: now.toISOString()
    };
  }

  const year = Number(normalizedRangeKey);
  if (isYearRangeKey(normalizedRangeKey)) {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = year === now.getUTCFullYear()
      ? now
      : new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  return {
    startDate: new Date(Date.now() - TIME_RANGE_WINDOWS['24h']).toISOString(),
    endDate: now.toISOString()
  };
}

function parseArticleDate(input) {
  if (!input) return null;
  let dateStr = String(input).trim();
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr);
  if (!hasExplicitTimezone) {
    dateStr = dateStr.replace(' ', 'T');
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function applyActiveTimeFilter(news, bounds = activeTimeRangeBounds || getTimeRangeBounds(activeTimeRangeKey)) {
  if (!Array.isArray(news) || !activeTimeRangeKey) return news || [];
  const { startDate, endDate } = bounds;
  const startTs = Date.parse(startDate);
  const endTs = Date.parse(endDate);

  return news.filter(article => {
    const d = parseArticleDate(article.publishedAt);
    if (!d) return false;
    const ts = d.getTime();
    return ts >= startTs && ts <= endTs;
  });
}

function updateResultsSummary(totalItems = 0) {
  const summary = document.getElementById('resultsSummary');
  if (!summary) return;
  const itemLabel = totalItems === 1 ? 'article' : 'articles';
  if (resultsCapped) {
    const shownCount = allNews.length;
    summary.textContent = `Showing most recent ${shownCount} of ${totalItems} ${itemLabel} from ${getTimeRangeLabel(activeTimeRangeKey)}. Narrow your filters to see more.`;
  } else if (shouldShowFullTimeWindow()) {
    summary.textContent = `All ${totalItems} ${itemLabel} shown from ${getTimeRangeLabel(activeTimeRangeKey)}.`;
  } else {
    summary.textContent = `Showing ${totalItems} ${itemLabel} from ${getTimeRangeLabel(activeTimeRangeKey)}.`;
  }
}

// ==================== SORTING ====================
function calculateRelevance(article) {
  let score = 0;
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  RELEVANCE_KEYWORDS.forEach(kw => {
    if (text.includes(kw)) score += 2;
  });
  if (article.category === 'Strategic Insights') score += 5;
  // Boost companies with higher engagement relevance
  const highRelevance = ['Grab', 'DBS', 'Vodafone', 'HSBC', 'Standard Chartered', 'Tencent', 'Alibaba'];
  if (highRelevance.includes(article.company)) score += 3;
  return score;
}

function sortAndRender() {
  currentPage = 1;
  loadNews(false);
}

// ==================== AGGREGATION & PROGRESS ====================
// "Sync Latest" pulls fresh articles for every tracked company right now
// (instead of waiting for the automatic background refresh) and streams
// progress into the sync status bar while it runs.
let isSyncing = false;

function setSyncButtonState(syncing) {
  const btn = document.getElementById('refreshBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  const label = btn.querySelector('span');
  btn.disabled = syncing;
  btn.classList.toggle('is-syncing', syncing);
  if (icon) icon.className = syncing ? 'fas fa-sync fa-spin' : 'fas fa-bolt';
  if (label) label.textContent = syncing ? 'Syncing...' : 'Sync Latest';
}

async function triggerAggregation() {
  if (isSyncing) return; // avoid duplicate concurrent syncs from repeat clicks
  isSyncing = true;
  setSyncButtonState(true);
  showSyncBar(true, 'Starting sync...', 0);
  try {
    await window.MarketFeedApi.triggerAggregation();
    startPolling();
  } catch (e) {
    console.error('triggerAggregation:', e);
    showSyncBar(true, 'Sync failed - please try again', 0);
    showToast(e.message || 'Sync failed. Please check your connection and try again.', 'error');
    isSyncing = false;
    setSyncButtonState(false);
    setTimeout(() => showSyncBar(false), 3000);
  }
}

function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    try {
      const data = await window.MarketFeedApi.fetchAggregationStatus();
      if (data.success && data.status.inProgress) {
        const s = data.status;
        const done = s.completedCompanies.length;
        const total = s.totalCompanies || done || 1;
        const pct = Math.round((done / total) * 100);
        showSyncBar(true, `Syncing: ${done}/${total} [${s.currentCompany || '...'}]`, pct);
      } else {
        showSyncBar(true, 'Sync complete!', 100);
        showToast('News feed synced with the latest articles.', 'success');
        setTimeout(() => showSyncBar(false), 2500);
        clearInterval(pollingTimer);
        pollingTimer = null;
        isSyncing = false;
        setSyncButtonState(false);
        await loadNews(false, { resetPage: true });
      }
    } catch (e) {
      console.error('polling:', e);
      clearInterval(pollingTimer);
      pollingTimer = null;
      isSyncing = false;
      setSyncButtonState(false);
      showSyncBar(false);
      showToast('Sync status update failed. Please refresh the feed in a moment.', 'error');
    }
  }, 2500);
}

function showSyncBar(show, text, pct) {
  const bar = document.getElementById('syncStatusBar');
  const textEl = document.getElementById('syncStatusText');
  const progressEl = document.getElementById('syncProgressBar');
  if (bar) bar.style.display = show ? 'block' : 'none';
  if (textEl && text) textEl.textContent = `${text} ${pct !== undefined ? '(' + pct + '%)' : ''}`;
  if (progressEl && pct !== undefined) progressEl.style.width = `${pct}%`;
}

// Lightweight, non-blocking toast so every user action gets clear,
// immediate feedback without an intrusive modal (Nielsen: visibility of
// system status).
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// ==================== RENDERING ====================
// News cards are rendered progressively once a list grows past
// NEWS_VIRTUALIZE_THRESHOLD (e.g. the full-time-window view once the
// tracked company count/article volume grows), instead of mounting
// hundreds of cards to the DOM in one pass. Only an initial batch is
// rendered; more batches are appended as the user scrolls near the
// bottom, via an IntersectionObserver watching a sentinel element.
const NEWS_VIRTUALIZE_THRESHOLD = 60;
const NEWS_RENDER_BATCH_SIZE = 30;
let newsRenderObserver = null;
let newsRenderedCount = 0;

function renderNews() {
  const list = document.getElementById('newsList');
  if (allNews.length === 0) { showEmptyState(true); hidePagination(); return; }
  showEmptyState(false);
  const useFullTimeWindow = shouldShowFullTimeWindow();
  const totalItems = totalNewsCount || allNews.length;
  const totalPages = totalNewsPages || 1;
  const startIdx = totalItems === 0 ? 0 : (useFullTimeWindow ? 1 : (((currentPage - 1) * pageSize) + 1));
  const endIdx = totalItems === 0 ? 0 : (useFullTimeWindow ? allNews.length : Math.min(((currentPage - 1) * pageSize) + allNews.length, totalItems));

  if (newsRenderObserver) { newsRenderObserver.disconnect(); newsRenderObserver = null; }

  if (allNews.length > NEWS_VIRTUALIZE_THRESHOLD) {
    newsRenderedCount = 0;
    list.innerHTML = '';
    renderNewsBatch(list);
  } else {
    newsRenderedCount = allNews.length;
    list.innerHTML = allNews.map(a => createCard(a)).join('');
    bindNewsCardClicks(list);
  }

  if (useFullTimeWindow) hidePagination();
  else renderPagination(totalItems, totalPages, startIdx, endIdx);
  // Scroll to top of news list on page change
  list.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindNewsCardClicks(container) {
  container.querySelectorAll('.news-card:not([data-bound])').forEach(card => {
    card.dataset.bound = '1';
    card.addEventListener('click', () => {
      try {
        showArticleModal(JSON.parse(card.dataset.article));
      } catch (e) {
        console.error('Failed to parse article data:', e);
        showToast('Unable to open this article.', 'error', 3000);
      }
    });
  });
}

// Renders the next NEWS_RENDER_BATCH_SIZE cards, appends a sentinel used to
// trigger the following batch, and removes the previous sentinel.
function renderNewsBatch(list) {
  const nextBatch = allNews.slice(newsRenderedCount, newsRenderedCount + NEWS_RENDER_BATCH_SIZE);
  if (nextBatch.length === 0) return;

  const existingSentinel = list.querySelector('.news-list-sentinel');
  if (existingSentinel) existingSentinel.remove();

  list.insertAdjacentHTML('beforeend', nextBatch.map(a => createCard(a)).join(''));
  bindNewsCardClicks(list);
  newsRenderedCount += nextBatch.length;

  if (newsRenderedCount >= allNews.length) return; // fully rendered, no sentinel needed

  const sentinel = document.createElement('div');
  sentinel.className = 'news-list-sentinel';
  sentinel.style.gridColumn = '1 / -1';
  list.appendChild(sentinel);

  newsRenderObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      newsRenderObserver.disconnect();
      renderNewsBatch(list);
    }
  }, { rootMargin: '400px' });
  newsRenderObserver.observe(sentinel);
}

function renderPagination(totalItems, totalPages, startIdx, endIdx) {
  const container = document.getElementById('paginationContainer');
  const summary = document.getElementById('paginationSummary');
  const pageNumbersEl = document.getElementById('pageNumbers');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  if (totalItems <= pageSize) { container.style.display = 'none'; return; }
  container.style.display = 'flex';

  summary.textContent = `Showing ${startIdx}-${endIdx} of ${totalItems}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;

  // Generate page numbers with ellipsis
  let pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  pageNumbersEl.innerHTML = pages.map(p => {
    if (p === '...') return '<span class="page-ellipsis">...</span>';
    return `<button class="btn-page-num ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }).join('');

  // Update page size buttons
  document.querySelectorAll('.btn-page-size').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size) === pageSize);
  });
}

function hidePagination() {
  const container = document.getElementById('paginationContainer');
  if (container) container.style.display = 'none';
}

function createCard(article) {
  const logo = getLogoUrl(article.company);
  const date = formatRelativeTime(article.publishedAt);
  const isStrategic = article.category === 'Strategic Insights';
  const relevanceScore = calculateRelevance(article);
  const relevanceDot = relevanceScore >= 8 ? '<span class="relevance-dot high" title="High relevance"></span>' :
                       relevanceScore >= 4 ? '<span class="relevance-dot medium" title="Medium relevance"></span>' : '';
  const articleJson = JSON.stringify(article)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `
    <div class="news-card ${isStrategic ? 'strategic' : ''}" data-article='${articleJson}'>
      <div class="news-card-image-container">
        <img src="${logo}" alt="${esc(article.company)}" class="news-card-logo" loading="lazy" data-company="${esc(article.company)}" onerror="handleLogoError(this,this.dataset.company)">
      </div>
      <div class="news-card-content">
        <h3 class="news-card-title">${relevanceDot}${esc(article.title)}</h3>
        <p class="news-card-description">${esc(article.description || '')}</p>
        <div class="news-card-meta">
          <span class="badge badge-company">${esc(article.company)}</span>
          <span class="badge badge-source">${esc(article.source || 'Web')}</span>
          <span class="badge ${isStrategic ? 'badge-strategic' : 'badge-category'}">${esc(article.category || 'General')}</span>
          <span class="news-card-date">${date}</span>
        </div>
      </div>
    </div>`;
}

let articleModalToken = 0;

function showArticleModal(article) {
  const modal = document.getElementById('articleModal');
  const logo = getLogoUrl(article.company);
  const fallbackSummary = article.description || 'No summary available for this article yet.';
  const token = ++articleModalToken;
  renderArticleModalContent({
    logo,
    article,
    quickSummary: fallbackSummary,
    articlePreview: 'Loading readable preview...'
  });
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  loadArticlePreview(article)
    .then(preview => {
      if (token !== articleModalToken || modal.style.display === 'none') return; // modal closed or replaced before preview loaded
      renderArticleModalContent({
        logo,
        article,
        quickSummary: preview.summary || fallbackSummary,
        articlePreview: preview.preview || fallbackSummary
      });
    })
    .catch(() => {
      if (token !== articleModalToken || modal.style.display === 'none') return;
      renderArticleModalContent({
        logo,
        article,
        quickSummary: fallbackSummary,
        articlePreview: fallbackSummary
      });
    });
}

function renderArticleModalContent({ logo, article, quickSummary, articlePreview }) {
  const body = document.getElementById('modalBody');
  const summaryText = (quickSummary || '').trim();
  const previewText = (articlePreview || '').trim() || summaryText || 'No article text available.';
  const previewParagraphs = previewText
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map(p => `<p style="margin-bottom:0.8rem;line-height:1.75;color:var(--text-main);">${esc(p)}</p>`)
    .join('');

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;background:var(--bg-secondary);padding:1.5rem;border-radius:12px;">
      <img src="${logo}" alt="${esc(article.company)}" style="max-width:140px;height:70px;object-fit:contain;" data-company="${esc(article.company)}" onerror="handleLogoError(this,this.dataset.company)">
    </div>
    <h2 style="font-size:1.4rem;margin-bottom:0.75rem;font-weight:800;line-height:1.3;">${esc(article.title)}</h2>
    <div class="news-card-meta" style="margin-bottom:1.25rem;">
      <span class="badge badge-company">${esc(article.company)}</span>
      <span class="badge badge-source">${esc(article.source || 'Web')}</span>
      <span class="badge badge-category">${esc(article.category || 'General')}</span>
      <span class="news-card-date">${formatRelativeTime(article.publishedAt)}</span>
    </div>
    <div style="margin-bottom:1rem;padding:1rem;border-radius:12px;background:var(--bg-secondary);">
      <h3 style="font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.6rem;">Quick Summary</h3>
      <p style="font-size:1rem;line-height:1.7;color:var(--text-main);margin:0;">${esc(summaryText || 'No summary available')}</p>
    </div>
    <div style="margin-bottom:1.5rem;">
      <h3 style="font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.6rem;">Article Preview</h3>
      <div>${previewParagraphs || '<p style="line-height:1.7;color:var(--text-main);">No article preview available.</p>'}</div>
    </div>
    <div style="display:flex;justify-content:center;">
      <a href="${sanitizeUrl(article.url)}" target="_blank" rel="noopener" class="btn-source-link">
        View Original Source <i class="fas fa-external-link-alt"></i>
      </a>
    </div>`;
}

async function loadArticlePreview(article) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const data = await window.MarketFeedApi.fetchArticlePreview(article.id || '', { signal: controller.signal });
    return data.data || {};
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== YEARLY SUMMARY ====================
async function showYearlySummary(year) {
  const modal = document.getElementById('yearlySummaryModal');
  const title = document.getElementById('yearlySummaryTitle');
  const content = document.getElementById('yearlySummaryContent');

  title.textContent = year === 2026 ? `2026 Year-to-Date (as of ${new Date().toLocaleDateString('en-US', {month:'short', day:'numeric'})})` : `${year} Major Events Summary`;
  content.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="spinner"></div><p>Loading summary...</p></div>';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  try {
    const data = await window.MarketFeedApi.fetchYearlySummary(year);
    content.innerHTML = renderYearlySummary(data.data, year);
  } catch (e) {
    content.innerHTML = '<p style="text-align:center;padding:2rem;">Error loading summary.</p>';
  }
}

function renderYearlySummary(companies, year) {
  let html = `<div class="yearly-summary">`;
  const dateLabel = companies[0]?.dateLabel || `Full Year ${year}`;
  html += `<div class="yearly-header"><h2>${year} Strategic Events</h2>
    <p>${dateLabel} | ${companies.length} tracked accounts</p></div>`;

  companies.forEach(c => {
    const relevanceClass = c.relevance === 'High' ? 'relevance-high' : c.relevance === 'Medium' ? 'relevance-medium' : 'relevance-low';
    const logo = getLogoUrl(c.company);
    html += `
      <div class="yearly-company-card">
        <div class="yearly-company-header">
          <img src="${logo}" alt="${esc(c.company)}" class="yearly-logo" data-company="${esc(c.company)}" onerror="handleLogoError(this,this.dataset.company)">
          <div>
            <h3>${esc(c.company)}</h3>
            <span class="badge ${relevanceClass}">Relevance: ${c.relevance}</span>
          </div>
        </div>
        <ul class="yearly-highlights">
          ${c.highlights.map(h => `<li>${esc(h)}</li>`).join('')}
        </ul>
      </div>`;
  });

  html += `</div>`;
  return html;
}

function bindEventById(id, eventName, handler) {
  const el = document.getElementById(id);
  if (!el) return null;
  el.addEventListener(eventName, handler);
  return el;
}

function setModalOpen(modalEl, isOpen) {
  if (!modalEl) return;
  modalEl.style.display = isOpen ? 'flex' : 'none';
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  const debouncedSearch = window.MarketFeedApi.debounce(() => loadNews(false, { resetPage: true }), 350);

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navRight = document.getElementById('navRight');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      if (!navRight) return;
      navRight.classList.toggle('mobile-open');
      const icon = mobileToggle.querySelector('i');
      if (icon) icon.className = navRight.classList.contains('mobile-open') ? 'fas fa-times' : 'fas fa-bars';
    });
  }

  // Sync latest news
  bindEventById('refreshBtn', 'click', () => triggerAggregation());
  bindEventById('emptyStateRetryBtn', 'click', () => loadNews(false, { resetPage: true }));

  // Filters - auto apply on change
  bindEventById('categoryFilter', 'change', () => loadNews(false, { resetPage: true }));
  bindEventById('sourceFilter', 'change', () => loadNews(false, { resetPage: true }));
  bindEventById('searchInput', 'input', () => debouncedSearch());
  bindEventById('searchInput', 'keypress', (e) => { if (e.key === 'Enter') loadNews(false, { resetPage: true }); });

  // Sort buttons
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      sortAndRender();
    });
  });

  // Time range buttons (6h/24h/72h/1w/1m) and yearly buttons (2023-2026)
  document.querySelectorAll('.btn-quick-time').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      const isYear = isYearRangeKey(range);
      const normalizedRange = TIME_RANGE_ALIASES[range] || range;
      const isKnownRange = Boolean(TIME_RANGE_WINDOWS[normalizedRange]) || isYear;
      activeTimeRangeKey = isKnownRange ? normalizedRange : '24h';
      document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTimeRangeBounds = getTimeRangeBounds(activeTimeRangeKey);
      activeTimeRange = activeTimeRangeBounds.startDate;
      loadNews(false, { resetPage: true });
      // Yearly buttons also restore the Major Events report for that year
      if (isYear) showYearlySummary(Number(range));
    });
  });

  // Clear filters
  bindEventById('resetBtn', 'click', () => {
    const categoryFilter = document.getElementById('categoryFilter');
    const sourceFilter = document.getElementById('sourceFilter');
    const searchInput = document.getElementById('searchInput');
    const companySearchInput = document.getElementById('companySearchInput');
    if (categoryFilter) categoryFilter.value = '';
    if (sourceFilter) sourceFilter.value = '';
    if (searchInput) searchInput.value = '';
    if (companySearchInput) companySearchInput.value = '';
    companySearchQuery = '';
    document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
    const btn24h = document.querySelector('.btn-quick-time[data-range="24h"]');
    if (btn24h) btn24h.classList.add('active');
    selectedCompanies = [];
    activeTimeRangeKey = '24h';
    activeTimeRangeBounds = getTimeRangeBounds(activeTimeRangeKey);
    activeTimeRange = activeTimeRangeBounds.startDate;
    currentSort = 'latest';
    document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
    const latestBtn = document.querySelector('.btn-sort[data-sort="latest"]');
    if (latestBtn) latestBtn.classList.add('active');
    localStorage.removeItem(SELECTED_COMPANIES_KEY);
    renderCompanyGrid();
    loadNews(false, { resetPage: true });
    showToast('Filters cleared.', 'info', 2000);
  });

  // Logo is a static brand mark (non-interactive) — no click handler.

  // Company selector
  const selectorModal = document.getElementById('companySelectorModal');
  bindEventById('openCompanySelector', 'click', () => {
    setModalOpen(selectorModal, true);
  });
  bindEventById('closeSelector', 'click', () => {
    setModalOpen(selectorModal, false);
  });
  bindEventById('applySelectorBtn', 'click', () => {
    localStorage.setItem(SELECTED_COMPANIES_KEY, JSON.stringify(selectedCompanies));
    setModalOpen(selectorModal, false);
    updateSelectionLabel();
    loadNews(false, { resetPage: true });
  });
  bindEventById('selectAllBtn', 'click', () => {
    document.querySelectorAll('.company-item').forEach(el => {
      el.classList.add('selected');
      selectedCompanies = [...new Set([...selectedCompanies, el.dataset.company])];
    });
  });
  bindEventById('deselectAllBtn', 'click', () => {
    const visibleNames = new Set(Array.from(document.querySelectorAll('.company-item')).map(el => el.dataset.company));
    document.querySelectorAll('.company-item').forEach(el => el.classList.remove('selected'));
    selectedCompanies = selectedCompanies.filter(name => !visibleNames.has(name));
  });
  bindEventById('companySearchInput', 'input', window.MarketFeedApi.debounce(() => {
    companySearchQuery = document.getElementById('companySearchInput')?.value || '';
    renderCompanyGrid();
  }, 200));

  // ==================== PODCAST ====================
  const podcastBtn = document.getElementById('podcastBtn');
  const podcastPlayer = document.getElementById('podcastPlayer');
  // Internal function to actually generate the podcast
  async function generatePodcast() {
    try {
      podcastBtn.classList.add('loading');
      podcastBtn.querySelector('span').textContent = 'Generating (~20s)...';
      podcastBtn.disabled = true;

      const res = await fetch(`${API_BASE}/podcast`, {
        method: 'GET',
        headers: { 'Accept': 'audio/mpeg, application/json' }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('audio')) {
        const blob = await res.blob();
        if (blob.size < 1000) throw new Error('Audio file too small - generation may have failed');
        if (podcastPlayer.src && podcastPlayer.src.startsWith('blob:')) URL.revokeObjectURL(podcastPlayer.src);
        podcastPlayer.src = URL.createObjectURL(blob);
        await podcastPlayer.play();
        podcastBtn.classList.remove('loading');
        podcastBtn.classList.add('playing');
        podcastBtn.querySelector('span').textContent = 'Playing...';
        podcastBtn.disabled = false;
        podcastPlayer.onended = () => {
          podcastBtn.classList.remove('playing');
          podcastBtn.querySelector('span').textContent = 'Daily Podcast';
        };
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Unexpected response format');
      }
    } catch (e) {
      console.error('Podcast error:', e);
      podcastBtn.classList.remove('loading');
      podcastBtn.querySelector('span').textContent = 'Daily Podcast';
      podcastBtn.disabled = false;
      showToast(`Podcast generation failed: ${e.message}. TTS may be unavailable on the server.`, 'error', 5000);
    }
  }

  if (podcastBtn && podcastPlayer) {
    podcastBtn.addEventListener('click', async () => {
      // If already playing, pause
      if (podcastBtn.classList.contains('playing')) {
        podcastPlayer.pause();
        podcastBtn.classList.remove('playing');
        podcastBtn.querySelector('span').textContent = 'Daily Podcast';
        return;
      }
      // Show speed picker - user selects speed, then we generate
      const podcastSpeedPickerEl = document.getElementById('podcastSpeedPicker');
      if (podcastSpeedPickerEl && podcastSpeedPickerEl.style.display !== 'flex') {
        podcastSpeedPickerEl.style.display = 'flex';
        // Wait for speed selection or auto-generate after a timeout
        const waitForSelection = new Promise(resolve => {
          const btns = podcastSpeedPickerEl.querySelectorAll('.btn-speed[data-speed]');
          const handler = () => { resolve(); btns.forEach(b => b.removeEventListener('click', handler)); };
          btns.forEach(b => b.addEventListener('click', handler, { once: true }));
          // Auto-generate at normal speed after 5 seconds if no selection
          setTimeout(() => { podcastSpeedPickerEl.style.display = 'none'; resolve(); }, 5000);
        });
        await waitForSelection;
      }
      await generatePodcast();
    });
  }

  // ==================== PODCAST SPEED CONTROLS ====================
  const podcastControls = document.getElementById('podcastControls');
  const podcastSpeedPicker = document.getElementById('podcastSpeedPicker');
  const speedBtns = document.querySelectorAll('#podcastSpeedPicker .btn-speed[data-speed]');
  const stopBtn = document.getElementById('stopPodcast');
  let selectedPodcastSpeed = 1; // default normal speed

  function showPodcastControls() {
    if (podcastControls) podcastControls.style.display = 'flex';
  }
  function hidePodcastControls() {
    if (podcastControls) podcastControls.style.display = 'none';
  }
  function showSpeedPicker() {
    if (podcastSpeedPicker) podcastSpeedPicker.style.display = 'flex';
  }
  function hideSpeedPicker() {
    if (podcastSpeedPicker) podcastSpeedPicker.style.display = 'none';
  }

  // Speed picker: when user clicks a speed, store it, hide picker, and start generating
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPodcastSpeed = parseFloat(btn.dataset.speed);
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hideSpeedPicker();
      // Apply speed to player
      if (podcastPlayer) podcastPlayer.playbackRate = selectedPodcastSpeed;
    });
  });

  if (stopBtn && podcastBtn && podcastPlayer) {
    stopBtn.addEventListener('click', () => {
      podcastPlayer.pause();
      podcastPlayer.currentTime = 0;
      podcastBtn.classList.remove('playing');
      podcastBtn.querySelector('span').textContent = 'Daily Podcast';
      hidePodcastControls();
    });
  }

  // Show stop control when playing, hide when ended
  if (podcastPlayer) {
    podcastPlayer.addEventListener('play', () => {
      showPodcastControls();
      podcastPlayer.playbackRate = selectedPodcastSpeed;
    });
    podcastPlayer.addEventListener('ended', () => {
      hidePodcastControls();
    });
  }

  // ==================== MARKET INTELLIGENCE REPORT ====================
  const reportModal = document.getElementById('reportModal');
  // Report dropdown toggle
  const reportDropdown = document.getElementById('reportDropdownMenu');
  bindEventById('generateReportBtn', 'click', (e) => {
    e.stopPropagation();
    reportDropdown?.classList.toggle('show');
  });
  // Close dropdown when clicking outside
  document.addEventListener('click', () => reportDropdown?.classList.remove('show'));
  reportDropdown?.addEventListener('click', (e) => e.stopPropagation());

  // Handle period selection
  document.querySelectorAll('.report-period-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const period = btn.dataset.period;
      reportDropdown?.classList.remove('show');
      generateMarketIntelligenceReport(period);
    });
  });

  async function fetchFilteredNewsContext(limit = 50) {
    const data = await window.MarketFeedApi.fetchNewsPage({
      ...getActiveNewsFilters({ page: 1, pageSize: limit }),
      page: 1,
      pageSize: limit
    });
    return data.data || [];
  }

  async function generateMarketIntelligenceReport(period = 'daily') {
    const periodLabels = { daily: 'Daily Briefing', weekly: 'Weekly Review', monthly: 'Monthly Assessment', quarterly: 'Quarterly Intelligence' };
    setModalOpen(reportModal, true);
    const content = document.getElementById('reportContent');
    content.innerHTML = `<div class="report-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;"><div class="spinner"></div><p>Generating ${periodLabels[period] || 'Market Intelligence report'}...</p></div>`;
    try {
      // For daily, send current news; for longer periods, backend fetches from DB
      const payload = { period };
      if (period === 'daily') {
        const reportContext = await fetchFilteredNewsContext(50);
        const newsForReport = reportContext.filter(n => n.category === 'Strategic Insights').slice(0, 20);
        payload.news = newsForReport.length > 0 ? newsForReport : reportContext.slice(0, 15);
      }
      const res = await fetch('/api/news/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        content.innerHTML = renderMarkdown(data.report);
      } else {
        content.innerHTML = '<p style="text-align:center;padding:2rem;">Failed to generate report.</p>';
      }
    } catch (e) {
      content.innerHTML = '<p style="text-align:center;padding:2rem;">Error generating report. Please try again.</p>';
    }
  }
  bindEventById('closeReportModal', 'click', () => setModalOpen(reportModal, false));

  // Listen to report button
  bindEventById('listenReportBtn', 'click', async function() {
    const btn = this;
    const icon = btn.querySelector('i');
    const reportText = document.getElementById('reportContent').innerText;
    if (!reportText || reportText.includes('Generating')) { showToast('Please generate a report first.', 'info'); return; }

    if (btn.classList.contains('playing')) {
      const audio = document.getElementById('reportAudioPlayer');
      if (audio) audio.pause();
      btn.classList.remove('playing');
      if (icon) icon.className = 'fas fa-headphones';
      btn.title = 'Listen to report';
      return;
    }

    if (icon) icon.className = 'fas fa-spinner fa-spin';
    btn.title = 'Synthesizing report audio...';
    btn.disabled = true;
    try {
      const res = await fetch('/api/news/report-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reportText.substring(0, 2000) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('audio')) {
        const blob = await res.blob();
        let audio = document.getElementById('reportAudioPlayer');
        if (!audio) { audio = document.createElement('audio'); audio.id = 'reportAudioPlayer'; document.body.appendChild(audio); }
        if (audio.src && audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
        audio.src = URL.createObjectURL(blob);
        await audio.play();
        btn.classList.add('playing');
        if (icon) icon.className = 'fas fa-volume-up';
        btn.title = 'Playing report audio';
        btn.disabled = false;
        audio.onended = () => {
          btn.classList.remove('playing');
          if (icon) icon.className = 'fas fa-headphones';
          btn.title = 'Listen to report';
        };
      } else {
        throw new Error('TTS not available');
      }
    } catch (e) {
      showToast('Report audio: ' + e.message, 'error', 5000);
      if (icon) icon.className = 'fas fa-headphones';
      btn.title = 'Listen to report';
      btn.disabled = false;
    }
  });

  // Download report
  bindEventById('downloadReportBtn', 'click', () => {
    const text = document.getElementById('reportContent').innerText;
    if (!text || text.includes('Generating')) { showToast('Please generate a report first.', 'info'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `MarketRadar_Report_${new Date().toISOString().split('T')[0]}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // Yearly Summary Modal close
  bindEventById('closeYearlyModal', 'click', () => setModalOpen(document.getElementById('yearlySummaryModal'), false));

  // ==================== AI CHAT ====================
  const chatWindow = document.getElementById('aiChatWindow');
  bindEventById('aiChatToggle', 'click', () => {
    if (!chatWindow) return;
    chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
  });
  bindEventById('closeAiChat', 'click', () => { if (chatWindow) chatWindow.style.display = 'none'; });

  async function handleChat() {
    const input = document.getElementById('aiChatInput');
    const q = input.value.trim();
    if (!q) return;
    appendChat('user', esc(q));
    input.value = '';
    aiChatHistory.push({ role: 'user', content: q });
    const botMsg = appendChat('bot', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
    try {
      const res = await fetch('/api/news/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, context: await fetchFilteredNewsContext(50), history: aiChatHistory.slice(0, -1) })
      });
      const data = await res.json();
      const answer = data.success === false ? (data.error || 'AI service is unavailable right now.') : (data.answer || 'No answer available.');
      botMsg.innerHTML = renderMarkdown(answer).replace('<div class="report-body">', '<div>');
      aiChatHistory.push({ role: 'bot', content: answer });
      if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
    } catch (e) {
      botMsg.textContent = 'Connection error. Please try again.';
    }
  }
  bindEventById('sendAiMessage', 'click', handleChat);
  bindEventById('aiChatInput', 'keypress', (e) => { if (e.key === 'Enter') handleChat(); });

  // Theme toggle
  bindEventById('themeToggle', 'click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) themeIcon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });

  // ==================== PAGINATION ====================
  bindEventById('prevPage', 'click', () => {
    if (currentPage > 1) { currentPage--; loadNews(false); }
  });
  bindEventById('nextPage', 'click', () => {
    if (currentPage < totalNewsPages) { currentPage++; loadNews(false); }
  });
  bindEventById('pageNumbers', 'click', (e) => {
    const btn = e.target.closest('.btn-page-num');
    if (btn) { currentPage = parseInt(btn.dataset.page); loadNews(false); }
  });
  document.querySelectorAll('.btn-page-size').forEach(btn => {
    btn.addEventListener('click', () => {
      pageSize = parseInt(btn.dataset.size);
      localStorage.setItem('mf_pageSize', pageSize);
      currentPage = 1;
      loadNews(false);
    });
  });

  // Modal close handlers
  const articleModal = document.getElementById('articleModal');
  bindEventById('closeModal', 'click', () => setModalOpen(articleModal, false));
  window.addEventListener('click', (e) => {
    [selectorModal, articleModal, reportModal, document.getElementById('yearlySummaryModal'), document.getElementById('subscribeModal')].forEach(m => {
      if (e.target === m) setModalOpen(m, false);
    });
  });
}

// ==================== HELPERS ====================
function getLogoUrl(name) {
  return LOGO_MAP[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

// Derived once from LOGO_MAP so every company automatically gets a Google
// favicon fallback without hand-maintaining a second, easily-out-of-sync list.
const LOGO_DOMAIN_MAP = Object.fromEntries(
  Object.entries(LOGO_MAP)
    .map(([name, url]) => {
      const match = url.match(/img\.logo\.dev\/([^?]+)/);
      return match ? [name, match[1]] : null;
    })
    .filter(Boolean)
);

window.handleLogoError = function(img, name) {
  // Fallback chain: logo.dev -> Google favicons -> UI Avatars
  if (img.src.includes('logo.dev')) {
    const domain = LOGO_DOMAIN_MAP[name];
    if (domain) { img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`; return; }
  }
  if (!img.src.includes('ui-avatars')) {
    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
  }
};

let companySearchQuery = '';

function renderCompanyGrid() {
  const container = document.getElementById('companyFilters');
  if (!container) return;
  container.innerHTML = '';
  const query = companySearchQuery.trim().toLowerCase();
  const filtered = availableCompanies
    .filter(c => activeCategoryFilter === 'all' || c.category === activeCategoryFilter)
    .filter(c => !query || c.name.toLowerCase().includes(query));
  filtered.forEach(c => {
    const el = document.createElement('div');
    el.className = `company-item ${selectedCompanies.includes(c.name) ? 'selected' : ''}`;
    el.dataset.company = c.name;
    el.innerHTML = `<img src="${getLogoUrl(c.name)}" alt="${esc(c.name)}" loading="lazy" data-company="${esc(c.name)}" onerror="handleLogoError(this,this.dataset.company)"><span>${esc(c.name)}</span>`;
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
      const isSelected = el.classList.contains('selected');
      selectedCompanies = isSelected
        ? [...new Set([...selectedCompanies, c.name])]
        : selectedCompanies.filter(name => name !== c.name);
    });
    container.appendChild(el);
  });
  const countLabel = document.getElementById('companyCountLabel');
  if (countLabel) countLabel.textContent = `${filtered.length} companies`;
  updateSelectionLabel();
}

function updateSelectionLabel() {
  const label = document.getElementById('selectedCountLabel');
  if (selectedCompanies.length === 0) label.textContent = 'All Companies';
  else label.textContent = `${selectedCompanies.length} Selected`;
}

function appendChat(role, text) {
  const container = document.getElementById('aiChatMessages');
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  div.innerHTML = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function renderMarkdown(md) {
  if (!md) return '';
  
  // Process tables first
  const lines = md.split('\n');
  const processed = [];
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) { inTable = true; tableRows = []; }
      // Skip separator rows (|---|---|)
      if (line.match(/^\|[\s\-:|]+\|$/)) continue;
      tableRows.push(line);
    } else {
      if (inTable) {
        processed.push(buildTable(tableRows));
        inTable = false;
        tableRows = [];
      }
      processed.push(line);
    }
  }
  if (inTable && tableRows.length) {
    processed.push(buildTable(tableRows));
  }
  
  function buildTable(rows) {
    if (rows.length === 0) return '';
    const headers = rows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
    const colCount = headers.length;
    const dataRows = rows.slice(1);
    
    function fmt(text) {
      return esc(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // 2-column key-value → card list
    if (colCount === 2 && dataRows.length > 0) {
      let html = '<div class="report-card">';
      dataRows.forEach(row => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        const key = fmt((cells[0] || '').trim());
        const val = fmt((cells[1] || '').trim());
        html += `<div class="report-kv"><span class="report-kv-key">${key}</span><span class="report-kv-val">${val}</span></div>`;
      });
      html += '</div>';
      return html;
    }

    // 1-column → callout card
    if (colCount === 1) {
      let html = '<div class="report-callout">';
      if (headers[0]) html += `<div class="report-callout-title">${fmt(headers[0])}</div>`;
      dataRows.forEach(row => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        const val = fmt((cells[0] || '').trim());
        if (val) html += `<div class="report-callout-body">${val}</div>`;
      });
      html += '</div>';
      return html;
    }

    // Multi-column → data cards (no table borders)
    let html = '<div class="report-data-grid">';
    // Header as labels reference
    dataRows.forEach((row, rIdx) => {
      const cells = row.split('|').filter(c => c.trim() !== '');
      while (cells.length < colCount) cells.push('');
      html += `<div class="report-data-row">`;
      cells.forEach((cell, cIdx) => {
        const label = headers[cIdx] || '';
        const val = fmt(cell.trim());
        html += `<div class="report-data-cell"><span class="report-data-label">${fmt(label)}</span><span class="report-data-value">${val}</span></div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    return html;
  }
  
  // Process non-table lines only for markdown formatting
  let html = processed.map(line => {
    // Skip lines that are already HTML (tables)
    if (line.startsWith('<div class="report-')) return line;

    // Escape any raw HTML in the source text before applying markdown
    // transformations below, so injected tags (e.g. from a reflected user
    // query or article content) can never execute as HTML/script.
    line = esc(line);

    // Headings
    line = line.replace(/^### (.*$)/gim, '<h3 class="report-h3">$1</h3>');
    line = line.replace(/^## (.*$)/gim, '<h2 class="report-h2">$1</h2>');
    line = line.replace(/^# (.*$)/gim, '<h1 class="report-h1">$1</h1>');
    // Blockquotes
    line = line.replace(/^\> (.*$)/gim, '<blockquote class="report-quote">$1</blockquote>');
    // Inline formatting
    line = line.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Dividers
    line = line.replace(/^---$/gim, '<hr class="report-divider">');
    // List items
    line = line.replace(/^[\*\-] (.*$)/gim, '<li>$1</li>');
    // Images and links — validate URL scheme to prevent javascript: URI injection
    line = line.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => `<img src="${sanitizeUrl(url)}" alt="${alt}" class="report-img">`);
    line = line.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer" class="report-link">${text}</a>`);
    return line;
  }).join('\n');
  
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Paragraphs - but protect table blocks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  // Clean up: remove <br> and <p> wrapping around card components
  html = html.replace(/<br><div class="report-/g, '<div class="report-');
  html = html.replace(/<\/div><br>/g, '</div>');
  html = html.replace(/<p><div class="report-/g, '<div class="report-');
  html = html.replace(/<\/div><\/p>/g, '</div>');
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br><\/p>/g, '');
  
  return `<div class="report-body">${html}</div>`;
}

function showLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  document.getElementById('newsList').style.opacity = show ? '0.4' : '1';
}

function hasActiveFilters() {
  const category = document.getElementById('categoryFilter')?.value || '';
  const source = document.getElementById('sourceFilter')?.value || '';
  const search = document.getElementById('searchInput')?.value.trim() || '';
  return Boolean(category || source || search || (selectedCompanies && selectedCompanies.length > 0) || (activeTimeRangeKey && activeTimeRangeKey !== '24h'));
}

function showEmptyState(show, errorMessage) {
  const emptyState = document.getElementById('emptyState');
  emptyState.style.display = show ? 'block' : 'none';
  if (show) {
    document.getElementById('newsList').innerHTML = '';
    const icon = document.getElementById('emptyStateIcon');
    const title = document.getElementById('emptyStateTitle');
    const message = document.getElementById('emptyStateMessage');
    const retryBtn = document.getElementById('emptyStateRetryBtn');
    if (title && message) {
      if (errorMessage) {
        if (icon) icon.textContent = '⚠️';
        title.textContent = 'Could not load the feed';
        message.textContent = `Error: ${errorMessage}`;
      } else if (hasActiveFilters()) {
        if (icon) icon.textContent = '📡';
        title.textContent = 'No matching articles';
        message.textContent = 'No news matches your current filters. Try widening the time range or clearing some filters.';
      } else {
        if (icon) icon.textContent = '📡';
        title.textContent = 'Initializing Feed...';
        message.textContent = "We're currently aggregating the latest news for your selected companies.";
      }
    }
    if (retryBtn) retryBtn.style.display = errorMessage ? 'inline-flex' : 'none';
  }
}

function formatRelativeTime(str) {
  if (!str) return 'Date unknown';
  let dateStr = String(str).trim();
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr);
  if (!hasExplicitTimezone) {
    dateStr = dateStr.replace(' ', 'T');
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Date unknown';

  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 0) return 'Just now';
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// Only allow http/https URLs in dynamically-rendered links/images. This blocks
// javascript:, data:, and other URI schemes that could otherwise execute
// arbitrary script when injected via markdown content (e.g. AI chat/report output).
// Note: the caller has already HTML-escaped the surrounding line, so this only
// needs to validate the scheme — it must not re-escape (that would double-encode).
function sanitizeUrl(url) {
  const trimmed = String(url || '').trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : '#';
}

// ==================== EMAIL SUBSCRIPTION ====================
(function initSubscription() {
  const subscribeBtn = document.getElementById('subscribeBtn');
  const modal = document.getElementById('subscribeModal');
  const closeBtn = document.getElementById('closeSubscribeModal');
  const submitBtn = document.getElementById('submitSubscription');
  const statusDiv = document.getElementById('subStatus');
  let subFrequency = 'daily';
  let subCompanies = [];

  if (!subscribeBtn || !modal) return;

  subscribeBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    renderSubCompanyGrid();
  });

  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  // Frequency buttons
  modal.querySelectorAll('.btn-freq').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.btn-freq').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      subFrequency = btn.dataset.freq;
    });
  });

  function renderSubCompanyGrid() {
    const grid = document.getElementById('subCompanyGrid');
    if (!grid) return;
    grid.innerHTML = availableCompanies.map(c =>
      `<div class="sub-company-chip ${subCompanies.includes(c.name) ? 'selected' : ''}" data-name="${c.name}">
        <img src="${getLogoUrl(c.name)}" alt="" onerror="this.style.display='none'">
        <span>${c.name}</span>
      </div>`
    ).join('');
    grid.querySelectorAll('.sub-company-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        const name = chip.dataset.name;
        if (chip.classList.contains('selected')) {
          if (!subCompanies.includes(name)) subCompanies.push(name);
        } else {
          subCompanies = subCompanies.filter(n => n !== name);
        }
      });
    });
  }

  submitBtn.addEventListener('click', async () => {
    const email = document.getElementById('subEmail').value.trim();
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showSubStatus('Please enter a valid email address.', 'error');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
    try {
      const res = await fetch(`${API_BASE.replace('/news', '')}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companies: subCompanies, frequency: subFrequency })
      });
      const data = await res.json();
      if (data.success) {
        showSubStatus(`Subscribed! You'll receive ${subFrequency} digests at ${email}.`, 'success');
        setTimeout(() => modal.style.display = 'none', 3000);
      } else {
        showSubStatus(data.error || 'Subscription failed.', 'error');
      }
    } catch (e) {
      showSubStatus('Network error. Please try again.', 'error');
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Subscribe';
  });

  function showSubStatus(msg, type) {
    statusDiv.style.display = 'block';
    statusDiv.className = `sub-status ${type}`;
    statusDiv.textContent = msg;
    setTimeout(() => statusDiv.style.display = 'none', 5000);
  }
})();

// ==================== IPO TRACKER ====================
(function initIPOTracker() {
  const ipoSection = document.getElementById('ipoSection');
  const ipoList = document.getElementById('ipoList');
  const ipoStats = document.getElementById('ipoStats');
  const tabNews = document.getElementById('tabNewsFeed');
  const tabIPO = document.getElementById('tabIPO');
  const mainContent = document.querySelector('.main-content');
  const filterBar = document.querySelector('.filter-bar');

  if (!tabIPO || !ipoSection) return;

  let ipoWindow = '6months';
  let ipoStatus = 'all';

  // Tab switching
  tabNews.addEventListener('click', () => {
    tabNews.classList.add('active');
    tabIPO.classList.remove('active');
    mainContent.style.display = '';
    filterBar.style.display = '';
    ipoSection.style.display = 'none';
  });

  tabIPO.addEventListener('click', () => {
    tabIPO.classList.add('active');
    tabNews.classList.remove('active');
    mainContent.style.display = 'none';
    filterBar.style.display = 'none';
    ipoSection.style.display = 'block';
    loadIPOData();
  });

  // Time window filters
  ipoSection.querySelectorAll('.btn-ipo-time').forEach(btn => {
    btn.addEventListener('click', () => {
      ipoSection.querySelectorAll('.btn-ipo-time').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ipoWindow = btn.dataset.window;
      loadIPOData();
    });
  });

  // Status filters
  ipoSection.querySelectorAll('.btn-ipo-status').forEach(btn => {
    btn.addEventListener('click', () => {
      ipoSection.querySelectorAll('.btn-ipo-status').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ipoStatus = btn.dataset.status;
      loadIPOData();
    });
  });

  async function loadIPOData() {
    ipoList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading IPO data...</p></div>';
    try {
      const res = await fetch(`${API_BASE.replace('/news', '')}/ipo?window=${ipoWindow}&status=${ipoStatus}`);
      const data = await res.json();
      if (data.success) {
        renderIPOStats(data.stats);
        renderIPOList(data.data);
      }
    } catch (e) {
      ipoList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Failed to load IPO data.</p>';
    }
  }

  function renderIPOStats(stats) {
    ipoStats.innerHTML = `
      <div class="ipo-stat-cards">
        <div class="ipo-stat-card"><div class="stat-number">${stats.total}</div><div class="stat-label">Total Tracked</div></div>
        <div class="ipo-stat-card filed"><div class="stat-number">${stats.filed}</div><div class="stat-label">Filed</div></div>
        <div class="ipo-stat-card preparing"><div class="stat-number">${stats.preparing}</div><div class="stat-label">Preparing</div></div>
        <div class="ipo-stat-card rumored"><div class="stat-number">${stats.rumored}</div><div class="stat-label">Rumored</div></div>
      </div>`;
  }

  // Calendar-month difference between two dates, rounded up so a date within
  // the current calendar month but past "today" still counts as at least 1
  // month away. Using days/30 instead (e.g. 31 days = ceil(31/30) = 2) makes
  // dates exactly one calendar month out incorrectly show as "2mo away".
  function monthsUntil(from, to) {
    let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
    if (to.getUTCDate() > from.getUTCDate()) months += 1;
    return Math.max(1, months);
  }

  function renderIPOList(ipos) {
    if (!ipos.length) {
      ipoList.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:2.5rem;margin-bottom:1rem;">🚀</div><h3>No IPOs in this window</h3><p>Try expanding the time range.</p></div>';
      return;
    }
    ipoList.innerHTML = ipos.map(ipo => {
      const statusClass = ipo.status === 'filed' ? 'status-filed' : ipo.status === 'preparing' ? 'status-preparing' : 'status-rumored';
      const expectedDate = new Date(ipo.expected_date);
      const now = new Date();
      const daysUntil = Math.ceil((expectedDate - now) / 86400000);
      const timeLabel = daysUntil < 0 ? 'Overdue' : daysUntil < 7 ? `${daysUntil}d away` : daysUntil < 30 ? `${Math.ceil(daysUntil/7)}w away` : `${monthsUntil(now, expectedDate)}mo away`;
      return `
      <div class="ipo-card">
        <div class="ipo-card-header">
          <div class="ipo-company-info">
            <h3>${esc(ipo.company_name)}</h3>
            <span class="ipo-ticker">${esc(ipo.ticker || 'TBD')}</span>
          </div>
          <span class="ipo-status-badge ${statusClass}">${esc(ipo.status)}</span>
        </div>
        <p class="ipo-description">${esc(ipo.description || '')}</p>
        <div class="ipo-meta">
          <div class="ipo-meta-item"><i class="fas fa-industry"></i> ${esc(ipo.industry)}</div>
          <div class="ipo-meta-item"><i class="fas fa-exchange-alt"></i> ${esc(ipo.exchange)}</div>
          <div class="ipo-meta-item"><i class="fas fa-dollar-sign"></i> ${esc(ipo.valuation)}</div>
          <div class="ipo-meta-item"><i class="fas fa-calendar"></i> ${expectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</div>
          <div class="ipo-meta-item ipo-countdown"><i class="fas fa-clock"></i> ${timeLabel}</div>
        </div>
      </div>`;
    }).join('');
  }
})();
