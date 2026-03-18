// api.js — כל קריאות ה-API + corsproxy + cache
// Price data: Yahoo Finance (free, no rate limit)
// Fundamentals: Yahoo Finance quoteSummary (primary) → Twelve Data (fallback)

function getTwelveKey() { return localStorage.getItem('bon-twelve-key') || 'demo'; }

const PROXY1 = 'https://corsproxy.io/?';
const PROXY2 = 'https://api.allorigins.win/raw?url=';

// ── Price cache (15 min) ───────────────────────────────
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

// ── Fundamentals cache (24 hours) ─────────────────────
function fundGet(symbol) {
  try {
    const raw = localStorage.getItem(`bon-fund-${symbol}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < 24 * 60 * 60 * 1000) return data;
    return null;
  } catch { return null; }
}

function fundSet(symbol, data) {
  try {
    localStorage.setItem(`bon-fund-${symbol}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// ── Fetch helpers ──────────────────────────────────────
function fetchWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function fetchProxy(url) {
  try {
    const res = await fetchWithTimeout(PROXY1 + encodeURIComponent(url));
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    const res = await fetchWithTimeout(PROXY2 + encodeURIComponent(url));
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }
}

// ── Yahoo Finance v8 chart ─────────────────────────────
async function yahooChart(symbol, range = '1d', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
  return fetchProxy(url);
}

// ── Yahoo Finance news + sector ────────────────────────
async function yahooNewsSearch(symbol) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=8&enableNavLinks=false`;
  return fetchProxy(url);
}

// ── Yahoo Finance quoteSummary — fundamentals (no auth required via proxy) ──
async function yahooFundamentals(symbol) {
  const modules = 'summaryDetail,defaultKeyStatistics,financialData,assetProfile,calendarEvents';
  // Try query2 which sometimes has looser CORS requirements
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&formatted=false&corsDomain=finance.yahoo.com`;
  try {
    const raw = await fetchProxy(url);
    // Check for auth error
    if (raw?.quoteSummary?.error || !raw?.quoteSummary?.result?.[0]) {
      // Try query1 as fallback
      const url2 = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&formatted=false`;
      const raw2 = await fetchProxy(url2);
      const result2 = raw2?.quoteSummary?.result?.[0];
      if (!result2 || raw2?.quoteSummary?.error) return null;
      return result2;
    }
    return raw.quoteSummary.result[0];
  } catch {
    return null;
  }
}

// ── Twelve Data ───────────────────────────────────────
async function tdGet(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `https://api.twelvedata.com/${endpoint}${sep}apikey=${getTwelveKey()}`;
  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  if (json.code >= 400 || json.status === 'error') throw new Error(json.message || json.code);
  return json;
}

async function tdStatistics(symbol) {
  return tdGet(`statistics?symbol=${encodeURIComponent(symbol)}`);
}

async function tdAnalystRatings(symbol) {
  return tdGet(`analyst_ratings/light?symbol=${encodeURIComponent(symbol)}`);
}

async function tdPriceTarget(symbol) {
  return tdGet(`price_target?symbol=${encodeURIComponent(symbol)}`);
}

async function tdEarnings(symbol) {
  return tdGet(`earnings?symbol=${encodeURIComponent(symbol)}`);
}

// ── Trending symbols ───────────────────────────────────
const TRENDING_DEFAULTS = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];

async function fetchTrending() {
  return TRENDING_DEFAULTS;
}

// ── Crypto / TASE detection ────────────────────────────
function isCryptoSymbol(symbol) {
  return /^[A-Z0-9]+-(?:USD|USDT|USDC|BTC|ETH|EUR|GBP)$/i.test(symbol);
}

// ── Master fetch: all data for a symbol ───────────────
async function fetchAllData(symbol, lite = false) {
  // Full cache hit (price + fundamentals, 15 min)
  const cached = cacheGet(symbol);
  if (cached) return { data: cached, fromCache: true, offline: false };

  const stale = cacheGetStale(symbol);

  try {
    const isCrypto = isCryptoSymbol(symbol);
    const isTASE   = symbol.endsWith('.TA');
    const skipFund = isTASE || isCrypto;

    // 1. Yahoo chart — price data (always available, no rate limit)
    const chartRaw = await yahooChart(symbol, '1d', '1d');
    const meta = chartRaw?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) throw new Error('no_data');

    // 2. Fundamentals — 24h cache, skip for TASE/Crypto
    let yfFund = null;    // Yahoo quoteSummary
    let stats  = null;    // Twelve Data statistics
    let ratings = null, target = null, earning = null;  // Twelve Data extras

    if (!skipFund) {
      const cached24h = fundGet(symbol);
      if (cached24h) {
        // Restore from cache (supports both yfFund and TD format)
        yfFund   = cached24h.yfFund   ?? null;
        stats    = cached24h.stats    ?? null;
        ratings  = cached24h.ratings  ?? null;
        target   = cached24h.target   ?? null;
        earning  = cached24h.earning  ?? null;
      } else {
        // Try Yahoo Finance quoteSummary first (no rate limit)
        yfFund = await yahooFundamentals(symbol);

        if (!lite) {
          // In full mode: also try Twelve Data for any missing fields
          if (!yfFund) {
            // Yahoo failed — use Twelve Data as full replacement
            stats   = await tdStatistics(symbol).catch(() => null);
            ratings = await tdAnalystRatings(symbol).catch(() => null);
            target  = await tdPriceTarget(symbol).catch(() => null);
            earning = await tdEarnings(symbol).catch(() => null);
          } else {
            // Yahoo succeeded — TD only needed for detailed analyst ratings (optional)
            ratings = await tdAnalystRatings(symbol).catch(() => null);
          }
        } else {
          // lite mode: Yahoo quoteSummary is enough, skip heavy TD calls
          if (!yfFund) {
            stats = await tdStatistics(symbol).catch(() => null);
          }
        }

        fundSet(symbol, { yfFund, stats, ratings, target, earning });
      }
    }

    // 3. News (Yahoo — no rate limit)
    const newsResp = await yahooNewsSearch(symbol).catch(() => null);

    const data = parseAllData({ meta, yfFund, stats, ratings, target, earning, newsResp }, symbol);
    cacheSet(symbol, data);
    return { data, fromCache: false, offline: false };

  } catch (err) {
    if (stale) {
      return { data: stale.data, fromCache: true, offline: true, cacheDate: new Date(stale.ts) };
    }
    throw err;
  }
}

// ── Analyst ratings aggregation (Twelve Data) ─────────
function aggregateRatings(ratingsData) {
  if (!ratingsData?.ratings?.length) return null;

  const byFirm = new Map();
  for (const r of ratingsData.ratings) {
    if (!byFirm.has(r.firm) || r.date > byFirm.get(r.firm).date) {
      byFirm.set(r.firm, r);
    }
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = [...byFirm.values()].filter(r => r.date >= cutoff);
  if (!recent.length) return null;

  const counts = { strongBuy: 0, buy: 0, hold: 0, sell: 0 };
  const STRONG_BUY = ['strong buy', 'top pick'];
  const BUY_WORDS  = ['buy', 'outperform', 'overweight', 'accumulate', 'positive'];
  const HOLD_WORDS = ['hold', 'neutral', 'equal', 'market perform', 'sector perform', 'sector weight', 'in-line'];

  for (const r of recent) {
    const rc = (r.rating_current || '').toLowerCase();
    if (STRONG_BUY.some(w => rc.includes(w))) counts.strongBuy++;
    else if (BUY_WORDS.some(w => rc.includes(w)))   counts.buy++;
    else if (HOLD_WORDS.some(w => rc.includes(w)))  counts.hold++;
    else counts.sell++;
  }

  const total = counts.strongBuy + counts.buy + counts.hold + counts.sell;
  return total > 0 ? counts : null;
}

// ── Parse all raw data into clean object ──────────────
function parseAllData({ meta, yfFund, stats, ratings, target, earning, newsResp }, symbol) {
  // ── Yahoo quoteSummary fields ──
  const yfSum  = yfFund?.summaryDetail        || {};
  const yfDef  = yfFund?.defaultKeyStatistics || {};
  const yfFin  = yfFund?.financialData        || {};
  const yfProf = yfFund?.assetProfile         || {};
  const yfCal  = yfFund?.calendarEvents       || {};

  // ── Twelve Data fields ──
  const st  = stats?.statistics || {};
  const val = st.valuations_metrics || {};
  const fin = st.financials || {};
  const inc = fin.income_statement || {};
  const bal = fin.balance_sheet || {};
  const sps = st.stock_price_summary || {};
  const sst = st.stock_statistics || {};
  const div = st.dividends_and_splits || {};

  const isCrypto    = isCryptoSymbol(symbol);
  const isTASE      = symbol.endsWith('.TA');
  const marketState = isCrypto ? 'REGULAR' : (meta.marketState ?? 'CLOSED');

  // ── Price (Yahoo chart — always reliable) ──
  const price     = meta.regularMarketPrice    ?? null;
  const prevClose = meta.chartPreviousClose    ?? meta.regularMarketPreviousClose ?? null;
  const change    = (price != null && prevClose) ? price - prevClose : null;
  const changePct = (change != null && prevClose) ? (change / prevClose) * 100 : null;
  const currency  = meta.currency    ?? 'USD';
  const exchange  = meta.exchangeName ?? meta.fullExchangeName ?? null;

  // ── Name & sector — prefer Yahoo quoteSummary, fall back to chart meta ──
  const name   = yfProf.longName ?? stats?.meta?.name ?? meta.longName ?? meta.shortName ?? symbol;
  // Sector: Yahoo assetProfile → Yahoo search result → null
  const sectorFromSearch = newsResp?.quotes?.find(q => q.symbol === symbol)?.sector || null;
  const sector = yfProf.sector ?? sectorFromSearch ?? null;

  // ── Valuation — Yahoo first, TD fallback ──
  const marketCap = yfSum.marketCap?.raw         ?? yfSum.marketCap         ?? val.market_capitalization ?? null;
  const pe        = yfSum.trailingPE?.raw        ?? yfSum.trailingPE        ?? val.trailing_pe            ?? null;
  const pb        = yfSum.priceToBook?.raw       ?? yfSum.priceToBook       ?? val.price_to_book_mrq     ?? null;
  const ps        = yfDef.priceToSalesTrailing12Months?.raw
                    ?? yfDef.priceToSalesTrailing12Months
                    ?? val.price_to_sales_ttm ?? null;

  // ── Price stats — Yahoo first, Yahoo chart fallback, then TD ──
  const beta    = yfSum.beta?.raw ?? yfSum.beta ?? sps.beta ?? null;
  const high52w = sps.fifty_two_week_high ?? meta.fiftyTwoWeekHigh ?? null;
  const low52w  = sps.fifty_two_week_low  ?? meta.fiftyTwoWeekLow  ?? null;

  // ── Dividend — Yahoo first (decimal 0.0041=0.41%), TD also decimal ──
  const yfDividend = yfSum.dividendYield?.raw ?? yfSum.dividendYield ?? null;
  const tdDividend = div.forward_annual_dividend_yield != null ? div.forward_annual_dividend_yield : null;
  const dividend   = yfDividend != null ? yfDividend * 100
                   : tdDividend != null ? tdDividend * 100
                   : null;

  // ── Growth — Yahoo first (decimal 0.159=15.9%), TD also decimal ──
  const yfEpsGrowth     = yfFin.earningsGrowth?.raw ?? yfFin.earningsGrowth ?? null;
  const yfRevenueGrowth = yfFin.revenueGrowth?.raw  ?? yfFin.revenueGrowth  ?? null;
  const tdEpsGrowth     = inc.quarterly_earnings_growth_yoy ?? null;
  const tdRevenueGrowth = inc.quarterly_revenue_growth      ?? null;
  const epsGrowth     = yfEpsGrowth     != null ? yfEpsGrowth * 100     : tdEpsGrowth     != null ? tdEpsGrowth * 100     : null;
  const revenueGrowth = yfRevenueGrowth != null ? yfRevenueGrowth * 100 : tdRevenueGrowth != null ? tdRevenueGrowth * 100 : null;

  // ── Debt/Equity — Yahoo (reported as 0–1000 range, divide by 100), TD (percent ÷ 100) ──
  const yfDebtEquity = yfFin.debtToEquity?.raw ?? yfFin.debtToEquity ?? null;
  const tdDebtEquity = bal.total_debt_to_equity_mrq ?? null;
  const debtEquity   = yfDebtEquity != null ? yfDebtEquity / 100
                     : tdDebtEquity != null ? tdDebtEquity / 100
                     : null;

  // ── Institutional holdings — Yahoo (0–1 decimal), TD (0–1 decimal) ──
  const yfInstPct = yfDef.heldPercentInstitutions?.raw ?? yfDef.heldPercentInstitutions ?? null;
  const tdInstPct = sst.percent_held_by_institutions ?? null;
  const instPct   = yfInstPct ?? tdInstPct ?? null;

  // ── Analyst data — Yahoo recommendationMean (1–5 scale) as primary ──
  // 1=Strong Buy, 2=Buy, 3=Hold, 4=Underperform, 5=Sell
  const analystMean  = yfFin.recommendationMean?.raw ?? yfFin.recommendationMean ?? null;
  const analystCount = yfFin.numberOfAnalystOpinions?.raw ?? yfFin.numberOfAnalystOpinions ?? null;
  // Detailed TD ratings as supplement
  const analystScore = aggregateRatings(ratings);

  // ── Price target — Yahoo first, TD fallback ──
  const yfTargetMean = yfFin.targetMeanPrice?.raw ?? yfFin.targetMeanPrice ?? null;
  const yfTargetHigh = yfFin.targetHighPrice?.raw ?? yfFin.targetHighPrice ?? null;
  const yfTargetLow  = yfFin.targetLowPrice?.raw  ?? yfFin.targetLowPrice  ?? null;
  const tdPT = target?.price_target || null;
  const targetMean = yfTargetMean ?? tdPT?.average ?? null;
  const targetHigh = yfTargetHigh ?? tdPT?.high    ?? null;
  const targetLow  = yfTargetLow  ?? tdPT?.low     ?? null;

  // ── Earnings date — Yahoo calendarEvents first, TD fallback ──
  let earningsDate = null;
  // Yahoo calendarEvents.earnings.earningsDate is an array of unix timestamps
  const yfEarningsDates = yfCal.earnings?.earningsDate;
  if (Array.isArray(yfEarningsDates) && yfEarningsDates.length > 0) {
    const next = yfEarningsDates.find(d => {
      const ts = typeof d === 'object' ? (d.raw ?? d) : d;
      return new Date(ts * 1000) > new Date();
    });
    if (next != null) {
      const ts = typeof next === 'object' ? (next.raw ?? next) : next;
      earningsDate = new Date(ts * 1000);
    }
  }
  if (!earningsDate) {
    const earningsArr = Array.isArray(earning?.earnings) ? earning.earnings : [];
    const nextEarning = earningsArr.find(e => e.date && new Date(e.date) > new Date());
    if (nextEarning) earningsDate = new Date(nextEarning.date);
  }

  // ── News ──
  const rawNews   = newsResp?.news || [];
  const newsItems = rawNews.slice(0, 5).map(n => ({
    headline: n.title,
    url:      n.link,
    source:   n.publisher,
    datetime: (n.providerPublishTime || 0) * 1000,
    image:    n.thumbnail?.resolutions?.[0]?.url || null,
  }));

  return {
    symbol, name, sector, exchange, currency, isTASE, isCrypto, marketState,
    price, prevClose, change, changePct,
    pe, pb, ps, marketCap, beta, dividend,
    high52w, low52w,
    analystScore, analystMean, analystCount,
    targetMean, targetHigh, targetLow,
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${now}&interval=${interval}&includePrePost=false`;
  const raw = await fetchProxy(url);
  const result = raw?.chart?.result?.[0];
  if (!result) return [];
  const ts     = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  return ts.map((t, i) => ({ time: t, value: closes[i] })).filter(p => p.value != null);
}
