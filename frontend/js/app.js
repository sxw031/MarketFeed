const API_BASE = '/api/news';
const SELECTED_COMPANIES_KEY = 'mf_companies';

let allNews = [];
let availableCompanies = [];
let selectedCompanies = JSON.parse(localStorage.getItem(SELECTED_COMPANIES_KEY) || '[]');
let activeTimeRange = null;
let currentSort = 'latest'; // 'latest' or 'relevance'
let pollingTimer = null;
let currentPage = 1;
let pageSize = parseInt(localStorage.getItem('mf_pageSize') || '20');

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
  const now = new Date();
  now.setHours(now.getHours() - 24);
  activeTimeRange = now.toISOString();

  await loadCompanies();
  await loadNews();
  setupEventListeners();

  // Theme
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = 'fas fa-sun';
  }
});

// ==================== DATA LOADING ====================
let availableCategories = [];
let activeCategoryFilter = 'all';

async function loadCompanies() {
  try {
    const res = await fetch(`${API_BASE}/companies`);
    const data = await res.json();
    if (data.success) {
      availableCompanies = data.data;
      availableCategories = data.categories || [];
      renderCategoryTabs();
      renderCompanyGrid();
    }
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

async function loadNews(silent = false) {
  if (!silent) { showLoading(true); currentPage = 1; }
  try {
    let url = `${API_BASE}?limit=300`;
    if (activeTimeRange) url += `&startDate=${encodeURIComponent(activeTimeRange)}`;

    const category = document.getElementById('categoryFilter').value;
    const source = document.getElementById('sourceFilter').value;
    const search = document.getElementById('searchInput').value.trim();

    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (source) url += `&source=${encodeURIComponent(source)}`;
    if (selectedCompanies.length > 0) url += `&companies=${selectedCompanies.join(',')}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      allNews = data.data || [];
      sortAndRender();
    }
  } catch (e) {
    console.error('loadNews:', e);
    if (!silent) showEmptyState(true);
  } finally {
    if (!silent) showLoading(false);
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
  if (currentSort === 'relevance') {
    allNews.sort((a, b) => calculateRelevance(b) - calculateRelevance(a));
  } else if (currentSort === 'oldest') {
    allNews.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  } else {
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  renderNews();
}

// ==================== AGGREGATION & PROGRESS ====================
async function triggerAggregation() {
  showSyncBar(true, 'Starting sync...', 0);
  try {
    await fetch(`${API_BASE}/aggregate`, { method: 'POST' });
    startPolling();
  } catch (e) {
    console.error('triggerAggregation:', e);
    showSyncBar(true, 'Sync failed - retrying...', 0);
    setTimeout(() => showSyncBar(false), 3000);
  }
}

function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/aggregation-status`);
      const data = await res.json();
      if (data.success && data.status.inProgress) {
        const s = data.status;
        const done = s.completedCompanies.length;
        const total = s.totalCompanies || 18;
        const pct = Math.round((done / total) * 100);
        showSyncBar(true, `Syncing: ${done}/${total} [${s.currentCompany || '...'}]`, pct);
        // Refresh news every other poll
        if (done % 2 === 0) await loadNews(true);
      } else {
        showSyncBar(true, 'Sync complete!', 100);
        setTimeout(() => showSyncBar(false), 2500);
        clearInterval(pollingTimer);
        pollingTimer = null;
        await loadNews(false);
      }
    } catch (e) { console.error('polling:', e); }
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

// ==================== RENDERING ====================
function renderNews() {
  const list = document.getElementById('newsList');
  if (allNews.length === 0) { showEmptyState(true); hidePagination(); return; }
  showEmptyState(false);

  // Pagination
  const totalItems = allNews.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pageItems = allNews.slice(startIdx, endIdx);

  list.innerHTML = pageItems.map(a => createCard(a)).join('');
  list.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => showArticleModal(JSON.parse(card.dataset.article)));
  });

  renderPagination(totalItems, totalPages, startIdx, endIdx);
  // Scroll to top of news list on page change
  list.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPagination(totalItems, totalPages, startIdx, endIdx) {
  const container = document.getElementById('paginationContainer');
  const summary = document.getElementById('paginationSummary');
  const pageNumbersEl = document.getElementById('pageNumbers');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  if (totalItems <= 20) { container.style.display = 'none'; return; }
  container.style.display = 'flex';

  summary.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalItems}`;
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
  return `
    <div class="news-card ${isStrategic ? 'strategic' : ''}" data-article='${JSON.stringify(article).replace(/'/g, "&#39;")}'>
      <div class="news-card-image-container">
        <img src="${logo}" alt="${article.company}" class="news-card-logo" loading="lazy" onerror="handleLogoError(this,'${article.company}')">
      </div>
      <div class="news-card-content">
        <h3 class="news-card-title">${relevanceDot}${esc(article.title)}</h3>
        <p class="news-card-description">${esc(article.description || '')}</p>
        <div class="news-card-meta">
          <span class="badge badge-company">${article.company}</span>
          <span class="badge badge-source">${article.source || 'Web'}</span>
          <span class="badge ${isStrategic ? 'badge-strategic' : 'badge-category'}">${article.category || 'General'}</span>
          <span class="news-card-date">${date}</span>
        </div>
      </div>
    </div>`;
}

function showArticleModal(article) {
  const modal = document.getElementById('articleModal');
  const body = document.getElementById('modalBody');
  const logo = getLogoUrl(article.company);
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;background:var(--bg-secondary);padding:1.5rem;border-radius:12px;">
      <img src="${logo}" alt="${article.company}" style="max-width:140px;height:70px;object-fit:contain;" onerror="handleLogoError(this,'${article.company}')">
    </div>
    <h2 style="font-size:1.4rem;margin-bottom:0.75rem;font-weight:800;line-height:1.3;">${esc(article.title)}</h2>
    <div class="news-card-meta" style="margin-bottom:1.25rem;">
      <span class="badge badge-company">${article.company}</span>
      <span class="badge badge-source">${article.source}</span>
      <span class="badge badge-category">${article.category}</span>
      <span class="news-card-date">${formatRelativeTime(article.publishedAt)}</span>
    </div>
    <p style="font-size:1rem;line-height:1.7;color:var(--text-main);margin-bottom:1.5rem;">${esc(article.description || 'No description available')}</p>
    <div style="display:flex;justify-content:center;">
      <a href="${article.url}" target="_blank" rel="noopener" class="btn-source-link">
        View Original Source <i class="fas fa-external-link-alt"></i>
      </a>
    </div>`;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

// ==================== YEARLY SUMMARY ====================
async function showYearlySummary(year) {
  const modal = document.getElementById('yearlySummaryModal');
  const title = document.getElementById('yearlySummaryTitle');
  const content = document.getElementById('yearlySummaryContent');

  title.textContent = year === 2026 ? `2026 Year-to-Date (as of ${new Date().toLocaleDateString('en-US', {month:'short', day:'numeric'})})` : `${year} Major Events Summary`;
  content.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="spinner"></div><p>Loading summary...</p></div>';
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`${API_BASE}/yearly-summary/${year}`);
    const data = await res.json();
    if (data.success) {
      content.innerHTML = renderYearlySummary(data.data, year);
    } else {
      content.innerHTML = '<p style="text-align:center;padding:2rem;">Failed to load summary.</p>';
    }
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
          <img src="${logo}" alt="${c.company}" class="yearly-logo" onerror="handleLogoError(this,'${c.company}')">
          <div>
            <h3>${c.company}</h3>
            <span class="badge ${relevanceClass}">Relevance: ${c.relevance}</span>
          </div>
        </div>
        <ul class="yearly-highlights">
          ${c.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>`;
  });

  html += `</div>`;
  return html;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navRight = document.getElementById('navRight');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navRight.classList.toggle('mobile-open');
      const icon = mobileToggle.querySelector('i');
      icon.className = navRight.classList.contains('mobile-open') ? 'fas fa-times' : 'fas fa-bars';
    });
  }

  // Refresh & Fetch All
  document.getElementById('refreshBtn').addEventListener('click', () => triggerAggregation());
  document.getElementById('fetchAllBtn').addEventListener('click', () => triggerAggregation());

  // Filters - auto apply on change
  document.getElementById('categoryFilter').addEventListener('change', () => loadNews());
  document.getElementById('sourceFilter').addEventListener('change', () => loadNews());
  document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') loadNews(); });

  // Sort buttons
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      sortAndRender();
    });
  });

  // Time range buttons
  document.querySelectorAll('.btn-quick-time').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;

      // Year buttons -> show yearly summary modal
      if (['2023', '2024', '2025', '2026'].includes(range)) {
        showYearlySummary(parseInt(range));
        return;
      }

      // Regular time filter
      document.querySelectorAll('.btn-quick-time:not(.btn-yearly)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const now = new Date();
      switch (range) {
        case '1h': now.setHours(now.getHours() - 1); break;
        case '6h': now.setHours(now.getHours() - 6); break;
        case '12h': now.setHours(now.getHours() - 12); break;
        case '24h': now.setHours(now.getHours() - 24); break;
        case '48h': now.setHours(now.getHours() - 48); break;
        case '72h': now.setHours(now.getHours() - 72); break;
        case '1w': now.setDate(now.getDate() - 7); break;
        case '1m': now.setMonth(now.getMonth() - 1); break;
      }
      activeTimeRange = now.toISOString();
      loadNews();
    });
  });

  // Reset
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('sourceFilter').value = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
    const btn24h = document.querySelector('.btn-quick-time[data-range="24h"]');
    if (btn24h) btn24h.classList.add('active');
    selectedCompanies = [];
    const now = new Date();
    now.setHours(now.getHours() - 24);
    activeTimeRange = now.toISOString();
    currentSort = 'latest';
    document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
    const latestBtn = document.querySelector('.btn-sort[data-sort="latest"]');
    if (latestBtn) latestBtn.classList.add('active');
    localStorage.removeItem(SELECTED_COMPANIES_KEY);
    renderCompanyGrid();
    loadNews();
  });

  // Logo click -> home
  document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetBtn').click();
  });

  // Company selector
  const selectorModal = document.getElementById('companySelectorModal');
  document.getElementById('openCompanySelector').addEventListener('click', () => {
    selectorModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('closeSelector').addEventListener('click', () => {
    selectorModal.style.display = 'none';
    document.body.style.overflow = '';
  });
  document.getElementById('applySelectorBtn').addEventListener('click', () => {
    selectedCompanies = Array.from(document.querySelectorAll('.company-item.selected')).map(el => el.dataset.company);
    localStorage.setItem(SELECTED_COMPANIES_KEY, JSON.stringify(selectedCompanies));
    selectorModal.style.display = 'none';
    document.body.style.overflow = '';
    updateSelectionLabel();
    loadNews();
  });
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.company-item').forEach(el => el.classList.add('selected'));
  });
  document.getElementById('deselectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.company-item').forEach(el => el.classList.remove('selected'));
  });

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
      alert(`Podcast generation failed: ${e.message}\n\nThis may be due to TTS not being available on the server. Please check Render logs.`);
    }
  }

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
      podcastPlayer.playbackRate = selectedPodcastSpeed;
    });
  });

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      podcastPlayer.pause();
      podcastPlayer.currentTime = 0;
      podcastBtn.classList.remove('playing');
      podcastBtn.querySelector('span').textContent = 'Daily Podcast';
      hidePodcastControls();
    });
  }

  // Show stop control when playing, hide when ended
  podcastPlayer.addEventListener('play', () => {
    showPodcastControls();
    podcastPlayer.playbackRate = selectedPodcastSpeed;
  });
  podcastPlayer.addEventListener('ended', () => {
    hidePodcastControls();
  });

  // ==================== STRATEGY REPORT ====================
  const reportModal = document.getElementById('reportModal');
  // Report dropdown toggle
  const reportDropdown = document.getElementById('reportDropdownMenu');
  document.getElementById('generateReportBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    reportDropdown.classList.toggle('show');
  });
  // Close dropdown when clicking outside
  document.addEventListener('click', () => reportDropdown.classList.remove('show'));
  reportDropdown.addEventListener('click', (e) => e.stopPropagation());

  // Handle period selection
  document.querySelectorAll('.report-period-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const period = btn.dataset.period;
      reportDropdown.classList.remove('show');
      generateStrategyReport(period);
    });
  });

  async function generateStrategyReport(period = 'daily') {
    const periodLabels = { daily: 'Daily Briefing', weekly: 'Weekly Review', monthly: 'Monthly Assessment', quarterly: 'Quarterly Intelligence' };
    reportModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const content = document.getElementById('reportContent');
    content.innerHTML = `<div class="report-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;"><div class="spinner"></div><p>Generating ${periodLabels[period] || 'strategic analysis'}...</p></div>`;
    try {
      // For daily, send current news; for longer periods, backend fetches from DB
      const payload = { period };
      if (period === 'daily') {
        const newsForReport = allNews.filter(n => n.category === 'Strategic Insights').slice(0, 20);
        payload.news = newsForReport.length > 0 ? newsForReport : allNews.slice(0, 15);
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
  document.getElementById('closeReportModal').addEventListener('click', () => { reportModal.style.display = 'none'; document.body.style.overflow = ''; });

  // Listen to report button
  document.getElementById('listenReportBtn').addEventListener('click', async function() {
    const btn = this;
    const reportText = document.getElementById('reportContent').innerText;
    if (!reportText || reportText.includes('Generating')) { alert('Please generate a report first.'); return; }

    if (btn.classList.contains('playing')) {
      const audio = document.getElementById('reportAudioPlayer');
      if (audio) audio.pause();
      btn.classList.remove('playing');
      btn.querySelector('span').textContent = 'Listen';
      return;
    }

    btn.querySelector('span').textContent = 'Synthesizing...';
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
        audio.src = URL.createObjectURL(blob);
        await audio.play();
        btn.classList.add('playing');
        btn.querySelector('span').textContent = 'Playing...';
        btn.disabled = false;
        audio.onended = () => { btn.classList.remove('playing'); btn.querySelector('span').textContent = 'Listen'; };
      } else {
        throw new Error('TTS not available');
      }
    } catch (e) {
      alert('Report audio: ' + e.message);
      btn.querySelector('span').textContent = 'Listen';
      btn.disabled = false;
    }
  });

  // Download report
  document.getElementById('downloadReportBtn').addEventListener('click', () => {
    const text = document.getElementById('reportContent').innerText;
    if (!text || text.includes('Generating')) { alert('Please generate a report first.'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `AlphaFeed_Report_${new Date().toISOString().split('T')[0]}.txt`; a.click();
  });

  // Yearly Summary Modal close
  document.getElementById('closeYearlyModal').addEventListener('click', () => {
    document.getElementById('yearlySummaryModal').style.display = 'none';
    document.body.style.overflow = '';
  });

  // ==================== AI CHAT ====================
  const chatWindow = document.getElementById('aiChatWindow');
  document.getElementById('aiChatToggle').addEventListener('click', () => {
    chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('closeAiChat').addEventListener('click', () => { chatWindow.style.display = 'none'; });

  async function handleChat() {
    const input = document.getElementById('aiChatInput');
    const q = input.value.trim();
    if (!q) return;
    appendChat('user', q);
    input.value = '';
    const botMsg = appendChat('bot', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
    try {
      const res = await fetch('/api/news/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, context: allNews.slice(0, 50) })
      });
      const data = await res.json();
      botMsg.innerHTML = renderMarkdown(data.answer || 'No answer available.').replace('<div class="report-body">', '<div>');
    } catch (e) { botMsg.textContent = 'Connection error. Please try again.'; }
  }
  document.getElementById('sendAiMessage').addEventListener('click', handleChat);
  document.getElementById('aiChatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.querySelector('#themeToggle i').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });

  // ==================== PAGINATION ====================
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderNews(); }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(allNews.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderNews(); }
  });
  document.getElementById('pageNumbers').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-page-num');
    if (btn) { currentPage = parseInt(btn.dataset.page); renderNews(); }
  });
  document.querySelectorAll('.btn-page-size').forEach(btn => {
    btn.addEventListener('click', () => {
      pageSize = parseInt(btn.dataset.size);
      localStorage.setItem('mf_pageSize', pageSize);
      currentPage = 1;
      renderNews();
    });
  });

  // Modal close handlers
  const articleModal = document.getElementById('articleModal');
  document.getElementById('closeModal').addEventListener('click', () => { articleModal.style.display = 'none'; document.body.style.overflow = ''; });
  window.addEventListener('click', (e) => {
    [selectorModal, articleModal, reportModal, document.getElementById('yearlySummaryModal')].forEach(m => {
      if (e.target === m) { m.style.display = 'none'; document.body.style.overflow = ''; }
    });
  });
}

// ==================== HELPERS ====================
function getLogoUrl(name) {
  return LOGO_MAP[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

window.handleLogoError = function(img, name) {
  // Fallback chain: logo.dev -> Google favicons -> UI Avatars
  if (img.src.includes('logo.dev')) {
    const domains = { 'HSBC': 'hsbc.com', 'Grab': 'grab.com', 'Vodafone': 'vodafone.com', 'Cathay Pacific': 'cathaypacific.com', 'Alibaba': 'alibaba.com', 'Standard Chartered': 'sc.com', 'Temu': 'temu.com', 'Ctrip': 'trip.com', 'Didi': 'didiglobal.com', 'DBS': 'dbs.com', 'Tencent': 'tencent.com', 'Bank of China': 'boc.cn', 'ByteDance': 'bytedance.com', 'Gojek': 'gojek.com', 'Citigroup': 'citigroup.com', 'Binance': 'binance.com', 'ShopBack': 'shopback.com', 'Aeon Credit': 'aeoncredit.com.my', 'CATL (\u5b81\u5fb7\u65f6\u4ee3)': 'catl.com', 'SpaceX': 'spacex.com', 'SF Express (\u987a\u4e30)': 'sf-express.com', 'Helios Energy': 'heliosenergy.com', 'Tesla': 'tesla.com', 'OpenAI': 'openai.com', 'Anthropic': 'anthropic.com' };
    const domain = domains[name];
    if (domain) { img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`; return; }
  }
  if (!img.src.includes('ui-avatars')) {
    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
  }
};

function renderCompanyGrid() {
  const container = document.getElementById('companyFilters');
  if (!container) return;
  container.innerHTML = '';
  const filtered = activeCategoryFilter === 'all'
    ? availableCompanies
    : availableCompanies.filter(c => c.category === activeCategoryFilter);
  filtered.forEach(c => {
    const el = document.createElement('div');
    el.className = `company-item ${selectedCompanies.includes(c.name) ? 'selected' : ''}`;
    el.dataset.company = c.name;
    el.innerHTML = `<img src="${getLogoUrl(c.name)}" alt="${c.name}" loading="lazy" onerror="handleLogoError(this,'${c.name}')"><span>${c.name}</span>`;
    el.addEventListener('click', () => el.classList.toggle('selected'));
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
      return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
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
    // Images and links
    line = line.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="report-img">');
    line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="report-link">$1</a>');
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

function showEmptyState(show) {
  document.getElementById('emptyState').style.display = show ? 'block' : 'none';
  if (show) document.getElementById('newsList').innerHTML = '';
}

function formatRelativeTime(str) {
  if (!str) return '';
  let dateStr = str;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

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

  function renderIPOList(ipos) {
    if (!ipos.length) {
      ipoList.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:2.5rem;margin-bottom:1rem;">🚀</div><h3>No IPOs in this window</h3><p>Try expanding the time range.</p></div>';
      return;
    }
    ipoList.innerHTML = ipos.map(ipo => {
      const statusClass = ipo.status === 'filed' ? 'status-filed' : ipo.status === 'preparing' ? 'status-preparing' : 'status-rumored';
      const expectedDate = new Date(ipo.expected_date);
      const daysUntil = Math.ceil((expectedDate - new Date()) / 86400000);
      const timeLabel = daysUntil < 0 ? 'Overdue' : daysUntil < 7 ? `${daysUntil}d away` : daysUntil < 30 ? `${Math.ceil(daysUntil/7)}w away` : `${Math.ceil(daysUntil/30)}mo away`;
      return `
      <div class="ipo-card">
        <div class="ipo-card-header">
          <div class="ipo-company-info">
            <h3>${ipo.company_name}</h3>
            <span class="ipo-ticker">${ipo.ticker || 'TBD'}</span>
          </div>
          <span class="ipo-status-badge ${statusClass}">${ipo.status}</span>
        </div>
        <p class="ipo-description">${ipo.description || ''}</p>
        <div class="ipo-meta">
          <div class="ipo-meta-item"><i class="fas fa-industry"></i> ${ipo.industry}</div>
          <div class="ipo-meta-item"><i class="fas fa-exchange-alt"></i> ${ipo.exchange}</div>
          <div class="ipo-meta-item"><i class="fas fa-dollar-sign"></i> ${ipo.valuation}</div>
          <div class="ipo-meta-item"><i class="fas fa-calendar"></i> ${expectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
          <div class="ipo-meta-item ipo-countdown"><i class="fas fa-clock"></i> ${timeLabel}</div>
        </div>
      </div>`;
    }).join('');
  }
})();
