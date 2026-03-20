// main.js — entry point, orchestrates all modules

import { applyTranslations, toggleLang, t } from './utils/i18n.js';
import { fetchAllData, fetchHistory, fetchStockFullData } from './services/StockService.js';
import { calcScore } from './utils/scoring.js';
import { calcSummaryScore, renderSummaryGauge } from './components/SummaryGauge.js';

import { drawGauge } from './components/Gauge.js';
import { renderCriteriaTable } from './components/CriteriaTable.js';
import { renderNews } from './components/NewsRenderer.js';
import { renderTrendingList, loadTrending } from './components/TrendingList.js';
import { showAutocomplete, hideAutocomplete, selectAutocomplete, initAutocomplete } from './components/Autocomplete.js';
import { initChart, loadChart, updateChartTheme, initCompareChart } from './components/Chart.js';
import {
  getWatchlist, saveWatchlist, isInWatchlist,
  addToWatchlist, removeFromWatchlist as _removeFromWatchlist,
  toggleWatchlist as _toggleWatchlist,
  updateWatchlistBtn, checkWatchlistAlerts,
  renderWatchlist as _renderWatchlist,
} from './components/Watchlist.js';
import {
  getCompareList,
  addToCompare as _addToCompare,
  removeFromCompare as _removeFromCompare,
  updateCompareBtn,
  renderCompare as _renderCompare,
} from './components/Compare.js';

import { applyTheme, toggleTheme as _toggleTheme } from './hooks/useTheme.js';
import { navigateTo as _navigateTo, getCurrentPage } from './hooks/useNavigation.js';
import { getHistory, saveSearchHistory, renderHistory as _renderHistory, removeHistory as _removeHistory } from './hooks/useHistory.js';
import { formatMarketCap } from './utils/formatters.js';

// ── App State ───────────────────────────────────────────
let currentStock = null;
let autoRefreshTimer = null;

// ── Notification ───────────────────────────────────────
let notifTimer = null;
function showNotification(msg) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ── Bound callbacks ─────────────────────────────────────
// These wrap the hook/component functions with the app's local callbacks injected

function renderWatchlist() {
  _renderWatchlist(navigateTo, showNotification);
}

function renderCompare() {
  _renderCompare(showNotification);
}

function renderHistory() {
  _renderHistory(navigateTo);
}

function navigateTo(page, symbol = null) {
  _navigateTo(page, symbol, {
    loadResults,
    renderWatchlist,
    renderCompare,
  });
}

function removeFromWatchlistBound(symbol) {
  _removeFromWatchlist(symbol, showNotification, updateWatchlistBtn, renderWatchlist);
}

function removeFromCompareBound(symbol) {
  _removeFromCompare(symbol, updateCompareBtn, renderCompare);
}

function removeHistoryBound(symbol) {
  _removeHistory(symbol, renderHistory);
}

// ── Expose window.* for inline onclick attributes ───────
window.openDrawer = function() {
  document.getElementById('nav-drawer')?.classList.add('open');
  document.getElementById('drawer-overlay')?.classList.add('open');
  document.getElementById('nav-drawer')?.removeAttribute('aria-hidden');
};

window.closeDrawer = function() {
  document.getElementById('nav-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
  document.getElementById('nav-drawer')?.setAttribute('aria-hidden', 'true');
};

window.navigateTo = navigateTo;

window.removeHistory = removeHistoryBound;

window.removeFromWatchlist = removeFromWatchlistBound;

window.removeFromCompare = removeFromCompareBound;

// ── Lang change callback ────────────────────────────────
window.__onLangChange = function() {
  if (currentStock && document.getElementById('page-results')?.classList.contains('active')) {
    renderResults(currentStock, currentStock);
    applyTranslations();
  }
  // Re-render trending to update badge labels
  const trendingContainer = document.getElementById('trending-list');
  if (trendingContainer) {
    // Re-render with current data by calling loadTrending again would re-fetch;
    // instead directly re-render from cached data
    import('./components/TrendingList.js').then(mod => {
      mod.renderTrendingList(navigateTo);
    });
  }
};

// ── Utility ─────────────────────────────────────────────
function syncTopbarHeight() {
  const h = document.querySelector('.top-bar')?.offsetHeight;
  if (h) document.documentElement.style.setProperty('--topbar-h', h + 'px');
}

// ── Results ────────────────────────────────────────────
async function loadResults(symbol) {
  document.getElementById('results-loading').style.display = 'flex';
  document.getElementById('results-content').classList.add('hidden');
  document.getElementById('results-error').classList.add('hidden');
  document.getElementById('offline-banner').classList.add('hidden');

  clearInterval(autoRefreshTimer);

  try {
    // Run quote, 5Y history, and full indicator data all in parallel
    const [
      { data, offline, cacheDate },
      h5,
      fullStockData,
    ] = await Promise.all([
      fetchAllData(symbol),
      fetchHistory(symbol, '5Y').catch(() => []),
      fetchStockFullData(symbol).catch(() => null),
    ]);

    if (!data) throw new Error(t('stockNotFound'));

    const scored = calcScore(data, h5);
    currentStock = { ...data, ...scored };

    if (offline && cacheDate) {
      document.getElementById('offline-banner').classList.remove('hidden');
      document.getElementById('offline-date').textContent = cacheDate.toLocaleString();
    }

    renderResults(data, scored);
    saveSearchHistory(symbol, data.name, renderHistory);

    document.getElementById('results-loading').style.display = 'none';
    document.getElementById('results-content').classList.remove('hidden');

    // ── Existing canvas gauge (inside results-layout) ──
    drawGauge(scored.score, scored.rating);

    // ── SummaryGauge — new animated SVG with 4-factor score ──
    const summaryContainer = document.getElementById('summary-gauge-container');
    if (summaryContainer) {
      const indicators    = fullStockData?.indicators ?? null;
      const summaryScored = calcSummaryScore(data, indicators);
      renderSummaryGauge(summaryContainer, summaryScored);
    }

    loadChart(symbol, '1M');
    updateWatchlistBtn(symbol);
    updateCompareBtn(symbol);

    autoRefreshTimer = setInterval(() => loadResults(symbol), 15 * 60 * 1000);

  } catch (e) {
    document.getElementById('results-loading').style.display = 'none';
    document.getElementById('results-error').classList.remove('hidden');
    document.getElementById('error-msg').textContent =
      e.message === 'no_data' ? t('stockNotFound') : e.message;
  }
}

function renderResults(data, scored) {
  document.getElementById('res-symbol').textContent = data.symbol;
  document.getElementById('res-name').textContent   = data.name || '';

  document.getElementById('gauge-score').textContent = scored.score ?? '--';
  document.getElementById('gauge-label').textContent = t(scored.rating);
  document.getElementById('gauge-label').className = `gauge-label badge-${scored.rating}`;
  document.getElementById('partial-data-warning').classList.toggle('hidden', !scored.isPartial);

  const fmt = (n, dec = 2) => n != null ? n.toFixed(dec) : t('noData');
  const currency = data.currency || 'USD';

  const priceEl  = document.getElementById('info-price');
  const changeEl = document.getElementById('info-change');
  priceEl.textContent = data.price != null ? `${currency} ${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : t('noData');
  if (data.isTASE && data.marketState === 'CLOSED') {
    priceEl.textContent += ` (${t('closed')})`;
  }
  if (data.changePct != null) {
    const sign = data.changePct >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${data.changePct.toFixed(2)}%`;
    changeEl.className = `info-change ${data.changePct >= 0 ? 'positive' : 'negative'}`;
  }

  document.getElementById('info-mktcap').textContent = formatMarketCap(data.marketCap);
  document.getElementById('info-beta').textContent = fmt(data.beta);
  document.getElementById('info-dividend').textContent =
    data.dividend != null ? `${data.dividend.toFixed(2)}%` : t('noData');

  const earningsEl = document.getElementById('info-earnings');
  const earningsDaysEl = document.getElementById('info-earnings-days');
  if (data.earningsDate) {
    const ed = new Date(data.earningsDate);
    earningsEl.textContent = ed.toLocaleDateString();
    const days = Math.round((ed - new Date()) / 86400000);
    if (days === 0)       earningsDaysEl.textContent = t('today');
    else if (days > 0)    earningsDaysEl.textContent = t('daysUntil', { n: days });
    else                  earningsDaysEl.textContent = t('daysAgo', { n: Math.abs(days) });
  } else {
    earningsEl.textContent = t('noData');
    earningsDaysEl.textContent = '';
  }

  const targetEl = document.getElementById('info-target');
  const targetRangeEl = document.getElementById('info-target-range');
  if (data.targetMean) {
    targetEl.textContent = `${currency} ${data.targetMean.toFixed(2)}`;
    targetRangeEl.textContent = (data.targetLow && data.targetHigh)
      ? `${data.targetLow.toFixed(0)}–${data.targetHigh.toFixed(0)}`
      : '';
  } else {
    targetEl.textContent = t('noData');
    targetRangeEl.textContent = '';
  }

  renderCriteriaTable(scored, data);
  renderNews(data.newsItems);
}

// ── Search ─────────────────────────────────────────────
function doSearch(query) {
  query = (query || '').trim().toUpperCase();
  if (!query) return;
  hideAutocomplete();
  navigateTo('results', query);
}

// ── URL param (?s=AAPL) ────────────────────────────────
function checkURLParam() {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('s');
  if (s) navigateTo('results', s.toUpperCase());
}

// ── Bind Events ────────────────────────────────────────
function bindEvents() {
  // Theme + lang
  document.getElementById('btn-theme-drawer')?.addEventListener('click', () => _toggleTheme(updateChartTheme));
  document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', toggleLang));

  // Close drawer on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeDrawer(); });

  // Search
  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-btn');

  if (input) {
    input.addEventListener('input', () => showAutocomplete(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch(input.value);
      if (e.key === 'ArrowDown') selectAutocomplete(1);
      if (e.key === 'ArrowUp')   selectAutocomplete(-1);
      if (e.key === 'Escape')    hideAutocomplete();
    });
  }
  if (btn) btn.addEventListener('click', () => { if (input) doSearch(input.value); });

  // Init autocomplete — onSelect triggers doSearch
  initAutocomplete((symbol) => doSearch(symbol));

  // Close autocomplete on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) hideAutocomplete();
  });

  // Back buttons
  document.getElementById('btn-back')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-err')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-compare')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-watchlist')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-about')?.addEventListener('click', () => navigateTo('home'));

  // Drawer nav items
  document.querySelectorAll('.drawer-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page, page === 'results' ? currentStock?.symbol : null);
    });
  });

  // Watchlist toggle
  document.getElementById('btn-watchlist-toggle')?.addEventListener('click', () => {
    if (!currentStock) return;
    _toggleWatchlist(currentStock.symbol, currentStock.name, currentStock.rating, showNotification, updateWatchlistBtn, renderWatchlist);
  });

  // Share
  document.getElementById('btn-share')?.addEventListener('click', () => {
    if (!currentStock) return;
    const url = `${location.origin}${location.pathname}?s=${currentStock.symbol}`;
    if (navigator.share) {
      navigator.share({ title: currentStock.symbol, url });
    } else {
      navigator.clipboard.writeText(url).then(() => showNotification(t('linkCopied')));
    }
  });

  // Chart ranges
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (currentStock) loadChart(currentStock.symbol, btn.dataset.range);
    });
  });

  // Add to compare
  document.getElementById('btn-add-compare')?.addEventListener('click', () => {
    if (!currentStock) return;
    _addToCompare(currentStock.symbol, currentStock.name, showNotification, updateCompareBtn);
  });
}

// ── DOMContentLoaded ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  applyTranslations();
  syncTopbarHeight();
  window.addEventListener('resize', syncTopbarHeight);
  bindEvents();

  // Mark home as active in drawer
  const homeBtn = document.querySelector('.drawer-nav-item[data-page="home"]');
  if (homeBtn) homeBtn.classList.add('active');

  // Move footer into active page
  const footer = document.querySelector('.app-footer');
  const initPage = document.querySelector('.page.active');
  if (footer && initPage) initPage.appendChild(footer);

  checkURLParam();
  loadTrending(navigateTo);
  renderHistory();

  setInterval(() => checkWatchlistAlerts(showNotification), 15 * 60 * 1000);

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
