// app.js — ניהול ניווט, UI, אתחול

// ── S&P 500 + ת"א 125 + Crypto autocomplete list ──────
const STOCK_LIST = [
  // ── Top S&P 500 by market cap ──
  { symbol: 'AAPL',  name: 'Apple Inc.',                  exchange: 'NASDAQ' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',       exchange: 'NASDAQ' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',          exchange: 'NASDAQ' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',             exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)',     exchange: 'NASDAQ' },
  { symbol: 'GOOG',  name: 'Alphabet Inc. (Class C)',     exchange: 'NASDAQ' },
  { symbol: 'META',  name: 'Meta Platforms',              exchange: 'NASDAQ' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',                  exchange: 'NASDAQ' },
  { symbol: 'AVGO',  name: 'Broadcom Inc.',               exchange: 'NASDAQ' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway',          exchange: 'NYSE'   },
  { symbol: 'JPM',   name: 'JPMorgan Chase',              exchange: 'NYSE'   },
  { symbol: 'LLY',   name: 'Eli Lilly',                   exchange: 'NYSE'   },
  { symbol: 'V',     name: 'Visa Inc.',                   exchange: 'NYSE'   },
  { symbol: 'UNH',   name: 'UnitedHealth Group',          exchange: 'NYSE'   },
  { symbol: 'XOM',   name: 'Exxon Mobil',                 exchange: 'NYSE'   },
  { symbol: 'MA',    name: 'Mastercard',                  exchange: 'NYSE'   },
  { symbol: 'COST',  name: 'Costco Wholesale',            exchange: 'NASDAQ' },
  { symbol: 'HD',    name: 'Home Depot',                  exchange: 'NYSE'   },
  { symbol: 'WMT',   name: 'Walmart Inc.',                exchange: 'NYSE'   },
  { symbol: 'PG',    name: 'Procter & Gamble',            exchange: 'NYSE'   },
  { symbol: 'NFLX',  name: 'Netflix Inc.',                exchange: 'NASDAQ' },
  { symbol: 'BAC',   name: 'Bank of America',             exchange: 'NYSE'   },
  { symbol: 'ORCL',  name: 'Oracle Corporation',          exchange: 'NYSE'   },
  { symbol: 'AMD',   name: 'Advanced Micro Devices',      exchange: 'NASDAQ' },
  { symbol: 'WFC',   name: 'Wells Fargo',                 exchange: 'NYSE'   },
  { symbol: 'ABBV',  name: 'AbbVie Inc.',                 exchange: 'NYSE'   },
  { symbol: 'NOW',   name: 'ServiceNow Inc.',             exchange: 'NYSE'   },
  { symbol: 'PM',    name: 'Philip Morris',               exchange: 'NYSE'   },
  { symbol: 'GS',    name: 'Goldman Sachs',               exchange: 'NYSE'   },
  { symbol: 'CAT',   name: 'Caterpillar Inc.',            exchange: 'NYSE'   },
  { symbol: 'ISRG',  name: 'Intuitive Surgical',          exchange: 'NASDAQ' },
  { symbol: 'IBM',   name: 'IBM Corporation',             exchange: 'NYSE'   },
  { symbol: 'RTX',   name: 'RTX Corporation (Raytheon)',  exchange: 'NYSE'   },
  { symbol: 'INTU',  name: 'Intuit Inc.',                 exchange: 'NASDAQ' },
  { symbol: 'TXN',   name: 'Texas Instruments',           exchange: 'NASDAQ' },
  { symbol: 'AMGN',  name: 'Amgen Inc.',                  exchange: 'NASDAQ' },
  { symbol: 'SPGI',  name: 'S&P Global Inc.',             exchange: 'NYSE'   },
  { symbol: 'BKNG',  name: 'Booking Holdings',            exchange: 'NASDAQ' },
  { symbol: 'MS',    name: 'Morgan Stanley',              exchange: 'NYSE'   },
  { symbol: 'PANW',  name: 'Palo Alto Networks',          exchange: 'NASDAQ' },
  { symbol: 'HON',   name: 'Honeywell International',     exchange: 'NASDAQ' },
  { symbol: 'NEE',   name: 'NextEra Energy',              exchange: 'NYSE'   },
  { symbol: 'MU',    name: 'Micron Technology',           exchange: 'NASDAQ' },
  { symbol: 'VRTX',  name: 'Vertex Pharmaceuticals',      exchange: 'NASDAQ' },
  { symbol: 'AXP',   name: 'American Express',            exchange: 'NYSE'   },
  { symbol: 'ETN',   name: 'Eaton Corporation',           exchange: 'NYSE'   },
  { symbol: 'LRCX',  name: 'Lam Research',                exchange: 'NASDAQ' },
  { symbol: 'KLAC',  name: 'KLA Corporation',             exchange: 'NASDAQ' },
  { symbol: 'ANET',  name: 'Arista Networks',             exchange: 'NYSE'   },
  { symbol: 'SYK',   name: 'Stryker Corporation',         exchange: 'NYSE'   },
  { symbol: 'REGN',  name: 'Regeneron Pharmaceuticals',   exchange: 'NASDAQ' },
  { symbol: 'BX',    name: 'Blackstone Inc.',             exchange: 'NYSE'   },
  { symbol: 'LOW',   name: "Lowe's Companies",            exchange: 'NYSE'   },
  { symbol: 'PLD',   name: 'Prologis Inc.',               exchange: 'NYSE'   },
  { symbol: 'SCHW',  name: 'Charles Schwab',              exchange: 'NYSE'   },
  { symbol: 'MDLZ',  name: 'Mondelez International',      exchange: 'NASDAQ' },
  { symbol: 'CI',    name: 'Cigna Group',                 exchange: 'NYSE'   },
  { symbol: 'CB',    name: 'Chubb Limited',               exchange: 'NYSE'   },
  { symbol: 'ADI',   name: 'Analog Devices',              exchange: 'NASDAQ' },
  { symbol: 'APH',   name: 'Amphenol Corporation',        exchange: 'NYSE'   },
  { symbol: 'CRWD',  name: 'CrowdStrike Holdings',        exchange: 'NASDAQ' },
  { symbol: 'MELI',  name: 'MercadoLibre Inc.',           exchange: 'NASDAQ' },
  { symbol: 'SNPS',  name: 'Synopsys Inc.',               exchange: 'NASDAQ' },
  { symbol: 'CDNS',  name: 'Cadence Design Systems',      exchange: 'NASDAQ' },
  { symbol: 'NKE',   name: 'Nike Inc.',                   exchange: 'NYSE'   },
  { symbol: 'KO',    name: 'Coca-Cola Company',           exchange: 'NYSE'   },
  { symbol: 'PEP',   name: 'PepsiCo Inc.',                exchange: 'NASDAQ' },
  { symbol: 'UNP',   name: 'Union Pacific',               exchange: 'NYSE'   },
  { symbol: 'MMC',   name: 'Marsh & McLennan',            exchange: 'NYSE'   },
  { symbol: 'SO',    name: 'Southern Company',            exchange: 'NYSE'   },
  { symbol: 'ICE',   name: 'Intercontinental Exchange',   exchange: 'NYSE'   },
  { symbol: 'AON',   name: 'Aon plc',                     exchange: 'NYSE'   },
  { symbol: 'CME',   name: 'CME Group',                   exchange: 'NASDAQ' },
  { symbol: 'SHW',   name: 'Sherwin-Williams',            exchange: 'NYSE'   },
  { symbol: 'GE',    name: 'GE Aerospace',                exchange: 'NYSE'   },
  { symbol: 'DE',    name: 'Deere & Company',             exchange: 'NYSE'   },
  { symbol: 'EQIX',  name: 'Equinix Inc.',                exchange: 'NASDAQ' },
  { symbol: 'MCO',   name: 'Moody\'s Corporation',        exchange: 'NYSE'   },
  { symbol: 'FI',    name: 'Fiserv Inc.',                 exchange: 'NYSE'   },
  { symbol: 'MCD',   name: 'McDonald\'s Corporation',     exchange: 'NYSE'   },
  { symbol: 'MSI',   name: 'Motorola Solutions',          exchange: 'NYSE'   },
  { symbol: 'ELV',   name: 'Elevance Health',             exchange: 'NYSE'   },
  { symbol: 'BDX',   name: 'Becton Dickinson',            exchange: 'NYSE'   },
  { symbol: 'CL',    name: 'Colgate-Palmolive',           exchange: 'NYSE'   },
  { symbol: 'TJX',   name: 'TJX Companies',               exchange: 'NYSE'   },
  { symbol: 'CVS',   name: 'CVS Health',                  exchange: 'NYSE'   },
  { symbol: 'MMM',   name: '3M Company',                  exchange: 'NYSE'   },
  { symbol: 'GILD',  name: 'Gilead Sciences',             exchange: 'NASDAQ' },
  { symbol: 'PH',    name: 'Parker-Hannifin',             exchange: 'NYSE'   },
  { symbol: 'ECL',   name: 'Ecolab Inc.',                 exchange: 'NYSE'   },
  { symbol: 'CTAS',  name: 'Cintas Corporation',          exchange: 'NASDAQ' },
  { symbol: 'CMG',   name: 'Chipotle Mexican Grill',      exchange: 'NYSE'   },
  { symbol: 'CARR',  name: 'Carrier Global',              exchange: 'NYSE'   },
  { symbol: 'WELL',  name: 'Welltower Inc.',              exchange: 'NYSE'   },
  { symbol: 'APD',   name: 'Air Products & Chemicals',    exchange: 'NASDAQ' },
  { symbol: 'UBER',  name: 'Uber Technologies',           exchange: 'NYSE'   },
  { symbol: 'ABNB',  name: 'Airbnb Inc.',                 exchange: 'NASDAQ' },
  { symbol: 'SPOT',  name: 'Spotify Technology',          exchange: 'NYSE'   },
  { symbol: 'SHOP',  name: 'Shopify Inc.',                exchange: 'NYSE'   },
  { symbol: 'SQ',    name: 'Block Inc.',                  exchange: 'NYSE'   },
  { symbol: 'COIN',  name: 'Coinbase Global',             exchange: 'NASDAQ' },
  { symbol: 'RBLX',  name: 'Roblox Corporation',          exchange: 'NYSE'   },
  { symbol: 'SNAP',  name: 'Snap Inc.',                   exchange: 'NYSE'   },
  { symbol: 'PINS',  name: 'Pinterest Inc.',              exchange: 'NYSE'   },
  { symbol: 'TWLO',  name: 'Twilio Inc.',                 exchange: 'NYSE'   },
  { symbol: 'NET',   name: 'Cloudflare Inc.',             exchange: 'NYSE'   },
  { symbol: 'DDOG',  name: 'Datadog Inc.',                exchange: 'NASDAQ' },
  { symbol: 'ZS',    name: 'Zscaler Inc.',                exchange: 'NASDAQ' },
  { symbol: 'SNOW',  name: 'Snowflake Inc.',              exchange: 'NYSE'   },
  { symbol: 'PLTR',  name: 'Palantir Technologies',       exchange: 'NASDAQ' },
  { symbol: 'ARM',   name: 'Arm Holdings',                exchange: 'NASDAQ' },
  { symbol: 'SMCI',  name: 'Super Micro Computer',        exchange: 'NASDAQ' },
  { symbol: 'CEG',   name: 'Constellation Energy',        exchange: 'NASDAQ' },
  { symbol: 'VST',   name: 'Vistra Corp',                 exchange: 'NYSE'   },
  { symbol: 'VZ',    name: 'Verizon Communications',      exchange: 'NYSE'   },
  { symbol: 'T',     name: 'AT&T Inc.',                   exchange: 'NYSE'   },
  { symbol: 'TMUS',  name: 'T-Mobile US',                 exchange: 'NASDAQ' },
  { symbol: 'INTC',  name: 'Intel Corporation',           exchange: 'NASDAQ' },
  { symbol: 'CSCO',  name: 'Cisco Systems',               exchange: 'NASDAQ' },
  { symbol: 'DIS',   name: 'Walt Disney',                 exchange: 'NYSE'   },
  { symbol: 'PYPL',  name: 'PayPal Holdings',             exchange: 'NASDAQ' },
  { symbol: 'ADBE',  name: 'Adobe Inc.',                  exchange: 'NASDAQ' },
  { symbol: 'CRM',   name: 'Salesforce Inc.',             exchange: 'NYSE'   },
  { symbol: 'QCOM',  name: 'Qualcomm',                    exchange: 'NASDAQ' },
  { symbol: 'PFE',   name: 'Pfizer Inc.',                 exchange: 'NYSE'   },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',           exchange: 'NYSE'   },
  { symbol: 'MRK',   name: 'Merck & Co.',                 exchange: 'NYSE'   },
  { symbol: 'ABT',   name: 'Abbott Laboratories',         exchange: 'NYSE'   },
  { symbol: 'TMO',   name: 'Thermo Fisher Scientific',    exchange: 'NYSE'   },
  { symbol: 'DHR',   name: 'Danaher Corporation',         exchange: 'NYSE'   },
  { symbol: 'BMY',   name: 'Bristol-Myers Squibb',        exchange: 'NYSE'   },
  { symbol: 'CVX',   name: 'Chevron Corporation',         exchange: 'NYSE'   },
  { symbol: 'COP',   name: 'ConocoPhillips',              exchange: 'NASDAQ' },
  { symbol: 'SLB',   name: 'Schlumberger (SLB)',          exchange: 'NYSE'   },
  { symbol: 'LIN',   name: 'Linde plc',                   exchange: 'NASDAQ' },
  { symbol: 'DD',    name: 'DuPont de Nemours',           exchange: 'NYSE'   },
  // ── International (ADR / direct) ──
  { symbol: 'TSM',   name: 'Taiwan Semiconductor (TSMC)', exchange: 'NYSE'   },
  { symbol: 'ASML',  name: 'ASML Holding',                exchange: 'NASDAQ' },
  { symbol: 'NVO',   name: 'Novo Nordisk',                exchange: 'NYSE'   },
  { symbol: 'SAP',   name: 'SAP SE',                      exchange: 'NYSE'   },
  { symbol: 'TM',    name: 'Toyota Motor',                exchange: 'NYSE'   },
  { symbol: 'SONY',  name: 'Sony Group',                  exchange: 'NYSE'   },
  { symbol: 'BABA',  name: 'Alibaba Group',               exchange: 'NYSE'   },
  { symbol: 'JD',    name: 'JD.com Inc.',                 exchange: 'NASDAQ' },
  { symbol: 'BIDU',  name: 'Baidu Inc.',                  exchange: 'NASDAQ' },
  { symbol: 'SE',    name: 'Sea Limited',                 exchange: 'NYSE'   },
  { symbol: 'GRAB',  name: 'Grab Holdings',               exchange: 'NASDAQ' },
  // ── Crypto ──
  { symbol: 'BTC-USD',   name: 'Bitcoin',                 exchange: 'Crypto' },
  { symbol: 'ETH-USD',   name: 'Ethereum',                exchange: 'Crypto' },
  { symbol: 'BNB-USD',   name: 'Binance Coin',            exchange: 'Crypto' },
  { symbol: 'SOL-USD',   name: 'Solana',                  exchange: 'Crypto' },
  { symbol: 'XRP-USD',   name: 'Ripple (XRP)',            exchange: 'Crypto' },
  { symbol: 'DOGE-USD',  name: 'Dogecoin',                exchange: 'Crypto' },
  { symbol: 'ADA-USD',   name: 'Cardano',                 exchange: 'Crypto' },
  { symbol: 'AVAX-USD',  name: 'Avalanche',               exchange: 'Crypto' },
  { symbol: 'LINK-USD',  name: 'Chainlink',               exchange: 'Crypto' },
  { symbol: 'DOT-USD',   name: 'Polkadot',                exchange: 'Crypto' },
  { symbol: 'MATIC-USD', name: 'Polygon',                 exchange: 'Crypto' },
  { symbol: 'UNI-USD',   name: 'Uniswap',                 exchange: 'Crypto' },
  { symbol: 'LTC-USD',   name: 'Litecoin',                exchange: 'Crypto' },
  { symbol: 'BCH-USD',   name: 'Bitcoin Cash',            exchange: 'Crypto' },
  { symbol: 'ATOM-USD',  name: 'Cosmos',                  exchange: 'Crypto' },
  { symbol: 'NEAR-USD',  name: 'NEAR Protocol',           exchange: 'Crypto' },
  { symbol: 'ICP-USD',   name: 'Internet Computer',       exchange: 'Crypto' },
  { symbol: 'APT-USD',   name: 'Aptos',                   exchange: 'Crypto' },
  { symbol: 'ARB-USD',   name: 'Arbitrum',                exchange: 'Crypto' },
  { symbol: 'OP-USD',    name: 'Optimism',                exchange: 'Crypto' },
  // ── ת"א 125 ──
  { symbol: '1155.TA', name: 'בנק לאומי',                exchange: 'TASE' },
  { symbol: '1120.TA', name: 'בנק הפועלים',              exchange: 'TASE' },
  { symbol: '1082.TA', name: 'בנק דיסקונט',              exchange: 'TASE' },
  { symbol: '1044.TA', name: 'בנק מזרחי-טפחות',         exchange: 'TASE' },
  { symbol: '1084.TA', name: 'בנק הבינלאומי',            exchange: 'TASE' },
  { symbol: '1602.TA', name: 'טבע תעשיות',               exchange: 'TASE' },
  { symbol: '2100.TA', name: 'אלביט מערכות',             exchange: 'TASE' },
  { symbol: '7200.TA', name: 'אמדוקס',                   exchange: 'TASE' },
  { symbol: '2588.TA', name: 'נייס סיסטמס',             exchange: 'TASE' },
  { symbol: '4590.TA', name: 'כיל',                      exchange: 'TASE' },
  { symbol: '5122.TA', name: 'חברת החשמל',               exchange: 'TASE' },
  { symbol: '1081.TA', name: 'בזק',                      exchange: 'TASE' },
  { symbol: '1094.TA', name: 'מגדל ביטוח',               exchange: 'TASE' },
  { symbol: '1091.TA', name: 'הראל ביטוח',               exchange: 'TASE' },
  { symbol: '6450.TA', name: 'רפאל',                     exchange: 'TASE' },
  { symbol: '6126.TA', name: 'אייס פאואר',               exchange: 'TASE' },
  { symbol: '3570.TA', name: 'אסם',                      exchange: 'TASE' },
  { symbol: '3672.TA', name: 'שטראוס גרופ',              exchange: 'TASE' },
  { symbol: '1680.TA', name: 'מנורה מבטחים',             exchange: 'TASE' },
  { symbol: '6998.TA', name: 'מלאנוקס טכנולוגיות',      exchange: 'TASE' },
  { symbol: '1995.TA', name: 'גזית גלוב',                exchange: 'TASE' },
  { symbol: '3290.TA', name: 'אמות השקעות',              exchange: 'TASE' },
  { symbol: '6310.TA', name: 'קמהדע',                    exchange: 'TASE' },
  { symbol: '4902.TA', name: 'כיל (ICL)',                 exchange: 'TASE' },
  { symbol: '3010.TA', name: 'אאורה נדל"ן',              exchange: 'TASE' },
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
  // Mark home as active in drawer
  const homeBtn = document.querySelector('.drawer-nav-item[data-page="home"]');
  if (homeBtn) homeBtn.classList.add('active');
  checkURLParam();
  loadTrending();
  renderHistory();
  setInterval(checkWatchlistAlerts, 15 * 60 * 1000);
});

// ── Drawer ─────────────────────────────────────────────
function openDrawer() {
  document.getElementById('nav-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('nav-drawer').removeAttribute('aria-hidden');
}

function closeDrawer() {
  document.getElementById('nav-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('nav-drawer').setAttribute('aria-hidden', 'true');
}

// ── Theme ──────────────────────────────────────────────
function applyTheme() {
  const theme = localStorage.getItem('bon-theme') || 'light';
  document.body.className = `theme-${theme}`;
  const btn = document.getElementById('btn-theme-drawer');
  if (btn) btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
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
  closeDrawer();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  // Update drawer active state
  document.querySelectorAll('.drawer-nav-item').forEach(b => b.classList.remove('active'));
  const drawerBtn = document.querySelector(`.drawer-nav-item[data-page="${page}"]`);
  if (drawerBtn) drawerBtn.classList.add('active');
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
  // Drawer theme + lang
  document.getElementById('btn-theme-drawer').addEventListener('click', toggleTheme);
  document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', toggleLang));

  // Close drawer on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

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
  document.getElementById('btn-back-about').addEventListener('click', () => navigateTo('home'));

  // Drawer nav items
  document.querySelectorAll('.drawer-nav-item').forEach(btn => {
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
let acDebounceTimer = null;
let acLastQuery = '';

function renderAutocompleteItems(matches) {
  const list = document.getElementById('autocomplete-list');
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

async function fetchYahooSearch(query) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableNavLinks=false`;
    const raw = await fetchProxy(url);
    const quotes = raw?.quotes || [];
    return quotes
      .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'CRYPTOCURRENCY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND'))
      .slice(0, 8)
      .map(q => ({
        symbol:   q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
      }));
  } catch {
    return [];
  }
}

function showAutocomplete(query) {
  const rawQuery = query.trim();
  if (!rawQuery) { hideAutocomplete(); return; }
  const upperQuery = rawQuery.toUpperCase();

  // 1. Instant: show local matches right away
  const localMatches = STOCK_LIST.filter(s =>
    s.symbol.startsWith(upperQuery) ||
    s.symbol.includes(upperQuery) ||
    s.name.toUpperCase().includes(upperQuery)
  ).slice(0, 8);

  if (localMatches.length) renderAutocompleteItems(localMatches);

  // 2. Debounced: query Yahoo Finance for comprehensive results
  clearTimeout(acDebounceTimer);
  acLastQuery = rawQuery;
  acDebounceTimer = setTimeout(async () => {
    if (acLastQuery !== rawQuery) return; // stale
    const remoteMatches = await fetchYahooSearch(rawQuery);
    if (acLastQuery !== rawQuery) return; // stale

    // Merge: remote results first, then fill with local if needed
    const seen = new Set(remoteMatches.map(s => s.symbol));
    const merged = [
      ...remoteMatches,
      ...localMatches.filter(s => !seen.has(s.symbol)),
    ].slice(0, 8);

    if (merged.length) renderAutocompleteItems(merged);
    else if (!localMatches.length) hideAutocomplete();
  }, 200);
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

// Fallback names for trending stocks when API is unavailable
const TRENDING_NAMES = { AAPL:'Apple Inc.', TSLA:'Tesla, Inc.', NVDA:'NVIDIA Corporation', AMZN:'Amazon.com, Inc.', MSFT:'Microsoft Corporation' };

async function loadTrending() {
  const container = document.getElementById('trending-list');
  try {
    const symbols = await fetchTrending();
    lastTrendingData = [];

    // Show fallback cards immediately so user sees something
    lastTrendingData = symbols.map(sym => ({ symbol: sym, name: TRENDING_NAMES[sym] || sym, rating: null, changePct: null }));
    renderTrendingList();

    // Then enrich with live data one by one
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      try {
        const { data } = await fetchAllData(sym, true);
        const h5 = await fetchHistory(sym, '5Y');
        const scored = calcScore(data, h5);
        lastTrendingData[i] = { ...data, ...scored };
        renderTrendingList();
      } catch (e) {
        // keep fallback entry, continue
      }
    }
  } catch (e) {
    container.innerHTML = `<p style="padding:16px;color:var(--text-3);font-size:13px">${e.message}</p>`;
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

  // Gauge text (canvas drawn after content is visible in loadResults)
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
    { key: 'eps',           rawData: () => data.epsGrowth != null ? [`EPS Growth: ${data.epsGrowth.toFixed(1)}%`] : [] },
    { key: 'multiples',     rawData: () => [data.pe && `P/E: ${data.pe.toFixed(1)}`, data.pb && `P/B: ${data.pb.toFixed(1)}`, data.ps && `P/S: ${data.ps.toFixed(1)}`].filter(Boolean) },
    { key: 'revenue',       rawData: () => data.revenueGrowth != null ? [`Revenue Growth: ${data.revenueGrowth.toFixed(1)}%`] : [] },
    { key: 'analysts',      rawData: () => {
        if (data.analystMean != null) {
          const labels = ['', 'Strong Buy', 'Buy', 'Hold', 'Underperform', 'Sell'];
          const label = labels[Math.round(data.analystMean)] || '';
          const countStr = data.analystCount ? ` (${data.analystCount} analysts)` : '';
          return [`Mean: ${data.analystMean.toFixed(1)} — ${label}${countStr}`];
        }
        if (data.analystScore) {
          return [`Buy: ${data.analystScore.buy + data.analystScore.strongBuy}`, `Hold: ${data.analystScore.hold}`, `Sell: ${data.analystScore.sell}`];
        }
        return [];
      }},
    { key: 'momentum',      rawData: () => [data.changePct != null && `Daily Change: ${data.changePct.toFixed(2)}%`, data.high52w && `52w High: ${data.high52w.toFixed(2)}`].filter(Boolean) },
    { key: 'institutional', rawData: () => data.instPct != null ? [`Holdings: ${(data.instPct * 100).toFixed(1)}%`] : [] },
    { key: 'debt',          rawData: () => data.debtEquity != null ? [`D/E: ${data.debtEquity.toFixed(2)}`] : [] },
    { key: 'technical',     rawData: () => [scored.technicals?.rsi != null && `RSI: ${scored.technicals.rsi.toFixed(1)}`, scored.technicals?.macd != null && `MACD: ${scored.technicals.macd.toFixed(2)}`].filter(Boolean) },
    { key: 'ath',           rawData: () => {
        if (data.price == null || data.high52w == null) return [];
        const distPct = Math.max(0, ((data.high52w - data.price) / data.high52w) * 100);
        return [distPct < 0.1 ? 'At 52w High' : `+${distPct.toFixed(1)}% to 52w High`];
      }},
    { key: 'highs',         rawData: () => scored.technicals?.highs ? [`1Y: ${scored.technicals.highs.y1}`, `3Y: ${scored.technicals.highs.y3}`, `5Y: ${scored.technicals.highs.y5}`] : [] },
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
