// main.js — entry point, orchestrates all modules

import { applyTranslations, toggleLang, t } from './utils/i18n.js?v=2';
import { fetchAllData, fetchHistory, fetchStockFullData, fetchIndexQuote } from './services/StockService.js';
import { calcScore } from './utils/scoring.js';
import { calcSummaryScore, renderSummaryGauge } from './components/SummaryGauge.js';

import { renderCriteriaTable } from './components/CriteriaTable.js';
import { renderStrategyChecklist, countNewHighs } from './components/StrategyChecklist.js';
import { renderAnalysisTables } from './components/AnalysisTables.js';
import { renderNews, renderAIInsight } from './components/NewsRenderer.js';
import { loadFearGreed, loadCryptoFearGreed } from './components/FearGreedGauge.js?v=2';
import { loadTrending, renderTrendingList }   from './components/TrendingList.js';
import { loadAAII }      from './components/AAIISentiment.js';
import { loadMacroData, loadCryptoPrices, loadUpcomingEvents } from './components/MacroCrypto.js?v=7';
import { renderMarketStatus, loadDXY, loadCommodities, loadSectorPerformance, loadMovers } from './components/MarketMovers.js?v=1';
import { initInfoButtons } from './components/InfoPopup.js';
import { renderCompanyCard } from './components/CompanyCard.js';
import { showAutocomplete, hideAutocomplete, selectAutocomplete, confirmAutocomplete, showRecentSearches, initAutocomplete } from './components/Autocomplete.js';
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

import {
  initWatchlistSidebar, openWatchlistSidebar, closeWatchlistSidebar,
  renderWatchlistSidebar, updateSidebarCount,
} from './components/WatchlistSidebar.js';

import { applyTheme, toggleTheme as _toggleTheme } from './hooks/useTheme.js';
import { navigateTo as _navigateTo, getCurrentPage } from './hooks/useNavigation.js';
import { getHistory, saveSearchHistory, renderHistory as _renderHistory, removeHistory as _removeHistory } from './hooks/useHistory.js';
import { formatMarketCap } from './utils/formatters.js';

// ── App State ───────────────────────────────────────────
let currentStock = null;
let autoRefreshTimer = null;
let activeLoadSymbol = null; // tracks the latest requested symbol to cancel stale loads
let lastFullStockData  = null;   // stored for lang-change re-render
let lastSummaryScored  = null;   // stored for lang-change re-render

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
  renderHomeWatchlist();
}

function renderHomeWatchlist() {
  const section = document.getElementById('home-watchlist-section');
  const list    = document.getElementById('home-watchlist-list');
  if (!section || !list) return;
  const items = getWatchlist();
  if (!items.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = items.map(item => {
    const ratingKey  = item.rating === 'buy' ? 'buy' : item.rating === 'wait' ? 'wait' : 'sell';
    const badgeCls   = item.rating === 'buy' ? 'badge-buy-bg' : item.rating === 'wait' ? 'badge-wait-bg' : 'badge-sell-bg';
    return `
      <div class="hwl-item" data-symbol="${item.symbol}">
        <span class="hwl-symbol">${item.symbol}</span>
        <span class="hwl-name">${item.name || ''}</span>
        <span class="wl-badge ${badgeCls}">${t(ratingKey)}</span>
      </div>`;
  }).join('');
  list.querySelectorAll('.hwl-item').forEach(el => {
    el.addEventListener('click', () => navigateTo('results', el.dataset.symbol));
  });
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
  if (page === 'home') renderHomeWatchlist();
}

function removeFromWatchlistBound(symbol) {
  _removeFromWatchlist(symbol, showNotification, updateWatchlistBtn, renderWatchlist);
  updateSidebarCount();
}

function removeFromCompareBound(symbol) {
  _removeFromCompare(symbol, updateCompareBtn, renderCompare);
}

function removeHistoryBound(symbol) {
  _removeHistory(symbol, renderHistory);
}

// ── Expose window.* for inline onclick attributes ───────
window.openDrawer  = function() {}; // drawer removed — kept as no-op for safety
window.closeDrawer = function() {}; // drawer removed — kept as no-op for safety

window.navigateTo = navigateTo;

window.removeHistory = removeHistoryBound;

window.removeFromWatchlist = removeFromWatchlistBound;

window.removeFromCompare = removeFromCompareBound;

window.openWatchlistSidebar  = openWatchlistSidebar;
window.closeWatchlistSidebar = closeWatchlistSidebar;

// ── Lang change callback ────────────────────────────────
window.__onLangChange = function() {
  // 1. Apply data-i18n attribute translations everywhere
  applyTranslations();

  // 2. Re-render results page dynamic content if it's active
  if (currentStock && document.getElementById('page-results')?.classList.contains('active')) {
    renderResults(currentStock, currentStock);

    // Patch highs1y after lang-change re-render
    const highs1yElLang = document.getElementById('info-highs1y');
    if (highs1yElLang) {
      const closes1y = (lastFullStockData?.history ?? []).map(h => h.value).filter(v => v != null && v > 0);
      highs1yElLang.textContent = closes1y.length >= 5 ? countNewHighs(closes1y) : (currentStock?.technicals?.highs?.y1 ?? t('noData'));
    }

    // Re-render summary gauge (has translated zone/factor labels)
    const summaryContainer = document.getElementById('summary-gauge-container');
    if (summaryContainer && lastSummaryScored) {
      renderSummaryGauge(summaryContainer, lastSummaryScored);
    }

    // Re-render analysis tables on language change
    const fundamentalEl = document.getElementById('analysis-fundamental-section');
    const technicalEl   = document.getElementById('analysis-technical-section');
    if ((fundamentalEl || technicalEl) && lastFullStockData !== undefined && lastSummaryScored) {
      renderAnalysisTables(
        fundamentalEl,
        technicalEl,
        lastSummaryScored,
        currentStock,
        lastFullStockData?.history ?? [],
        lastFullStockData?.indicators ?? null,
      );
    }
  }

  // 3. Re-render Fear & Greed + AAII + Trending labels on lang change
  loadFearGreed();
  loadCryptoFearGreed();
  loadAAII();
  renderTrendingList(navigateTo);

  // 4. Re-render home-page sections that have translated strings
  renderMarketStatus();
  loadMacroData();
  loadUpcomingEvents();
  loadSectorPerformance();
  loadMovers();
};

// ── Utility ─────────────────────────────────────────────
function syncTopbarHeight() {
  const h = document.querySelector('.top-bar')?.offsetHeight;
  if (h) document.documentElement.style.setProperty('--topbar-h', h + 'px');
}

// ── Market Indices ──────────────────────────────────────
async function loadMarketIndices() {
  const indices = [
    { id: 'idx-sp500',   symbol: '^GSPC'  },
    { id: 'idx-nasdaq',  symbol: '^NDX'   },
    { id: 'idx-dow',     symbol: '^DJI'   },
    { id: 'idx-russell', symbol: '^RUT'   },
    { id: 'idx-vix',     symbol: '^VIX'   },
  ];
  for (const { id, symbol } of indices) {
    const card = document.getElementById(id);
    if (!card) continue;
    const priceEl  = card.querySelector('.market-price');
    const changeEl = card.querySelector('.market-change');
    const isVix    = id === 'idx-vix';
    try {
      const quote = await fetchIndexQuote(symbol);
      if (quote && quote.price != null) {
        // VIX: show one decimal, no thousands separator; others: normal formatting
        priceEl.textContent = isVix
          ? quote.price.toFixed(2)
          : quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 });
        const sign = (quote.changePct ?? 0) >= 0 ? '+' : '';
        changeEl.textContent = quote.changePct != null ? `${sign}${quote.changePct.toFixed(2)}%` : '--';
        // VIX: rising = bad for market → show as negative (red); falling = positive (green)
        const chgPct = quote.changePct ?? 0;
        const colorClass = isVix
          ? (chgPct >= 0 ? 'negative' : 'positive')
          : (chgPct >= 0 ? 'positive' : 'negative');
        changeEl.className = `market-change ${colorClass}`;
      }
    } catch {
      // silently fail — cards keep showing '--'
    }
  }
}

// ── Forex (USD/ILS, EUR/ILS) ───────────────────────────
async function loadForex() {
  const pairs = [
    { id: 'fx-usdils', symbol: 'USDILS=X' },
    { id: 'fx-eurils', symbol: 'EURILS=X' },
  ];
  for (const { id, symbol } of pairs) {
    const card = document.getElementById(id);
    if (!card) continue;
    const priceEl  = card.querySelector('.market-price');
    const changeEl = card.querySelector('.market-change');
    try {
      const q = await fetchIndexQuote(symbol);
      if (q?.price != null) {
        priceEl.textContent = q.price.toFixed(3);
        const sign = (q.changePct ?? 0) >= 0 ? '+' : '';
        changeEl.textContent = q.changePct != null ? `${sign}${q.changePct.toFixed(2)}%` : '--';
        const cls = (q.changePct ?? 0) >= 0 ? 'positive' : 'negative';
        changeEl.className = `market-change ${cls}`;
      }
    } catch { /* keep -- */ }
  }
}

// ── Results ────────────────────────────────────────────
async function loadResults(symbol) {
  activeLoadSymbol = symbol;
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

    // If the user navigated to a different stock while this was loading, discard
    if (activeLoadSymbol !== symbol) return;

    const scored = calcScore(data, h5);
    currentStock = { ...data, ...scored };

    if (offline && cacheDate) {
      document.getElementById('offline-banner').classList.remove('hidden');
      document.getElementById('offline-date').textContent = cacheDate.toLocaleString();
    }

    renderResults(data, scored);

    // Patch highs1y with rolling 52-week high count from 1Y history
    const highs1yEl = document.getElementById('info-highs1y');
    if (highs1yEl) {
      const closes1y = (fullStockData?.history ?? []).map(h => h.value).filter(v => v != null && v > 0);
      highs1yEl.textContent = closes1y.length >= 5 ? countNewHighs(closes1y) : (scored.technicals?.highs?.y1 ?? t('noData'));
    }

    // Patch beta from calculated indicators if Yahoo didn't provide it
    if (fullStockData?.indicators?.beta != null && !data.beta) {
      const bEl = document.getElementById('info-beta');
      if (bEl) bEl.textContent = fullStockData.indicators.beta.toFixed(2);
    }

    saveSearchHistory(symbol, data.name, renderHistory);

    document.getElementById('results-loading').style.display = 'none';
    const resultsContent = document.getElementById('results-content');
    resultsContent.classList.remove('hidden');

    // ── Last updated timestamp ──
    const updatedBar  = document.getElementById('last-updated-bar');
    const updatedTime = document.getElementById('last-updated-time');
    if (updatedBar && updatedTime) {
      const now = new Date();
      updatedTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        + '  ·  ' + now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
      updatedBar.classList.remove('hidden');
    }
    // Trigger staggered fade-in-up animations on all sections
    resultsContent.classList.remove('did-animate');
    void resultsContent.offsetWidth; // force reflow to restart animations
    resultsContent.classList.add('did-animate');

    // ── SummaryGauge — 4-factor technical score (the primary score) ──
    const summaryContainer = document.getElementById('summary-gauge-container');
    if (summaryContainer) {
      const indicators    = fullStockData?.indicators ?? null;
      lastSummaryScored   = calcSummaryScore(data, indicators);
      lastFullStockData   = fullStockData;
      renderSummaryGauge(summaryContainer, lastSummaryScored);
    }

    loadChart(symbol, '1M');
    updateWatchlistBtn(symbol);
    updateCompareBtn(symbol);

    // Analysis Tables (Fundamental + Technical) — async, fills SPY row after initial render
    const fundamentalEl = document.getElementById('analysis-fundamental-section');
    const technicalEl   = document.getElementById('analysis-technical-section');
    if (fundamentalEl || technicalEl) {
      renderAnalysisTables(
        fundamentalEl,
        technicalEl,
        scored,
        data,
        fullStockData?.history ?? [],
        fullStockData?.indicators ?? null,
      );
    }

    // AI Insight — runs async, silently hides itself on error
    renderAIInsight(data.newsItems, symbol);

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

  const gaugeScore = document.getElementById('gauge-score');
  const gaugeLabel = document.getElementById('gauge-label');
  const partialWarn = document.getElementById('partial-data-warning');
  if (gaugeScore) gaugeScore.textContent = scored.score ?? '--';
  if (gaugeLabel) { gaugeLabel.textContent = t(scored.rating); gaugeLabel.className = `gauge-label badge-${scored.rating}`; }
  if (partialWarn) partialWarn.classList.toggle('hidden', !scored.isPartial);

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

  // ── ATH / Highs / Distance from High ─────────────────
  const athPrice = scored.technicals?.athPrice;
  const athEl = document.getElementById('info-ath');
  if (athEl) athEl.textContent = athPrice != null ? `${currency} ${athPrice.toFixed(2)}` : t('noData');

  const highs1yEl = document.getElementById('info-highs1y');
  if (highs1yEl) {
    const y1 = scored.technicals?.highs?.y1;
    highs1yEl.textContent = y1 != null ? y1 : t('noData');
  }

  const distHighEl = document.getElementById('info-dist-high');
  if (distHighEl) {
    if (data.price != null && data.high52w != null && data.high52w > 0) {
      const distPct = ((data.high52w - data.price) / data.high52w) * 100;
      distHighEl.textContent = distPct < 0.1 ? t('atHigh') : `-${distPct.toFixed(1)}%`;
      distHighEl.className = `info-value ${distPct < 5 ? 'positive' : distPct < 15 ? '' : 'negative'}`;
    } else {
      distHighEl.textContent = t('noData');
    }
  }

  renderCompanyCard(document.getElementById('company-card-container'), data);
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

  // Search
  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-btn');

  if (input) {
    input.addEventListener('input', () => showAutocomplete(input.value));
    input.addEventListener('focus', () => { if (!input.value.trim()) showRecentSearches(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        // If an autocomplete item is highlighted, confirm it; else do search
        if (!confirmAutocomplete()) doSearch(input.value);
      }
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
    if (!e.target.closest('.tb-search-wrap') && !e.target.closest('.search-wrap')) hideAutocomplete();
  });

  // Back buttons
  document.getElementById('btn-back')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-err')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-compare')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-watchlist')?.addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-about')?.addEventListener('click', () => navigateTo('home'));

  // Top-bar nav items
  document.querySelectorAll('.tb-nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page, page === 'results' ? currentStock?.symbol : null);
    });
  });

  // Watchlist toggle + haptic feedback
  document.getElementById('btn-watchlist-toggle')?.addEventListener('click', () => {
    if (!currentStock) return;
    const wasInList = isInWatchlist(currentStock.symbol);
    _toggleWatchlist(currentStock.symbol, currentStock.name, currentStock.rating, showNotification, updateWatchlistBtn, renderWatchlist);
    updateSidebarCount();
    // Haptic: vibrate only when ADDING to watchlist
    if (!wasInList) navigator.vibrate?.(50);
  });


  // Scroll to top
  document.getElementById('btn-share')?.addEventListener('click', () => {
    document.getElementById('page-results')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  document.body.dataset.page = 'home'; // initial page state for CSS targeting
  applyTheme();
  applyTranslations();
  syncTopbarHeight();
  window.addEventListener('resize', syncTopbarHeight);
  bindEvents();
  initInfoButtons(document.body);

  // Mark home as active in top-bar nav
  const homeBtn = document.querySelector('.tb-nav-btn[data-page="home"]');
  if (homeBtn) homeBtn.classList.add('active');

  // Move footer into active page
  const footer = document.querySelector('.app-footer');
  const initPage = document.querySelector('.page.active');
  if (footer && initPage) initPage.appendChild(footer);

  // Init WatchlistSidebar with callbacks
  initWatchlistSidebar(navigateTo, showNotification, updateWatchlistBtn, renderWatchlist);
  updateSidebarCount();

  checkURLParam();
  loadFearGreed();
  loadCryptoFearGreed();
  loadAAII();
  loadMarketIndices();
  loadTrending(navigateTo);
  renderHistory();
  renderHomeWatchlist();
  loadMacroData();
  loadCryptoPrices();
  loadUpcomingEvents();
  renderMarketStatus();
  loadDXY();
  loadForex();
  loadCommodities();
  loadSectorPerformance();
  loadMovers();

  // FNG toggle: Stocks ↔ Crypto
  let cryptoFngLoaded = true; // already loaded above
  document.querySelectorAll('.fng-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fng-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isStocks = btn.dataset.fng === 'stocks';
      document.getElementById('fng-container')?.classList.toggle('hidden', !isStocks);
      document.getElementById('fng-crypto-container')?.classList.toggle('hidden', isStocks);
    });
  });

  setInterval(() => checkWatchlistAlerts(showNotification), 15 * 60 * 1000);

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
