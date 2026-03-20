// StockService.js — all API calls extracted from api.js

import { cacheGet, cacheSet, cacheGetStale, fundGet, fundSet, fullCacheGet, fullCacheSet } from './CacheService.js';

function getTwelveKey() { return localStorage.getItem('bon-twelve-key') || 'demo'; }

const PROXY1 = 'https://corsproxy.io/?';
const PROXY2 = 'https://api.allorigins.win/raw?url=';

export function fetchWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export async function fetchProxy(url) {
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

export async function yahooChart(symbol, range = '1d', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
  return fetchProxy(url);
}

export async function yahooNewsSearch(symbol) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=8&enableNavLinks=false`;
  return fetchProxy(url);
}

export async function yahooFundamentals(symbol) {
  const modules = 'summaryDetail,defaultKeyStatistics,financialData,assetProfile,calendarEvents';
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&formatted=false&corsDomain=finance.yahoo.com`;
  try {
    const raw = await fetchProxy(url);
    if (raw?.quoteSummary?.error || !raw?.quoteSummary?.result?.[0]) {
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

async function tdGet(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `https://api.twelvedata.com/${endpoint}${sep}apikey=${getTwelveKey()}`;
  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  if (json.code >= 400 || json.status === 'error') throw new Error(json.message || json.code);
  return json;
}

export async function tdStatistics(symbol) {
  return tdGet(`statistics?symbol=${encodeURIComponent(symbol)}`);
}

export async function tdAnalystRatings(symbol) {
  return tdGet(`analyst_ratings/light?symbol=${encodeURIComponent(symbol)}`);
}

export async function tdPriceTarget(symbol) {
  return tdGet(`price_target?symbol=${encodeURIComponent(symbol)}`);
}

export async function tdEarnings(symbol) {
  return tdGet(`earnings?symbol=${encodeURIComponent(symbol)}`);
}

const TRENDING_DEFAULTS = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];

export async function fetchTrending() {
  return TRENDING_DEFAULTS;
}

export function isCryptoSymbol(symbol) {
  return /^[A-Z0-9]+-(?:USD|USDT|USDC|BTC|ETH|EUR|GBP)$/i.test(symbol);
}

export function aggregateRatings(ratingsData) {
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

export function parseAllData({ meta, yfFund, stats, ratings, target, earning, newsResp }, symbol) {
  const yfSum  = yfFund?.summaryDetail        || {};
  const yfDef  = yfFund?.defaultKeyStatistics || {};
  const yfFin  = yfFund?.financialData        || {};
  const yfProf = yfFund?.assetProfile         || {};
  const yfCal  = yfFund?.calendarEvents       || {};

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

  const price     = meta.regularMarketPrice    ?? null;
  const prevClose = meta.chartPreviousClose    ?? meta.regularMarketPreviousClose ?? null;
  const change    = (price != null && prevClose) ? price - prevClose : null;
  const changePct = (change != null && prevClose) ? (change / prevClose) * 100 : null;
  const currency  = meta.currency    ?? 'USD';
  const exchange  = meta.exchangeName ?? meta.fullExchangeName ?? null;

  const name   = yfProf.longName ?? stats?.meta?.name ?? meta.longName ?? meta.shortName ?? symbol;
  const sectorFromSearch = newsResp?.quotes?.find(q => q.symbol === symbol)?.sector || null;
  const sector = yfProf.sector ?? sectorFromSearch ?? null;

  const marketCap = yfSum.marketCap?.raw         ?? yfSum.marketCap         ?? val.market_capitalization ?? null;
  const pe        = yfSum.trailingPE?.raw        ?? yfSum.trailingPE        ?? val.trailing_pe            ?? null;
  const pb        = yfSum.priceToBook?.raw       ?? yfSum.priceToBook       ?? val.price_to_book_mrq     ?? null;
  const ps        = yfDef.priceToSalesTrailing12Months?.raw
                    ?? yfDef.priceToSalesTrailing12Months
                    ?? val.price_to_sales_ttm ?? null;

  const beta    = yfSum.beta?.raw ?? yfSum.beta ?? sps.beta ?? null;
  const high52w = sps.fifty_two_week_high ?? meta.fiftyTwoWeekHigh ?? null;
  const low52w  = sps.fifty_two_week_low  ?? meta.fiftyTwoWeekLow  ?? null;

  const yfDividend = yfSum.dividendYield?.raw ?? yfSum.dividendYield ?? null;
  const tdDividend = div.forward_annual_dividend_yield != null ? div.forward_annual_dividend_yield : null;
  const dividend   = yfDividend != null ? yfDividend * 100
                   : tdDividend != null ? tdDividend * 100
                   : null;

  const yfEpsGrowth     = yfFin.earningsGrowth?.raw ?? yfFin.earningsGrowth ?? null;
  const yfRevenueGrowth = yfFin.revenueGrowth?.raw  ?? yfFin.revenueGrowth  ?? null;
  const tdEpsGrowth     = inc.quarterly_earnings_growth_yoy ?? null;
  const tdRevenueGrowth = inc.quarterly_revenue_growth      ?? null;
  const epsGrowth     = yfEpsGrowth     != null ? yfEpsGrowth * 100     : tdEpsGrowth     != null ? tdEpsGrowth * 100     : null;
  const revenueGrowth = yfRevenueGrowth != null ? yfRevenueGrowth * 100 : tdRevenueGrowth != null ? tdRevenueGrowth * 100 : null;

  const yfDebtEquity = yfFin.debtToEquity?.raw ?? yfFin.debtToEquity ?? null;
  const tdDebtEquity = bal.total_debt_to_equity_mrq ?? null;
  const debtEquity   = yfDebtEquity != null ? yfDebtEquity / 100
                     : tdDebtEquity != null ? tdDebtEquity / 100
                     : null;

  const yfInstPct = yfDef.heldPercentInstitutions?.raw ?? yfDef.heldPercentInstitutions ?? null;
  const tdInstPct = sst.percent_held_by_institutions ?? null;
  const instPct   = yfInstPct ?? tdInstPct ?? null;

  const analystMean  = yfFin.recommendationMean?.raw ?? yfFin.recommendationMean ?? null;
  const analystCount = yfFin.numberOfAnalystOpinions?.raw ?? yfFin.numberOfAnalystOpinions ?? null;
  const analystScore = aggregateRatings(ratings);

  const yfTargetMean = yfFin.targetMeanPrice?.raw ?? yfFin.targetMeanPrice ?? null;
  const yfTargetHigh = yfFin.targetHighPrice?.raw ?? yfFin.targetHighPrice ?? null;
  const yfTargetLow  = yfFin.targetLowPrice?.raw  ?? yfFin.targetLowPrice  ?? null;
  const tdPT = target?.price_target || null;
  const targetMean = yfTargetMean ?? tdPT?.average ?? null;
  const targetHigh = yfTargetHigh ?? tdPT?.high    ?? null;
  const targetLow  = yfTargetLow  ?? tdPT?.low     ?? null;

  let earningsDate = null;
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

export async function fetchAllData(symbol, lite = false) {
  const cached = cacheGet(symbol);
  if (cached) return { data: cached, fromCache: true, offline: false };

  const stale = cacheGetStale(symbol);

  try {
    const isCrypto = isCryptoSymbol(symbol);
    const isTASE   = symbol.endsWith('.TA');
    const skipFund = isTASE || isCrypto;

    const chartRaw = await yahooChart(symbol, '1d', '1d');
    const meta = chartRaw?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) throw new Error('no_data');

    let yfFund = null;
    let stats  = null;
    let ratings = null, target = null, earning = null;

    if (!skipFund) {
      const cached24h = fundGet(symbol);
      if (cached24h) {
        yfFund   = cached24h.yfFund   ?? null;
        stats    = cached24h.stats    ?? null;
        ratings  = cached24h.ratings  ?? null;
        target   = cached24h.target   ?? null;
        earning  = cached24h.earning  ?? null;
      } else {
        yfFund = await yahooFundamentals(symbol);

        if (!lite) {
          if (!yfFund) {
            stats   = await tdStatistics(symbol).catch(() => null);
            ratings = await tdAnalystRatings(symbol).catch(() => null);
            target  = await tdPriceTarget(symbol).catch(() => null);
            earning = await tdEarnings(symbol).catch(() => null);
          } else {
            ratings = await tdAnalystRatings(symbol).catch(() => null);
          }
        } else {
          if (!yfFund) {
            stats = await tdStatistics(symbol).catch(() => null);
          }
        }

        fundSet(symbol, { yfFund, stats, ratings, target, earning });
      }
    }

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

// ── Technical indicator helpers ────────────────────────

/**
 * Wilder's RSI (period = 14).
 * Requires at least period+1 data points.
 * Returns null when there isn't enough data.
 */
export function calcRSI14(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;

  // Seed: simple average of first `period` gains / losses
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else          avgLoss -= diff;   // store as positive number
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for the remaining bars
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Simple Moving Average of the last `period` values.
 * Returns null when there isn't enough data.
 */
export function calcSMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum   = slice.reduce((a, b) => a + b, 0);
  return parseFloat((sum / period).toFixed(4));
}

// ── fetchStockFullData — unified 5-min cached fetch ────
/**
 * Fetches everything needed for a full stock view in ONE call:
 *   - Current quote data (price, fundamentals, news)
 *   - 1-year daily historical prices  (~252 trading days)
 *   - Locally computed RSI(14), MA50, MA200
 *
 * Results are cached in localStorage for 5 minutes so rapid
 * re-renders / page switches don't trigger extra API calls.
 *
 * @returns {{
 *   quote:      Object,       // full parsed quote object
 *   history:    Array,        // [{time, value}] daily for 1Y
 *   indicators: {
 *     rsi14:          number|null,
 *     ma50:           number|null,
 *     ma200:          number|null,
 *     priceAboveMA50:  boolean,
 *     priceAboveMA200: boolean,
 *     goldenCross:     boolean,   // MA50 > MA200
 *   },
 *   fromCache:  boolean,
 *   cacheAgeMs: number,       // ms since cache was written (0 if fresh)
 * }}
 */
export async function fetchStockFullData(symbol) {
  // ── 1. Cache hit? ───────────────────────────────────
  const hit = fullCacheGet(symbol);
  if (hit) {
    return { ...hit.data, fromCache: true, cacheAgeMs: hit.age };
  }

  // ── 2. Fetch quote + 1Y daily history in parallel ──
  const [quoteResult, history] = await Promise.all([
    fetchAllData(symbol),
    _fetch1YDaily(symbol),
  ]);

  const quote = quoteResult.data;

  // ── 3. Compute indicators from daily closes ─────────
  const closes = history.map(p => p.value);

  const rsi14          = calcRSI14(closes);
  const ma50           = calcSMA(closes, 50);
  const ma200          = calcSMA(closes, 200);
  const lastPrice      = quote.price ?? (closes[closes.length - 1] ?? null);
  const priceAboveMA50  = (lastPrice != null && ma50  != null) ? lastPrice > ma50  : null;
  const priceAboveMA200 = (lastPrice != null && ma200 != null) ? lastPrice > ma200 : null;
  const goldenCross     = (ma50 != null && ma200 != null) ? ma50 > ma200 : null;

  const indicators = { rsi14, ma50, ma200, priceAboveMA50, priceAboveMA200, goldenCross };

  const result = { quote, history, indicators, fromCache: false, cacheAgeMs: 0 };

  // ── 4. Persist to 5-min cache ───────────────────────
  fullCacheSet(symbol, result);

  return result;
}

/**
 * Internal: fetch 1-year daily candles (interval=1d).
 * We request ~1.1 years so weekends/holidays don't push
 * us under 200 usable bars for MA200.
 */
async function _fetch1YDaily(symbol) {
  const now     = Math.floor(Date.now() / 1000);
  const period1 = now - Math.ceil(1.1 * 365 * 86400);  // ~400 calendar days
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
            + `?period1=${period1}&period2=${now}&interval=1d&includePrePost=false`;

  try {
    const raw    = await fetchProxy(url);
    const result = raw?.chart?.result?.[0];
    if (!result) return [];
    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.quote?.[0]?.close || [];
    return timestamps
      .map((t, i) => ({ time: t, value: closes[i] }))
      .filter(p => p.value != null);
  } catch {
    return [];
  }
}

export async function fetchHistory(symbol, range) {
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
