// MarketMovers.js — Market Status, Commodities, Sectors, Gainers/Losers

import { fetchIndexQuote } from '../services/StockService.js';

// ── 1. Market Status (calculated from ET clock, no API) ──────────────────
export function renderMarketStatus() {
  const dot   = document.getElementById('market-status-dot');
  const label = document.getElementById('market-status-label');
  if (!dot || !label) return;

  const now  = new Date();
  const et   = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day  = et.getDay();   // 0=Sun 6=Sat
  const mins = et.getHours() * 60 + et.getMinutes();

  let open = false;
  let text = 'Market Closed';

  if (day === 0 || day === 6) {
    text = 'Market Closed (Weekend)';
  } else if (mins >= 570 && mins < 960) {   // 9:30–16:00
    open = true;
    text = 'Market Open';
  } else if (mins >= 240 && mins < 570) {   // 04:00–9:30 pre-market
    const left = 570 - mins;
    text = `Pre-Market · Opens in ${Math.floor(left / 60)}h ${left % 60}m`;
  } else {
    text = 'After Hours';
  }

  dot.className   = `market-status-dot ${open ? 'open' : 'closed'}`;
  label.textContent = text;
}

// ── 2. DXY (called by loadMarketIndices in main.js) ─────────────────────
export async function loadDXY() {
  const card    = document.getElementById('idx-dxy');
  if (!card) return;
  const priceEl  = card.querySelector('.market-price');
  const changeEl = card.querySelector('.market-change');
  try {
    const q = await fetchIndexQuote('DX-Y.NYB');
    if (q?.price != null) {
      priceEl.textContent  = q.price.toFixed(2);
      const sign = (q.changePct ?? 0) >= 0 ? '+' : '';
      changeEl.textContent = q.changePct != null ? `${sign}${q.changePct.toFixed(2)}%` : '--';
      const cls = (q.changePct ?? 0) >= 0 ? 'positive' : 'negative';
      changeEl.className = `market-change ${cls}`;
    }
  } catch { /* keep -- */ }
}

// ── 3. Commodities — Gold & Oil ──────────────────────────────────────────
const COMMODITIES = [
  { sym: 'GC=F', name: 'Gold'     },
  { sym: 'CL=F', name: 'Oil (WTI)' },
];

export async function loadCommodities() {
  const container = document.getElementById('commodities-container');
  if (!container) return;

  const results = await Promise.all(COMMODITIES.map(async ({ sym, name }) => {
    try {
      const q = await fetchIndexQuote(sym);
      return { name, price: q?.price ?? null, pct: q?.changePct ?? null };
    } catch { return { name, price: null, pct: null }; }
  }));

  container.innerHTML = results.map(({ name, price, pct }) => {
    const cls   = pct == null ? '' : pct >= 0 ? 'positive' : 'negative';
    const sign  = pct != null && pct >= 0 ? '+' : '';
    const pStr  = price != null ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--';
    const cStr  = pct  != null ? `${sign}${pct.toFixed(2)}%` : '--';
    return `<div class="market-card ${cls}">
      <span class="market-name">${name}</span>
      <span class="market-price">${pStr}</span>
      <span class="market-change ${cls}">${cStr}</span>
    </div>`;
  }).join('');
}

// ── 4. Sector Performance — SPDR ETFs ────────────────────────────────────
const SECTORS = [
  { sym: 'XLK',  name: 'Technology'      },
  { sym: 'XLF',  name: 'Financials'      },
  { sym: 'XLE',  name: 'Energy'          },
  { sym: 'XLV',  name: 'Health Care'     },
  { sym: 'XLY',  name: 'Consumer Disc.'  },
  { sym: 'XLI',  name: 'Industrials'     },
  { sym: 'XLC',  name: 'Comm. Services'  },
  { sym: 'XLRE', name: 'Real Estate'     },
  { sym: 'XLB',  name: 'Materials'       },
  { sym: 'XLU',  name: 'Utilities'       },
];

export async function loadSectorPerformance() {
  const container = document.getElementById('sector-container');
  if (!container) return;

  const results = await Promise.all(SECTORS.map(async ({ sym, name }) => {
    try {
      const q = await fetchIndexQuote(sym);
      return { name, pct: q?.changePct ?? null };
    } catch { return { name, pct: null }; }
  }));

  results.sort((a, b) => (b.pct ?? -99) - (a.pct ?? -99));
  const maxAbs = Math.max(...results.filter(r => r.pct != null).map(r => Math.abs(r.pct)), 1);

  container.innerHTML = results.map(({ name, pct }) => {
    const cls  = pct == null ? '' : pct >= 0 ? 'positive' : 'negative';
    const sign = pct != null && pct >= 0 ? '+' : '';
    const str  = pct != null ? `${sign}${pct.toFixed(2)}%` : '--';
    const w    = pct != null ? (Math.abs(pct) / maxAbs * 100).toFixed(1) : 0;
    return `<div class="sector-row">
      <span class="sector-name">${name}</span>
      <div class="sector-bar-wrap">
        <div class="sector-bar ${cls}" style="width:${w}%"></div>
      </div>
      <span class="sector-pct ${cls}">${str}</span>
    </div>`;
  }).join('');
}

// ── 5. Gainers & Losers — Yahoo Finance screener ─────────────────────────
async function fetchScreener(scrId) {
  const url     = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=5`;
  const proxied = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const ctrl    = new AbortController();
  const timer   = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res  = await fetch(proxied, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    return json?.finance?.result?.[0]?.quotes ?? [];
  } catch { clearTimeout(timer); return []; }
}

function renderMoverList(list, el) {
  if (!list.length) {
    el.innerHTML = '<p class="macro-error">Data unavailable</p>';
    return;
  }
  el.innerHTML = list.map(q => {
    const pct  = q.regularMarketChangePercent ?? 0;
    const cls  = pct >= 0 ? 'positive' : 'negative';
    const sign = pct >= 0 ? '+' : '';
    const price = (q.regularMarketPrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `<div class="mover-row">
      <div class="mover-left">
        <span class="mover-sym">${q.symbol}</span>
        <span class="mover-name">${q.shortName ?? ''}</span>
      </div>
      <div class="mover-right">
        <span class="mover-price">$${price}</span>
        <span class="mover-pct ${cls}">${sign}${pct.toFixed(2)}%</span>
      </div>
    </div>`;
  }).join('');
}

export async function loadMovers() {
  const gEl = document.getElementById('gainers-container');
  const lEl = document.getElementById('losers-container');
  if (!gEl && !lEl) return;

  const [gainers, losers] = await Promise.all([
    fetchScreener('day_gainers'),
    fetchScreener('day_losers'),
  ]);

  if (gEl) renderMoverList(gainers, gEl);
  if (lEl) renderMoverList(losers,  lEl);

  // Tab switching
  document.querySelectorAll('.movers-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.movers-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      gEl?.classList.toggle('hidden', tab !== 'gainers');
      lEl?.classList.toggle('hidden', tab !== 'losers');
    });
  });
}
