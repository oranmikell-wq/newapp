// TopPicks.js — "Top 5 by Indicator" block for the home page
// Scans a curated universe of stocks using Yahoo Finance data,
// scores each with calcScore (partial — no history/indicators),
// and displays the top 5 sorted by score descending.

import { t } from '../utils/i18n.js?v=5';
import { calcScore } from '../utils/scoring.js';
import { yahooFundamentals, yahooChart, parseAllData } from '../services/StockService.js';
import { cacheGet } from '../services/CacheService.js';

// ── Curated universe (30 well-known S&P 500 stocks across sectors) ──────────
const UNIVERSE = [
  'AAPL','MSFT','GOOGL','NVDA','META','AMZN','TSLA','V','MA','JPM',
  'UNH','LLY','JNJ','COST','WMT','XOM','PG','KO','MCD','HD',
  'NFLX','AMD','CRM','AVGO','ORCL','CAT','GS','BAC','NEE','ADBE',
];

// ── Cache key & TTL (1 hour) ─────────────────────────────────────────────────
const PICKS_KEY = 'bon-toppicks';
const PICKS_TTL = 60 * 60 * 1000; // 1 hour

function picksFromCache() {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    if (!raw) return null;
    const { picks, ts } = JSON.parse(raw);
    if (Date.now() - ts < PICKS_TTL) return picks;
    return null;
  } catch { return null; }
}

function picksToCache(picks) {
  try {
    localStorage.setItem(PICKS_KEY, JSON.stringify({ picks, ts: Date.now() }));
  } catch {}
}

// ── Fetch minimal data for one symbol ────────────────────────────────────────
async function fetchQuick(symbol) {
  // 1. Use existing 15-min price cache if available
  const cached = cacheGet(symbol);
  if (cached) return cached;

  // 2. Fetch Yahoo chart + fundamentals in parallel
  const [chartRaw, yfFund] = await Promise.allSettled([
    yahooChart(symbol, '1d', '1d'),
    yahooFundamentals(symbol),
  ]);

  const meta = chartRaw.status === 'fulfilled'
    ? chartRaw.value?.chart?.result?.[0]?.meta
    : null;
  if (!meta?.regularMarketPrice) return null;

  const fund = yfFund.status === 'fulfilled' ? yfFund.value : null;
  return parseAllData({ meta, yfFund: fund, stats: null, ratings: null, target: null, earning: null, newsResp: null, finviz: null }, symbol);
}

// ── Score all stocks in batches of 5 ─────────────────────────────────────────
async function scoreUniverse() {
  const BATCH = 5;
  const results = [];

  for (let i = 0; i < UNIVERSE.length; i += BATCH) {
    const batch = UNIVERSE.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(sym => fetchQuick(sym)));

    settled.forEach((res, idx) => {
      const sym = batch[idx];
      if (res.status !== 'fulfilled' || !res.value) return;
      const data = res.value;
      try {
        const scored = calcScore(data, [], {});
        if (scored.score != null) {
          results.push({
            symbol: sym,
            name: data.name ?? sym,
            score: scored.score,
            rating: scored.rating,
            price: data.price,
            changePct: data.changePct,
          });
        }
      } catch {}
    });

    // Small pause between batches to be kind to the API
    if (i + BATCH < UNIVERSE.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ── Rating → CSS class & emoji ────────────────────────────────────────────────
const BADGE = {
  buy:  { cls: 'tp-badge-buy',  emoji: '🟢' },
  wait: { cls: 'tp-badge-wait', emoji: '🟡' },
  sell: { cls: 'tp-badge-sell', emoji: '🔴' },
};

// ── Render one stock chip ─────────────────────────────────────────────────────
function renderChip(pick) {
  const b = BADGE[pick.rating] || BADGE.wait;
  const sign = pick.changePct >= 0 ? '+' : '';
  const chg = pick.changePct != null ? `${sign}${pick.changePct.toFixed(2)}%` : '';
  const chgCls = pick.changePct >= 0 ? 'tp-chg-up' : 'tp-chg-down';
  const shortName = pick.name.length > 18 ? pick.name.slice(0, 16) + '…' : pick.name;

  const chip = document.createElement('div');
  chip.className = 'tp-chip';
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  chip.dataset.symbol = pick.symbol;

  chip.innerHTML = `
    <div class="tp-chip-top">
      <span class="tp-sym">${pick.symbol}</span>
      <span class="tp-badge ${b.cls}">${b.emoji} ${pick.score}</span>
    </div>
    <div class="tp-name">${shortName}</div>
    <div class="tp-bottom">
      <span class="tp-price">${pick.price != null ? '$' + pick.price.toLocaleString(undefined, {maximumFractionDigits: 2}) : ''}</span>
      <span class="tp-chg ${chgCls}">${chg}</span>
    </div>`;

  return chip;
}

// ── Main render ───────────────────────────────────────────────────────────────
export async function renderTopPicks(container) {
  if (!container) return;

  // ── Section shell ──
  container.innerHTML = `
    <div class="tp-header">
      <h2 class="section-title">${t('topPicksTitle')}</h2>
      <span class="tp-subtitle">${t('topPicksSubtitle')}</span>
    </div>
    <div class="sidebar-card tp-card">
      <div id="tp-list" class="tp-list">
        ${[...Array(5)].map(() => '<div class="tp-chip tp-skeleton"></div>').join('')}
      </div>
      <p class="tp-disclaimer">${t('topPicksDisclaimer')}</p>
    </div>`;

  const list = container.querySelector('#tp-list');

  try {
    // Try cache first
    let picks = picksFromCache();

    if (!picks) {
      picks = await scoreUniverse();
      if (picks.length > 0) picksToCache(picks);
    }

    if (!picks || picks.length === 0) {
      list.innerHTML = `<p class="tp-no-data">${t('noData')}</p>`;
      return;
    }

    list.innerHTML = '';
    picks.forEach(pick => {
      const chip = renderChip(pick);
      chip.addEventListener('click', () => {
        if (typeof window.navigateTo === 'function') window.navigateTo('results', pick.symbol);
      });
      chip.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (typeof window.navigateTo === 'function') window.navigateTo('results', pick.symbol);
        }
      });
      list.appendChild(chip);
    });

  } catch {
    list.innerHTML = `<p class="tp-no-data">${t('noData')}</p>`;
  }
}
