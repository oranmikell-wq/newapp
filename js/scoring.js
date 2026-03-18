// scoring.js — מנוע הציון המשוקלל + benchmarks לפי סקטור

// ── Weights ────────────────────────────────────────────
const WEIGHTS = {
  eps:         0.18,
  multiples:   0.18,
  revenue:     0.12,
  analysts:    0.12,
  momentum:    0.12,
  institutional: 0.08,
  debt:        0.08,
  technical:   0.06,
  ath:         0.04,
  highs:       0.02,
};

// ── Sector Benchmarks ──────────────────────────────────
// Format: [excellent, good, average, poor] — higher P/E = worse for most sectors
const SECTOR_PE = {
  technology:    [15, 25, 40, 60],
  financials:    [8,  12, 18, 25],
  energy:        [8,  12, 18, 25],
  healthcare:    [12, 20, 30, 45],
  real_estate:   [15, 25, 40, 60],
  consumer:      [12, 18, 28, 40],
  industrials:   [12, 18, 25, 35],
  communication: [12, 20, 35, 55],
  utilities:     [14, 18, 25, 35],
  materials:     [10, 15, 22, 30],
  default:       [12, 20, 35, 55],
};

const SECTOR_PB = {
  technology:    [1, 3, 6, 12],
  financials:    [0.8, 1.2, 2, 3.5],
  energy:        [1, 1.5, 2.5, 4],
  healthcare:    [2, 4, 7, 12],
  real_estate:   [1, 1.5, 2.5, 4],
  consumer:      [1.5, 3, 5, 8],
  industrials:   [1.5, 2.5, 4, 7],
  communication: [1.5, 3, 5, 9],
  utilities:     [1, 1.5, 2.5, 4],
  materials:     [1, 2, 3.5, 6],
  default:       [1, 3, 6, 12],
};

const SECTOR_PS = {
  technology:    [2, 5, 10, 20],
  financials:    [1, 2, 4, 7],
  energy:        [0.5, 1, 2, 3.5],
  healthcare:    [1, 3, 6, 12],
  real_estate:   [3, 6, 10, 16],
  consumer:      [0.3, 0.8, 1.5, 3],
  industrials:   [0.5, 1, 2, 3.5],
  communication: [1, 3, 6, 10],
  utilities:     [1, 2, 3.5, 5],
  materials:     [0.5, 1, 2, 3.5],
  default:       [1, 3, 6, 12],
};

function getSectorKey(sector) {
  if (!sector) return 'default';
  const s = sector.toLowerCase();
  if (s.includes('tech'))          return 'technology';
  if (s.includes('financ') || s.includes('bank')) return 'financials';
  if (s.includes('energy'))        return 'energy';
  if (s.includes('health'))        return 'healthcare';
  if (s.includes('real estate'))   return 'real_estate';
  if (s.includes('consumer'))      return 'consumer';
  if (s.includes('industri'))      return 'industrials';
  if (s.includes('commun'))        return 'communication';
  if (s.includes('utilit'))        return 'utilities';
  if (s.includes('material'))      return 'materials';
  return 'default';
}

// ── Normalize value against sector benchmarks ─────────
// benchmarks: [excellent, good, average, poor] for a "lower is better" metric
// Returns 0–100
function normalizeInverse(value, benchmarks) {
  const [ex, gd, av, po] = benchmarks;
  if (value <= ex) return 100;
  if (value <= gd) return 75 + ((gd - value) / (gd - ex)) * 25;
  if (value <= av) return 40 + ((av - value) / (av - gd)) * 35;
  if (value <= po) return 10 + ((po - value) / (po - av)) * 30;
  return 5;
}

// "higher is better"
function normalizeLinear(value, min, max) {
  if (value >= max) return 100;
  if (value <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

// ── Individual criterion scorers ──────────────────────

function scoreEPS(epsGrowth) {
  if (epsGrowth == null) return null;
  // >30% = excellent, >15% = good, >0% = ok, negative = bad
  return normalizeLinear(epsGrowth, -30, 40);
}

function scoreMultiples(pe, pb, ps, sectorKey) {
  const scores = [];
  if (pe != null && pe > 0) {
    scores.push(normalizeInverse(pe, SECTOR_PE[sectorKey] || SECTOR_PE.default));
  }
  if (pb != null && pb > 0) {
    scores.push(normalizeInverse(pb, SECTOR_PB[sectorKey] || SECTOR_PB.default));
  }
  if (ps != null && ps > 0) {
    scores.push(normalizeInverse(ps, SECTOR_PS[sectorKey] || SECTOR_PS.default));
  }
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function scoreRevenue(revenueGrowth) {
  if (revenueGrowth == null) return null;
  return normalizeLinear(revenueGrowth, -10, 30);
}

function scoreAnalysts(analystScore, analystMean) {
  // Yahoo Finance recommendationMean: 1=Strong Buy, 2=Buy, 3=Hold, 4=Underperform, 5=Sell
  if (analystMean != null) {
    // Map 1–5 scale to 0–100 (inverted: lower mean = better)
    return normalizeLinear(5 - analystMean, 0, 4) * 100;
  }
  if (!analystScore) return null;
  const { strongBuy = 0, buy = 0, hold = 0, sell = 0 } = analystScore;
  const total = strongBuy + buy + hold + sell;
  if (total === 0) return null;
  // Weighted: strongBuy=100, buy=75, hold=40, sell=0
  const weighted = (strongBuy * 100 + buy * 75 + hold * 40 + sell * 0) / total;
  return weighted;
}

function scoreMomentum(changePct, price, high52w, low52w) {
  if (changePct == null) return null;
  // Combine daily change + position in 52w range
  const dailyScore = normalizeLinear(changePct, -5, 5);
  if (high52w == null || low52w == null || price == null) return dailyScore;
  const range = high52w - low52w;
  if (range === 0) return dailyScore;
  const position = (price - low52w) / range; // 0=at low, 1=at high
  const posScore = position * 100;
  return (dailyScore * 0.4 + posScore * 0.6);
}

function scoreInstitutional(instPct) {
  if (instPct == null) return null;
  // 0–15% = low, 15–50% = good, 50–70% = very good, >70% = excellent
  return normalizeLinear(instPct * 100, 0, 80);
}

function scoreDebt(debtEquity, sectorKey) {
  if (debtEquity == null) return null;
  // debtEquity is in ratio form (e.g. 1.5 = 150% D/E)
  // Banks/real-estate naturally carry more debt
  const highDebtSectors = ['financials', 'real_estate', 'utilities'];
  const max = highDebtSectors.includes(sectorKey) ? 10.0 : 2.0;
  // Lower debt = higher score
  const score = 100 - normalizeLinear(debtEquity, 0, max);
  return Math.max(0, score);
}

function scoreTechnical(rsi, macdSignal) {
  if (rsi == null && macdSignal == null) return null;
  const scores = [];
  if (rsi != null) {
    // RSI: 30-70 is ideal. <30 oversold (buy opp), >70 overbought
    if (rsi < 30) scores.push(70);       // oversold, potential buy
    else if (rsi < 50) scores.push(80);  // healthy momentum
    else if (rsi < 65) scores.push(65);  // normal
    else if (rsi < 75) scores.push(35);  // getting overbought
    else scores.push(15);                // overbought
  }
  if (macdSignal != null) {
    scores.push(macdSignal > 0 ? 75 : 30);
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function scoreATH(price, high52w, ath) {
  if (price == null || high52w == null) return null;
  // Distance from 52w high (0% = at high = good)
  const distFrom52w = ((high52w - price) / high52w) * 100;
  // Closer to 52w high = better (strength), far below = either opportunity or downtrend
  // Score: at 52w high = 85, 10% below = 70, 30% below = 40, 50% below = 20
  const fromHigh = normalizeInverse(distFrom52w, [0, 10, 30, 50]);
  if (!ath || ath <= high52w) return fromHigh;
  const distFromATH = ((ath - price) / ath) * 100;
  const fromATH = normalizeInverse(distFromATH, [0, 15, 40, 65]);
  return (fromHigh * 0.6 + fromATH * 0.4);
}

function scoreHighs(highsBroken) {
  // highsBroken: { y1, y3, y5 } = number of new highs set
  if (!highsBroken) return null;
  const { y1 = 0, y3 = 0, y5 = 0 } = highsBroken;
  const score = Math.min(100, (y1 * 20 + y3 * 10 + y5 * 5));
  return score;
}

// ── RSI + MACD from price history ─────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcMACD(closes) {
  if (closes.length < 26) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  return ema12 - ema26; // positive = bullish
}

function countHighs(prices, timestamps) {
  if (!prices || !timestamps || prices.length < 2) return { y1: 0, y3: 0, y5: 0 };
  const now = Date.now() / 1000;
  const y1 = now - 365 * 86400;
  const y3 = now - 3 * 365 * 86400;
  const y5 = now - 5 * 365 * 86400;
  let max = 0, h1 = 0, h3 = 0, h5 = 0;
  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];
    const t = timestamps[i];
    if (p > max) {
      max = p;
      if (t >= y1) h1++;
      if (t >= y3) h3++;
      if (t >= y5) h5++;
    }
  }
  return { y1: h1, y3: h3, y5: h5 };
}

// ── Master score calculator ────────────────────────────
function calcScore(data, history5y = []) {
  const sectorKey = getSectorKey(data.sector);

  // Technical from history — filter together to keep indices aligned
  const validHistory = history5y.filter(p => p.value && p.time);
  const closes     = validHistory.map(p => p.value);
  const timestamps = validHistory.map(p => p.time);
  const rsi       = calcRSI(closes);
  const macd      = calcMACD(closes);
  const highs     = countHighs(closes, timestamps);
  const ath       = closes.length ? Math.max(...closes) : null;

  const criteriaScores = {
    eps:          scoreEPS(data.epsGrowth),
    multiples:    scoreMultiples(data.pe, data.pb, data.ps, sectorKey),
    revenue:      scoreRevenue(data.revenueGrowth),
    analysts:     scoreAnalysts(data.analystScore, data.analystMean),
    momentum:     scoreMomentum(data.changePct, data.price, data.high52w, data.low52w),
    institutional: scoreInstitutional(data.instPct),
    debt:         scoreDebt(data.debtEquity, sectorKey),
    technical:    scoreTechnical(rsi, macd),
    ath:          scoreATH(data.price, data.high52w, ath),
    highs:        scoreHighs(highs),
  };

  // Weighted sum — only criteria with valid scores
  let totalWeight = 0;
  let weightedSum = 0;
  let validCount  = 0;

  for (const [key, score] of Object.entries(criteriaScores)) {
    if (score != null) {
      const w = WEIGHTS[key];
      weightedSum += score * w;
      totalWeight += w;
      validCount++;
    }
  }

  const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
  const isPartial  = validCount < Object.keys(WEIGHTS).length;

  let rating = 'wait';
  if (finalScore != null) {
    if (finalScore >= 66) rating = 'buy';
    else if (finalScore < 41) rating = 'sell';
  }

  return {
    score: finalScore,
    rating,
    isPartial,
    criteria: criteriaScores,
    technicals: { rsi, macd, highs, ath },
    sectorKey,
  };
}
