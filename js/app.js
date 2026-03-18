// app.js — ניהול ניווט, UI, אתחול

// ── S&P 500 + ת"א 125 autocomplete list ───────────────
const STOCK_LIST = [
  // S&P 500 (מייצגים)
  { symbol: 'AAPL',  name: 'Apple Inc.',            exchange: 'NASDAQ' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',       exchange: 'NASDAQ' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',    exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',         exchange: 'NASDAQ' },
  { symbol: 'META',  name: 'Meta Platforms',        exchange: 'NASDAQ' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',            exchange: 'NASDAQ' },
  { symbol: 'AVGO',  name: 'Broadcom Inc.',         exchange: 'NASDAQ' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',        exchange: 'NYSE'   },
  { symbol: 'LLY',   name: 'Eli Lilly',             exchange: 'NYSE'   },
  { symbol: 'V',     name: 'Visa Inc.',             exchange: 'NYSE'   },
  { symbol: 'UNH',   name: 'UnitedHealth Group',    exchange: 'NYSE'   },
  { symbol: 'XOM',   name: 'Exxon Mobil',           exchange: 'NYSE'   },
  { symbol: 'MA',    name: 'Mastercard',            exchange: 'NYSE'   },
  { symbol: 'COST',  name: 'Costco Wholesale',      exchange: 'NASDAQ' },
  { symbol: 'HD',    name: 'Home Depot',            exchange: 'NYSE'   },
  { symbol: 'WMT',   name: 'Walmart Inc.',          exchange: 'NYSE'   },
  { symbol: 'PG',    name: 'Procter & Gamble',      exchange: 'NYSE'   },
  { symbol: 'BAC',   name: 'Bank of America',       exchange: 'NYSE'   },
  { symbol: 'NFLX',  name: 'Netflix Inc.',          exchange: 'NASDAQ' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',exchange: 'NASDAQ' },
  { symbol: 'ORCL',  name: 'Oracle Corporation',    exchange: 'NYSE'   },
  { symbol: 'INTC',  name: 'Intel Corporation',     exchange: 'NASDAQ' },
  { symbol: 'CSCO',  name: 'Cisco Systems',         exchange: 'NASDAQ' },
  { symbol: 'DIS',   name: 'Walt Disney',           exchange: 'NYSE'   },
  { symbol: 'PYPL',  name: 'PayPal Holdings',       exchange: 'NASDAQ' },
  { symbol: 'ADBE',  name: 'Adobe Inc.',            exchange: 'NASDAQ' },
  { symbol: 'CRM',   name: 'Salesforce Inc.',       exchange: 'NYSE'   },
  { symbol: 'QCOM',  name: 'Qualcomm',              exchange: 'NASDAQ' },
  { symbol: 'PFE',   name: 'Pfizer Inc.',           exchange: 'NYSE'   },
  // ת"א 125
  { symbol: '1155.TA', name: 'בנק לאומי',           exchange: 'TASE' },
  { symbol: '1120.TA', name: 'בנק הפועלים',         exchange: 'TASE' },
  { symbol: '1082.TA', name: 'בנק דיסקונט',         exchange: 'TASE' },
  { symbol: '1044.TA', name: 'בנק מזרחי-טפחות',    exchange: 'TASE' },
  { symbol: '1084.TA', name: 'בנק הבינלאומי',       exchange: 'TASE' },
  { symbol: '5122.TA', name: 'חברת החשמל',          exchange: 'TASE' },
  { symbol: '1081.TA', name: 'בזק',                 exchange: 'TASE' },
  { symbol: '1602.TA', name: 'טבע תעשיות',          exchange: 'TASE' },
  { symbol: '7200.TA', name: 'אמדוקס',              exchange: 'TASE' },
  { symbol: '1094.TA', name: 'מגדל ביטוח',         exchange: 'TASE' },
  { symbol: '2588.TA', name: 'נייס סיסטמס',        exchange: 'TASE' },
  { symbol: '4590.TA', name: 'כיל',                 exchange: 'TASE' },
  { symbol: '2100.TA', name: 'אלביט מערכות',       exchange: 'TASE' },
  { symbol: '6450.TA', name: 'רפאל',                exchange: 'TASE' },
  { symbol: '1091.TA', name: 'הראל ביטוח',         exchange: 'TASE' },
];

// ── State ──────────────────────────────────────────────
let currentPage  = 'home';
let currentStock = null;
let autoRefreshTimer = null;
let lastTrendingData = null;

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  applyTranslations();
  bindEvents();
  checkURLParam();
  loadTrending();
  renderHistory();
  setInterval(checkWatchlistAlerts, 15 * 60 * 1000);
});

// ── Theme ──────────────────────────────────────────────
function applyTheme() {
  const theme = localStorage.getItem('bon-theme') || 'light';
  document.body.className = `theme-${theme}`;
  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('#btn-theme, #btn-theme-res, #btn-theme-cmp, #btn-theme-wl')
    .forEach(b => b.textContent = icon);
}

function toggleTheme() {
  const isDark = document.body.classList.contains('theme-dark');
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem('bon-theme', next);
  applyTheme();
  updateChartTheme(next === 'dark');
}

// ── Navigation ─────────────────────────────────────────
function navigateTo(page, symbol = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  currentPage = page;

  if (page === 'results' && symbol) loadResults(symbol);
  if (page === 'watchlist') renderWatchlist();
  if (page === 'compare')   renderCompare();
}

// ── URL param (?s=AAPL) ────────────────────────────────
function checkURLParam() {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('s');
  if (s) navigateTo('results', s.toUpperCase());
}

// ── Events ─────────────────────────────────────────────
function bindEvents() {
  // Theme toggles
  document.querySelectorAll('#btn-theme, #btn-theme-res, #btn-theme-cmp, #btn-theme-wl')
    .forEach(b => b.addEventListener('click', toggleTheme));

  // Lang toggles
  document.querySelectorAll('.lang-btn')
    .forEach(b => b.addEventListener('click', toggleLang));

  // Search
  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-btn');

  input.addEventListener('input', () => showAutocomplete(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch(input.value);
    if (e.key === 'ArrowDown') selectAutocomplete(1);
    if (e.key === 'ArrowUp')   selectAutocomplete(-1);
    if (e.key === 'Escape')    hideAutocomplete();
  });
  btn.addEventListener('click', () => doSearch(input.value));

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) hideAutocomplete();
  });

  // Back buttons
  document.getElementById('btn-back').addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-err').addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-compare').addEventListener('click', () => navigateTo('home'));
  document.getElementById('btn-back-watchlist').addEventListener('click', () => navigateTo('home'));

  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page, page === 'results' ? currentStock?.symbol : null);
    });
  });

  // Watchlist toggle
  document.getElementById('btn-watchlist-toggle').addEventListener('click', () => {
    if (!currentStock) return;
    toggleWatchlist(currentStock.symbol, currentStock.name, currentStock.rating);
  });

  // Share
  document.getElementById('btn-share').addEventListener('click', () => {
    if (!currentStock) return;
    const url = `${location.origin}${location.pathname}?s=${currentStock.symbol}`;
    navigator.clipboard.writeText(url).then(() => showNotification(t('linkCopied')));
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
  document.getElementById('btn-add-compare').addEventListener('click', () => {
    if (!currentStock) return;
    addToCompare(currentStock.symbol, currentStock.name);
  });
}

// ── Search ─────────────────────────────────────────────
function doSearch(query) {
  query = (query || '').trim().toUpperCase();
  if (!query) return;
  hideAutocomplete();
  navigateTo('results', query);
}

// ── Autocomplete ───────────────────────────────────────
let acIndex = -1;

function showAutocomplete(query) {
  const list = document.getElementById('autocomplete-list');
  query = query.trim().toUpperCase();
  if (!query) { hideAutocomplete(); return; }

  const matches = STOCK_LIST.filter(s =>
    s.symbol.includes(query) ||
    s.name.toUpperCase().includes(query)
  ).slice(0, 8);

  if (!matches.length) { hideAutocomplete(); return; }

  list.innerHTML = matches.map((s, i) => `
    <div class="autocomplete-item" data-index="${i}" data-symbol="${s.symbol}">
      <span class="ac-symbol">${s.symbol}</span>
      <span class="ac-name">${s.name}</span>
      <span class="ac-exchange">${s.exchange}</span>
    </div>`).join('');

  list.querySelectorAll('.autocomplete-item').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('search-input').value = el.dataset.symbol;
      hideAutocomplete();
      doSearch(el.dataset.symbol);
    });
  });

  acIndex = -1;
  list.classList.remove('hidden');
}

function selectAutocomplete(dir) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (!items.length) return;
  acIndex = Math.max(0, Math.min(items.length - 1, acIndex + dir));
  items.forEach((el, i) => el.classList.toggle('selected', i === acIndex));
  const selected = items[acIndex];
  if (selected) document.getElementById('search-input').value = selected.dataset.symbol;
}

function hideAutocomplete() {
  document.getElementById('autocomplete-list').classList.add('hidden');
  acIndex = -1;
}

// ── Trending ───────────────────────────────────────────
function renderTrendingList() {
  if (!lastTrendingData) return;
  const container = document.getElementById('trending-list');
  container.innerHTML = lastTrendingData.map((stock, i) => {
    const ratingKey = stock.rating === 'buy' ? 'buy' : stock.rating === 'wait' ? 'wait' : 'sell';
    const badgeClass = stock.rating === 'buy' ? 'badge-buy-bg' : stock.rating === 'wait' ? 'badge-wait-bg' : 'badge-sell-bg';
    const changePct = stock.changePct != null ? `${stock.changePct > 0 ? '+' : ''}${stock.changePct.toFixed(1)}%` : '';
    return `
      <div class="trending-item" data-symbol="${stock.symbol}">
        <span class="trending-rank">${i + 1}</span>
        <span class="trending-symbol">${stock.symbol}</span>
        <span class="trending-name">${stock.name}</span>
        <span class="trending-change ${stock.changePct >= 0 ? 'badge-buy' : 'badge-sell'}">${changePct}</span>
        <span class="trending-badge ${badgeClass}">${t(ratingKey)}</span>
      </div>`;
  }).join('');
  container.querySelectorAll('.trending-item').forEach(el => {
    el.addEventListener('click', () => navigateTo('results', el.dataset.symbol));
  });
}

async function loadTrending() {
  const container = document.getElementById('trending-list');
  try {
    const symbols = await fetchTrending();
    lastTrendingData = [];
    for (const sym of symbols) {
      try {
        const { data } = await fetchAllData(sym, true);
        const h5 = await fetchHistory(sym, '5Y');
        const scored = calcScore(data, h5);
        lastTrendingData.push({ ...data, ...scored });
        renderTrendingList();
      } catch (e) {
        // skip failed stock, continue
      }
    }
  } catch (e) {
    container.innerHTML = `<p style="padding:16px;color:var(--text-3)">${e.message}</p>`;
  }
}

// ── Results ────────────────────────────────────────────
async function loadResults(symbol) {
  // Show loading
  document.getElementById('results-loading').style.display = 'flex';
  document.getElementById('results-content').classList.add('hidden');
  document.getElementById('results-error').classList.add('hidden');
  document.getElementById('offline-banner').classList.add('hidden');

  // Stop previous auto-refresh
  clearInterval(autoRefreshTimer);

  try {
    const { data, offline, cacheDate } = await fetchAllData(symbol);

    if (!data) throw new Error(t('stockNotFound'));

    const h5 = await fetchHistory(symbol, '5Y').catch(() => []);
    const scored = calcScore(data, h5);

    currentStock = { ...data, ...scored };

    // TASE closed?
    if (data.isTASE && data.marketState === 'CLOSED') {
      // show closed badge — handled in renderResults
    }

    // Offline banner
    if (offline && cacheDate) {
      document.getElementById('offline-banner').classList.remove('hidden');
      document.getElementById('offline-date').textContent = cacheDate.toLocaleString();
    }

    renderResults(data, scored);
    saveSearchHistory(symbol, data.name);

    document.getElementById('results-loading').style.display = 'none';
    document.getElementById('results-content').classList.remove('hidden');

    // Redraw gauge now that canvas is visible (getBoundingClientRect returns correct size)
    drawGauge(scored.score, scored.rating);

    // Load chart
    loadChart(symbol, '1M');
    updateWatchlistBtn(symbol);
    updateCompareBtn(symbol);

    // Auto-refresh every 15 min
    autoRefreshTimer = setInterval(() => loadResults(symbol), 15 * 60 * 1000);

  } catch (e) {
    document.getElementById('results-loading').style.display = 'none';
    document.getElementById('results-error').classList.remove('hidden');
    document.getElementById('error-msg').textContent =
      e.message === 'no_data' ? t('stockNotFound') : e.message;
  }
}

function renderResults(data, scored) {
  // Header
  document.getElementById('res-symbol').textContent = data.symbol;
  document.getElementById('res-name').textContent   = data.name || '';

  // Gauge
  drawGauge(scored.score, scored.rating);
  document.getElementById('gauge-score').textContent = scored.score ?? '--';
  document.getElementById('gauge-label').textContent = t(scored.rating);
  document.getElementById('gauge-label').className = `gauge-label badge-${scored.rating}`;
  document.getElementById('partial-data-warning').classList.toggle('hidden', !scored.isPartial);

  // Info cards
  const fmt = (n, dec = 2) => n != null ? n.toFixed(dec) : t('noData');
  const currency = data.currency || 'USD';

  // Price
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

  // Market cap
  document.getElementById('info-mktcap').textContent = formatMarketCap(data.marketCap);

  // Beta
  document.getElementById('info-beta').textContent = fmt(data.beta);

  // Dividend
  document.getElementById('info-dividend').textContent =
    data.dividend != null ? `${data.dividend.toFixed(2)}%` : t('noData');

  // Earnings
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

  // Price target
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

  // Criteria table
  renderCriteriaTable(scored, data);

  // News
  renderNews(data.newsItems);
}

// ── Gauge (canvas) ─────────────────────────────────────
function drawGauge(score, rating) {
  const canvas = document.getElementById('gauge-canvas');
  // Match canvas buffer to CSS display size (sharp on desktop)
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0) { canvas.width = Math.round(rect.width); canvas.height = Math.round(rect.height); }
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H - 8;
  const r  = Math.min(W, H * 2) / 2 - 20;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineWidth = 18;
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg-3').trim() || '#f1f5f9';
  ctx.stroke();

  if (score == null) return;

  // Colored arc
  const pct     = score / 100;
  const endAngle = Math.PI + pct * Math.PI;
  const gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  gradient.addColorStop(0,   '#dc2626');
  gradient.addColorStop(0.4, '#ca8a04');
  gradient.addColorStop(1,   '#16a34a');

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, endAngle);
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.strokeStyle = gradient;
  ctx.stroke();

  // Needle
  const needleAngle = Math.PI + pct * Math.PI;
  const nx = cx + (r - 10) * Math.cos(needleAngle);
  const ny = cy + (r - 10) * Math.sin(needleAngle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.lineWidth = 3;
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#0f172a';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim();
  ctx.fill();
}

// ── Criteria Table ─────────────────────────────────────
function renderCriteriaTable(scored, data) {
  const container = document.getElementById('criteria-table');

  const CRITERIA = [
    { key: 'eps',          icon: '📈', weight: '18%', rawData: () => data.epsGrowth != null ? [`EPS Growth: ${data.epsGrowth.toFixed(1)}%`] : [] },
    { key: 'multiples',    icon: '💰', weight: '18%', rawData: () => [data.pe && `P/E: ${data.pe.toFixed(1)}`, data.pb && `P/B: ${data.pb.toFixed(1)}`, data.ps && `P/S: ${data.ps.toFixed(1)}`].filter(Boolean) },
    { key: 'revenue',      icon: '🏢', weight: '12%', rawData: () => data.revenueGrowth != null ? [`Revenue Growth: ${data.revenueGrowth.toFixed(1)}%`] : [] },
    { key: 'analysts',     icon: '🔬', weight: '12%', rawData: () => data.analystScore ? [`Buy: ${data.analystScore.buy + data.analystScore.strongBuy}`, `Hold: ${data.analystScore.hold}`, `Sell: ${data.analystScore.sell}`] : [] },
    { key: 'momentum',     icon: '🚀', weight: '12%', rawData: () => [data.changePct != null && `שינוי יומי: ${data.changePct.toFixed(2)}%`, data.high52w && `52w High: ${data.high52w}`].filter(Boolean) },
    { key: 'institutional',icon: '🏦', weight: '8%',  rawData: () => data.instPct != null ? [`אחזקות: ${(data.instPct * 100).toFixed(1)}%`] : [] },
    { key: 'debt',         icon: '⚖️', weight: '8%',  rawData: () => data.debtEquity != null ? [`D/E: ${data.debtEquity.toFixed(1)}`] : [] },
    { key: 'technical',    icon: '📊', weight: '6%',  rawData: () => [scored.technicals?.rsi && `RSI: ${scored.technicals.rsi.toFixed(1)}`, scored.technicals?.macd && `MACD: ${scored.technicals.macd.toFixed(2)}`].filter(Boolean) },
    { key: 'ath',          icon: '🏔️', weight: '4%',  rawData: () => {
        if (data.price == null || data.high52w == null) return [];
        const distPct = Math.max(0, ((data.high52w - data.price) / data.high52w) * 100);
        return [distPct < 0.1 ? 'בשיא השנתי' : `${distPct.toFixed(1)}% מהשיא השנתי`];
      }},
    { key: 'highs',        icon: '⭐', weight: '2%',  rawData: () => scored.technicals?.highs ? [`1Y: ${scored.technicals.highs.y1}`, `3Y: ${scored.technicals.highs.y3}`, `5Y: ${scored.technicals.highs.y5}`] : [] },
  ];

  container.innerHTML = CRITERIA.map(c => {
    const score = scored.criteria[c.key];
    const hasData = score != null;
    const scoreDisplay = hasData ? Math.round(score) : t('noData');
    const badgeClass = !hasData ? 'score-none' : score >= 66 ? 'score-high' : score >= 41 ? 'score-mid' : 'score-low';
    const barColor   = !hasData ? 'var(--border)' : score >= 66 ? 'var(--green)' : score >= 41 ? 'var(--yellow)' : 'var(--red)';
    const rawItems   = c.rawData();

    return `
      <div class="criteria-row" onclick="this.classList.toggle('expanded')">
        <div class="criteria-row-header">
          <span class="criteria-icon">${c.icon}</span>
          <span class="criteria-name">${t('criteria_' + c.key)}</span>
          <span class="criteria-score-badge ${badgeClass}">${scoreDisplay}</span>
        </div>
        <div class="criteria-bar-wrap">
          <div class="criteria-bar" style="width:${hasData ? score : 0}%;background:${barColor}"></div>
        </div>
        <div class="criteria-desc">
          <p>${t('criteria_' + c.key + '_desc')}</p>
          ${rawItems.length ? `<div class="criteria-data">${rawItems.map(r => `<span class="criteria-data-item">${r}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── News ───────────────────────────────────────────────
function renderNews(items) {
  const container = document.getElementById('news-list');
  if (!items || !items.length) {
    container.innerHTML = `<p style="color:var(--text-3);font-size:13px">${t('noData')}</p>`;
    return;
  }
  container.innerHTML = items.map(n => `
    <a class="news-item" href="${n.url}" target="_blank" rel="noopener">
      ${n.image ? `<img class="news-thumb" src="${n.image}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="news-body">
        <div class="news-headline">${n.headline}</div>
        <div class="news-meta">${n.source} · ${new Date(n.datetime).toLocaleDateString()}</div>
      </div>
    </a>`).join('');
}

// ── Search History ─────────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem('bon-history') || '[]'); }
  catch { return []; }
}

function saveSearchHistory(symbol, name) {
  let hist = getHistory().filter(h => h.symbol !== symbol);
  hist.unshift({ symbol, name });
  hist = hist.slice(0, 10);
  localStorage.setItem('bon-history', JSON.stringify(hist));
  renderHistory();
}

function renderHistory() {
  const hist = getHistory();
  const section = document.getElementById('history-section');
  const container = document.getElementById('history-list');
  if (!hist.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  container.innerHTML = hist.map(h => `
    <div class="history-item" data-symbol="${h.symbol}">
      <span>${h.symbol}</span>
      <button class="history-remove" onclick="removeHistory('${h.symbol}');event.stopPropagation()">✕</button>
    </div>`).join('');
  container.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => navigateTo('results', el.dataset.symbol));
  });
}

function removeHistory(symbol) {
  const hist = getHistory().filter(h => h.symbol !== symbol);
  localStorage.setItem('bon-history', JSON.stringify(hist));
  renderHistory();
}

// ── Notification ───────────────────────────────────────
let notifTimer = null;
function showNotification(msg) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ── Service Worker ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
