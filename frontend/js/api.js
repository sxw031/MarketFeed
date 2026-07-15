(function initMarketFeedApi(global) {
  const API_BASE = '/api/news';

  function buildNewsQuery(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        if (value.length > 0) searchParams.set(key, value.join(','));
        return;
      }
      searchParams.set(key, String(value));
    });
    return searchParams.toString();
  }

  async function readJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return data;
  }

  function debounce(fn, delay = 250) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  global.MarketFeedApi = {
    API_BASE,
    debounce,
    buildNewsUrl(params = {}) {
      const query = buildNewsQuery(params);
      return query ? `${API_BASE}?${query}` : API_BASE;
    },
    fetchNewsPage(params = {}, options = {}) {
      return readJson(this.buildNewsUrl(params), options);
    },
    fetchCompanies() {
      return readJson(`${API_BASE}/companies`);
    },
    fetchAggregationStatus() {
      return readJson(`${API_BASE}/aggregation-status`);
    },
    fetchArticlePreview(articleId, options = {}) {
      return readJson(`${API_BASE}/article-preview?articleId=${encodeURIComponent(articleId)}`, options);
    },
    fetchYearlySummary(year) {
      return readJson(`${API_BASE}/yearly-summary/${year}`);
    }
  };
})(window);
