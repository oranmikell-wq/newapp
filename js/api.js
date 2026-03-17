// api.js — כל קריאות ה-API + corsproxy + cache

const FINNHUB_KEY = localStorage.getItem('bon-finnhub-key') || 'd6qup2hr01qgdhqcgpbgd6qup2hr01qgdhqcgpc0';
const FMP_KEY     = localStorage.getItem('bon-fmp-key')     || 'B2YQqp7ld6CnzJXytvs5siPiJbUImjNZ';

const PROXY1 = 'https://corsproxy.io/?';
const PROXY2 = 'https://api.allorigins.win/raw?url=';

// ── Cache ──────────────────────────────────────────────
function cacheGet(symbol) {
  try {
    const raw = localStorage.getItem(`bon-cache-${symbol}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < 15 * 60 * 1000) return data;
    return null;
  } catch { return null; }
}

function cacheSet(symbol, data) {
  try {
    localStorage.setItem(`bon-cache-${symbol}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function cacheGetStale(symbol) {
  try {
    const raw = localStorage.getItem(`bon-cache-${symbol}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return { data, ts };
  } catch { return null; }
}

// ── Fetch helpers ──────────────────────────────────────
async function fetchProxy(url) {
  try {
    const res = await fetch(PROXY1 + encodeURIComponent(url));
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    const res = await fetch(PROXY2 + encodeURIComponent(url));
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }
}

async function fetchDirect(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

// ── Yahoo Finance v8 chart (no crumb needed) ───────────
async function yahooChart(symbol, range = '1d', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
  return fetchProxy(url);
}

async function yahooHistory(symbol, period1, period2, interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=false`;
  return fetchProxy(url);
}

// ── Finnhub ────────────────────────────────────────────
async function finnhubGet(endpoint) {
  return fetchDirect(`https://finnhub.io/api/v1/${endpoint}&token=${FINNHUB_KEY}`);
}

async function getFinnhubQuote(symbol) {
  return finnhubGet(`quote?symbol=${symbol}`);
}

async function getFinnhubProfile(symbol) {
  return finnhubGet(`stock/profile2?symbol=${symbol}`);
}

async function getFinnhubMetrics(symbol) {
  return finnhubGet(`stock/metric?symbol=${symbol}&metric=all`);
}

async function getFinnhubRecommendations(symbol) {
  return finnhubGet(`stock/recommendation?symbol=${symbol}`);
}

async function getFinnhubPriceTarget(symbol) {
  return finnhubGet(`stock/price-target?symbol=${symbol}`);
}

async function getFinnhubEarnings(symbol) {
  return finnhubGet(`stock/earnings?symbol=${symbol}&limit=8`);
}

async function getFinnhubInstitutional(symbol) {
  return finnhubGet(`institutional/ownership?symbol=${symbol}&limit=5`);
}

async function getFinnhubNews(symbol) {
  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return finnhubGet(`company-news?symbol=${symbol}&from=${from}&to=${to}`);
}

// ── Financial Modeling Prep ────────────────────────────
async function fmpGet(endpoint) {
  return fetchDirect(`https://financialmodelingprep.com/stable/${endpoint}&apikey=${FMP_KEY}`);
}

async function getFmpRevenue(symbol) {
  return fmpGet(`income-statement?symbol=${symbol}&limit=3&period=annual`);
}

async function getFmpEarnings(symbol) {
  return fmpGet(`earnings?symbol=${symbol}&limit=2`);
}

async function getFmpPriceTarget(symbol) {
  return fmpGet(`price-target-summary?symbol=${symbol}`);
}

// ── Trending symbols ───────────────────────────────────
const TRENDING_DEFAULTS = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];

async function fetchTrending() {
  return TRENDING_DEFAULTS;
}

// ── Master fetch: all data for a symbol ───────────────
async function fetchAllData(symbol) {
  const cached = cacheGet(symbol);
  if (cached) return { data: cached, fromCache: false, offline: false };

  const stale = cacheGetStale(symbol);

  try {
    const [chartRaw, quoteRaw, profileRaw, metricsRaw, recRaw,
           earningsRaw, instRaw, newsRaw, revenueRaw, fmpEarningsRaw, fmpTargetRaw] =
      await Promise.allSettled([
        yahooChart(symbol, '1d', '1d'),
        getFinnhubQuote(symbol),
        getFinnhubProfile(symbol),
        getFinnhubMetrics(symbol),
        getFinnhubRecommendations(symbol),
        getFinnhubEarnings(symbol),
        getFinnhubInstitutional(symbol),
        getFinnhubNews(symbol),
        getFmpRevenue(symbol),
        getFmpEarnings(symbol),
        getFmpPriceTarget(symbol),
      ]);

    const chart   = chartRaw.status   === 'fulfilled' ? chartRaw.value   : null;
    const quote   = quoteRaw.status   === 'fulfilled' ? quoteRaw.value   : null;
    const profile = profileRaw.status === 'fulfilled' ? profileRaw.value : null;
    const metrics = metricsRaw.status === 'fulfilled' ? metricsRaw.value : null;

    // Validate symbol exists
    const meta = chart?.chart?.result?.[0]?.meta;
    if (!meta && !quote) throw new Error('no_data');
    if (quote && quote.c === 0 && !meta) throw new Error('no_data');

    const data = parseAllData({
      meta, quote, profile, metrics,
      recommendations:  recRaw.status        === 'fulfilled' ? recRaw.value        : [],
      earnings:         earningsRaw.status   === 'fulfilled' ? earningsRaw.value   : [],
      institutional:    instRaw.status       === 'fulfilled' ? instRaw.value       : null,
      news:             newsRaw.status       === 'fulfilled' ? newsRaw.value       : [],
      revenue:          revenueRaw.status    === 'fulfilled' ? revenueRaw.value    : [],
      fmpEarnings:      fmpEarningsRaw.status === 'fulfilled' ? fmpEarningsRaw.value : [],
      fmpTarget:        fmpTargetRaw.status  === 'fulfilled' ? fmpTargetRaw.value  : [],
    }, symbol);

    cacheSet(symbol, data);
    return { data, fromCache: false, offline: false };

  } catch (err) {
    if (stale) {
      return { data: stale.data, fromCache: true, offline: true, cacheDate: new Date(stale.ts) };
    }
    throw err;
  }
}

// ── Parse all raw data into clean object ──────────────
function parseAllData({ meta, quote, profile, metrics, recommendations,
                         earnings, institutional, news, revenue, fmpEarnings, fmpTarget }, symbol) {
  const m  = metrics?.metric || {};

  // Price from Finnhub quote (most accurate) or Yahoo meta
  const price       = quote?.c    ?? meta?.regularMarketPrice    ?? null;
  const prevClose   = quote?.pc   ?? meta?.chartPreviousClose    ?? null;
  const change      = quote?.d    ?? (price && prevClose ? price - prevClose : null);
  const changePct   = quote?.dp   ?? (change && prevClose ? (change / prevClose) * 100 : null);
  const currency    = meta?.currency   || profile?.currency || 'USD';
  const isTASE      = symbol.endsWith('.TA');
  const marketState = meta?.marketState || 'CLOSED';

  // Basic info
  const name        = profile?.name     || meta?.longName    || meta?.shortName || symbol;
  const sector      = profile?.finnhubIndustry || meta?.sector || null;
  const exchange    = profile?.exchange  || meta?.exchangeName || null;

  // Valuation (Finnhub metrics)
  const pe          = m.peBasicExclExtraTTM  ?? m.peNormalizedAnnual ?? null;
  const pb          = m.pbAnnual             ?? null;
  const ps          = m.psAnnual             ?? null;
  const marketCap   = profile?.marketCapitalization
    ? profile.marketCapitalization * 1e6
    : (meta?.regularMarketVolume ? null : null);
  const beta        = m.beta ?? null;
  const dividend    = m['dividendYieldIndicatedAnnual'] ?? null;

  // 52w
  const high52w     = m['52WeekHigh'] ?? meta?.fiftyTwoWeekHigh ?? null;
  const low52w      = m['52WeekLow']  ?? meta?.fiftyTwoWeekLow  ?? null;

  // Analyst recommendations
  const recLatest   = Array.isArray(recommendations) && recommendations.length ? recommendations[0] : null;
  const analystScore = recLatest
    ? { buy: recLatest.buy || 0, hold: recLatest.hold || 0,
        sell: (recLatest.sell || 0) + (recLatest.strongSell || 0),
        strongBuy: recLatest.strongBuy || 0 }
    : null;

  // Price target (FMP price-target-summary)
  const targetSummary = Array.isArray(fmpTarget) && fmpTarget.length ? fmpTarget[0] : null;
  const targetMean  = targetSummary?.lastMonthAvgPriceTarget ?? targetSummary?.lastQuarterAvgPriceTarget ?? null;
  const targetHigh  = targetSummary?.lastQuarterAvgPriceTarget ?? null;
  const targetLow   = targetSummary?.allTimeAvgPriceTarget ?? null;

  // Debt/Equity
  const debtEquity  = m['totalDebt/totalEquityAnnual'] ?? m.totalDebtToEquityAnnual ?? null;

  // EPS growth (Finnhub)
  const epsGrowth   = m.epsGrowth3Y ?? m.epsGrowthTTMYoy ?? null;

  // Revenue growth (FMP)
  let revenueGrowth = null;
  if (Array.isArray(revenue) && revenue.length >= 2) {
    const r0 = revenue[0]?.revenue ?? null;
    const r1 = revenue[1]?.revenue ?? null;
    if (r0 != null && r1 != null && r1 !== 0) {
      revenueGrowth = ((r0 - r1) / Math.abs(r1)) * 100;
    }
  }

  // Institutional %
  const instPct = institutional?.ownership?.[0]?.share ?? null;

  // Earnings date — FMP /earnings returns upcoming dates with epsActual=null
  let earningsDate = null;
  if (Array.isArray(fmpEarnings) && fmpEarnings.length) {
    const next = fmpEarnings.find(e => e.epsActual == null && e.date);
    if (next) earningsDate = new Date(next.date);
  }
  if (!earningsDate && Array.isArray(earnings) && earnings.length) {
    const next = earnings.find(e => new Date(e.period) > new Date());
    if (next) earningsDate = new Date(next.period);
  }

  // News
  const newsItems = Array.isArray(news)
    ? news.slice(0, 5).map(n => ({
        headline: n.headline,
        url:      n.url,
        source:   n.source,
        datetime: n.datetime * 1000,
        image:    n.image || null,
      }))
    : [];

  return {
    symbol, name, sector, exchange, currency, isTASE, marketState,
    price, prevClose, change, changePct,
    pe, pb, ps, marketCap, beta, dividend,
    high52w, low52w,
    analystScore, targetMean, targetHigh, targetLow,
    debtEquity, earningsDate,
    instPct, epsGrowth, revenueGrowth,
    newsItems,
  };
}

// ── Historical prices for chart ───────────────────────
async function fetchHistory(symbol, range) {
  const now = Math.floor(Date.now() / 1000);
  const configs = {
    '1W': { period1: now - 7   * 86400, interval: '15m' },
    '1M': { period1: now - 30  * 86400, interval: '1d'  },
    '3M': { period1: now - 90  * 86400, interval: '1d'  },
    '6M': { period1: now - 180 * 86400, interval: '1d'  },
    '1Y': { period1: now - 365 * 86400, interval: '1wk' },
    '3Y': { period1: now - 3 * 365 * 86400, interval: '1mo' },
    '5Y': { period1: now - 5 * 365 * 86400, interval: '1mo' },
  };
  const { period1, interval } = configs[range] || configs['1M'];
  const raw = await yahooHistory(symbol, period1, now, interval);
  const result = raw?.chart?.result?.[0];
  if (!result) return [];
  const ts     = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  return ts.map((t, i) => ({ time: t, value: closes[i] })).filter(p => p.value != null);
}
