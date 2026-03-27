// SummaryGauge.js
// Animated SVG gauge with 4-factor scoring:
//   20% RSI(14) | 30% Moving Averages | 25% Valuation (P/E or P/S) | 25% Relative Strength
//   Growth/Pre-profit mode: 20% RSI | 30% MA | 15% Valuation (P/S) | 35% RS

import { t } from '../utils/i18n.js?v=5';
import { getSectorKey, SECTOR_PS, normalizeInverse } from '../utils/scoring.js';
import { initInfoButtons } from './InfoPopup.js';

// ── SVG geometry constants ────────────────────────────────
const CX = 150, CY = 158, R = 110;
const DASHLEN = Math.PI * R; // full semicircle arc length ≈ 345.58

// ═════════════════════════════════════════════════════════
// SCORING
// ═════════════════════════════════════════════════════════

/**
 * Calculate a summary score from 4 weighted factors.
 *
 * @param  {Object} data        - Parsed stock quote (price, pe, high52w, …)
 * @param  {Object} indicators  - From fetchStockFullData: {rsi14, priceAboveMA50, priceAboveMA200, goldenCross}
 * @returns {{ score, rating, isPartial, breakdown }}
 */
export function calcSummaryScore(data, indicators) {
  const scores = {};

  // ── 1. RSI 14 (20%) ──────────────────────────────────
  const rsi = indicators?.rsi14;
  if (rsi != null) {
    if      (rsi < 30) scores.rsi = 80;  // oversold  — potential entry
    else if (rsi < 45) scores.rsi = 75;  // below mid — healthy
    else if (rsi < 55) scores.rsi = 60;  // neutral
    else if (rsi < 65) scores.rsi = 50;  // approaching overbought
    else if (rsi < 75) scores.rsi = 28;  // overbought
    else               scores.rsi = 10;  // very overbought
  }

  // ── 2. Moving Averages (30%) ─────────────────────────
  const { priceAboveMA50, priceAboveMA200, goldenCross } = indicators || {};
  if (priceAboveMA50 != null || priceAboveMA200 != null) {
    if      (priceAboveMA50 && priceAboveMA200 && goldenCross) scores.ma = 100;
    else if (priceAboveMA50 && priceAboveMA200)                scores.ma = 80;
    else if (priceAboveMA50)                                   scores.ma = 55;
    else if (priceAboveMA200)                                  scores.ma = 38;
    else                                                       scores.ma = 10;
  }

  // ── 3. Valuation: P/E primary, P/S vs sector as fallback for unprofitable stocks ──
  let valuationMetric = null;
  const pe = data?.pe;
  if (pe != null && pe > 0) {
    valuationMetric = 'pe';
    if      (pe < 10) scores.pe = 92;
    else if (pe < 15) scores.pe = 82;
    else if (pe < 20) scores.pe = 72;
    else if (pe < 25) scores.pe = 60;
    else if (pe < 35) scores.pe = 42;
    else if (pe < 50) scores.pe = 24;
    else              scores.pe = 10;
  } else if (data?.ps != null && data.ps > 0) {
    valuationMetric = 'ps';
    const sectorKey = getSectorKey(data?.sector);
    scores.pe = Math.round(normalizeInverse(data.ps, SECTOR_PS[sectorKey] || SECTOR_PS.default));
  }

  // ── 4. Relative Strength ─────────────────────────────
  // 52-week position (70%) + daily momentum (30%)
  const { price, high52w, low52w, changePct } = data || {};
  if (price != null && high52w != null && low52w != null) {
    const range    = high52w - low52w;
    const posScore = range > 0 ? Math.round((price - low52w) / range * 100) : 50;
    const momScore = changePct != null
      ? Math.min(100, Math.max(0, Math.round((changePct + 5) / 10 * 100)))
      : posScore;
    scores.rs = Math.round(posScore * 0.70 + momScore * 0.30);
  }

  // ── Growth/Pre-profit detection ───────────────────────
  // A stock is "growth profile" when PE is unavailable or negative
  const isGrowthProfile = (pe == null || pe <= 0);

  // ── Dynamic weights based on profile ─────────────────
  let WEIGHTS;
  if (!isGrowthProfile) {
    // Normal: P/E available
    WEIGHTS = { rsi: 0.20, ma: 0.30, pe: 0.25, rs: 0.25 };
  } else if (valuationMetric === 'ps') {
    // Growth + P/S available: reduce valuation, boost RS
    WEIGHTS = { rsi: 0.20, ma: 0.30, pe: 0.15, rs: 0.35 };
  } else {
    // Growth + no valuation at all: redistribute 25% equally to MA and RS
    WEIGHTS = { rsi: 0.20, ma: 0.375, rs: 0.425 };
  }

  // ── Weighted sum (skip missing factors) ──────────────
  let totalWeight = 0, weightedSum = 0;
  for (const [key, s] of Object.entries(scores)) {
    if (WEIGHTS[key] != null) {
      weightedSum += s * WEIGHTS[key];
      totalWeight += WEIGHTS[key];
    }
  }

  const finalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
  const isPartial  = Object.keys(scores).length < Object.keys(WEIGHTS).length;

  let rating = 'wait';
  if (finalScore != null) {
    if      (finalScore >= 66) rating = 'buy';
    else if (finalScore < 41)  rating = 'sell';
  }

  return { score: finalScore, rating, isPartial, breakdown: scores, valuationMetric, isGrowthProfile, weights: WEIGHTS };
}

// ═════════════════════════════════════════════════════════
// COLOR HELPERS
// ═════════════════════════════════════════════════════════

function lerpColor(hex1, hex2, t) {
  const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

/** Returns an interpolated color for scores 0 → 100 (red → amber → green) */
function scoreToColor(score) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  if (s < 41) return lerpColor('#dc2626', '#f59e0b', s / 40);
  if (s < 66) return lerpColor('#f59e0b', '#22c55e', (s - 40) / 25);
  return lerpColor('#22c55e', '#16a34a', (s - 65) / 35);
}

// ═════════════════════════════════════════════════════════
// SVG BUILDER
// ═════════════════════════════════════════════════════════

/** Point on the semicircle arc at a given score (0-100) */
function pointOnArc(score, radius = R) {
  const angle = Math.PI * (1 - score / 100);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function buildGaugeSVG() {
  const svg = el('svg', { viewBox: '0 0 300 180', fill: 'none', class: 'sg-svg' });

  // ── Gradient definition ──
  const defs = el('defs');
  // Glow filter
  defs.innerHTML = `
    <filter id="sg-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="sg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#dc2626"/>
      <stop offset="40%"  stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>`;
  svg.appendChild(defs);

  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  // ── Background track ──
  svg.appendChild(el('path', {
    d: arcPath, stroke: 'var(--sg-track)', 'stroke-width': '20',
    'stroke-linecap': 'round',
  }));

  // ── Zone separators at 45 and 70 ──
  for (const tick of [45, 70]) {
    const inner = pointOnArc(tick, R - 13);
    const outer = pointOnArc(tick, R + 12);
    svg.appendChild(el('line', {
      x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y,
      stroke: 'var(--sg-sep)', 'stroke-width': '2.5', 'stroke-linecap': 'round',
    }));
  }

  // ── Score arc (animated via JS) ──
  const arc = el('path', {
    id: 'sg-arc', d: arcPath,
    stroke: '#dc2626', 'stroke-width': '20', 'stroke-linecap': 'round',
    filter: 'url(#sg-glow)',
  });
  arc.style.strokeDasharray  = DASHLEN;
  arc.style.strokeDashoffset = DASHLEN;
  svg.appendChild(arc);

  // ── Scale labels: 0 / 50 / 100 ──
  const scaleLabels = [
    { s: 0,   text: '0',    x: CX - R - 18, y: CY + 16, anchor: 'start'  },
    { s: 50,  text: '50',   x: CX,          y: CY-R-12, anchor: 'middle' },
    { s: 100, text: '100',  x: CX + R + 18, y: CY + 16, anchor: 'end'    },
  ];
  for (const { text, x, y, anchor } of scaleLabels) {
    const t = el('text', {
      x, y, 'text-anchor': anchor, 'font-size': '10',
      'font-family': 'Inter, Rubik, sans-serif', fill: 'var(--sg-label)',
    });
    t.textContent = text;
    svg.appendChild(t);
  }

  // ── Zone labels: Bearish / Neutral / Bullish ──
  const zoneData = [
    { pct: 20, text: t('zone_bearish') },
    { pct: 53, text: t('zone_neutral') },
    { pct: 83, text: t('zone_bullish') },
  ];
  for (const { pct, text } of zoneData) {
    const pt = pointOnArc(pct, R - 32);
    const zt = el('text', {
      x: pt.x, y: pt.y, 'text-anchor': 'middle', 'font-size': '8.5',
      'font-weight': '600', 'font-family': 'Inter, Rubik, sans-serif',
      fill: 'var(--sg-zone)',
    });
    zt.textContent = text;
    svg.appendChild(zt);
  }

  // ── Needle ──
  const startPt = pointOnArc(0, 85);
  const needle = el('line', {
    id: 'sg-needle',
    x1: CX, y1: CY, x2: startPt.x, y2: startPt.y,
    stroke: 'var(--sg-needle)', 'stroke-width': '2.5', 'stroke-linecap': 'round',
  });
  svg.appendChild(needle);

  // ── Center hub ──
  svg.appendChild(el('circle', {
    cx: CX, cy: CY, r: '7', fill: 'var(--sg-hub)',
  }));
  svg.appendChild(el('circle', {
    cx: CX, cy: CY, r: '3.5', fill: 'var(--sg-hub-inner)',
  }));

  // ── Score number (animates via JS) ──
  const scoreText = el('text', {
    id: 'sg-score-text', x: CX, y: CY - 22,
    'text-anchor': 'middle', 'font-size': '38', 'font-weight': '800',
    'font-family': 'Inter, Rubik, sans-serif', fill: '#dc2626',
  });
  scoreText.textContent = '0';
  svg.appendChild(scoreText);

  return svg;
}

// ═════════════════════════════════════════════════════════
// ANIMATION ENGINE  (requestAnimationFrame, ease-out-cubic)
// ═════════════════════════════════════════════════════════

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateGauge(svg, targetScore, duration = 1300) {
  if (targetScore == null) return;
  const arc       = svg.querySelector('#sg-arc');
  const needle    = svg.querySelector('#sg-needle');
  const scoreText = svg.querySelector('#sg-score-text');
  if (!arc || !needle || !scoreText) return;

  let startTime = null;

  function frame(ts) {
    if (!startTime) startTime = ts;
    const progress = Math.min(1, (ts - startTime) / duration);
    const eased    = easeOutCubic(progress);
    const current  = targetScore * eased;
    const color    = scoreToColor(current);

    // Arc: fill from left based on current score
    arc.style.strokeDashoffset = DASHLEN * (1 - current / 100);
    arc.setAttribute('stroke', color);

    // Needle rotation
    const pt = pointOnArc(current, 85);
    needle.setAttribute('x2', pt.x);
    needle.setAttribute('y2', pt.y);

    // Score count-up + color
    scoreText.textContent = Math.round(current);
    scoreText.setAttribute('fill', color);

    // Dynamic glow: intensity grows with score, color matches arc
    const glowSize    = Math.round(4 + eased * 20);
    const glowOpacity = (0.25 + eased * 0.55).toFixed(2);
    // Convert rgb(...) → rgba(..., opacity) for the glow
    const glowColor   = color.replace('rgb(', 'rgba(').replace(')', `,${glowOpacity})`);
    arc.style.filter  = `drop-shadow(0 0 ${glowSize}px ${glowColor}) drop-shadow(0 0 ${glowSize * 2}px ${glowColor})`;

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ═════════════════════════════════════════════════════════
// BREAKDOWN BARS
// ═════════════════════════════════════════════════════════

// 4-family breakdown factors
const FAMILY_FACTORS = [
  { key: 'growth',    i18n: 'analysisFamilyGrowth',    weight: 0.35 },
  { key: 'valuation', i18n: 'analysisFamilyValuation',  weight: 0.25 },
  { key: 'quality',   i18n: 'analysisFamilyQuality',    weight: 0.20 },
  { key: 'technical', i18n: 'analysisFamilyTechnical',  weight: 0.20 },
];

function buildBreakdown(families) {
  const wrap = document.createElement('div');
  wrap.className = 'sg-breakdown';

  FAMILY_FACTORS.forEach(({ key, i18n, weight }, idx) => {
    const label  = t(i18n);
    const wLabel = `${Math.round(weight * 100)}%`;
    const score  = families?.[key] != null ? Math.round(families[key]) : null;
    const color  = score != null ? scoreToColor(score) : '#cbd5e1';

    const row = document.createElement('div');
    row.className = 'sg-row';
    row.innerHTML = `
      <div class="sg-row-meta">
        <span class="sg-name-btn">
          <span class="sg-factor-name">${label}</span>
        </span>
        <span class="sg-factor-weight">${wLabel}</span>
      </div>
      <div class="sg-bar-track">
        <div class="sg-bar-fill" style="width:0%;background:${color}" data-target="${score ?? 0}"></div>
      </div>
      <span class="sg-factor-score" style="color:${score != null ? color : 'var(--text-3)'}">${score ?? '—'}</span>`;

    wrap.appendChild(row);

    if (score != null) {
      const bar = row.querySelector('.sg-bar-fill');
      setTimeout(() => {
        bar.style.transition = 'width 1.1s cubic-bezier(0.34,1.2,0.64,1)';
        bar.style.width = `${score}%`;
      }, 120 + idx * 80);
    }
  });

  return wrap;
}

// ═════════════════════════════════════════════════════════
// MAIN RENDER  (public API)
// ═════════════════════════════════════════════════════════

const BADGE_META = {
  buy:  { key: 'buy',  cls: 'sg-badge-buy'  },
  wait: { key: 'wait', cls: 'sg-badge-wait' },
  sell: { key: 'sell', cls: 'sg-badge-sell' },
};

/**
 * Render the animated SummaryGauge into `container`.
 * Accepts the scored object from calcScore (4-family model).
 *
 * @param {HTMLElement} container
 * @param {{ score, rating, isPartial, families }} scored
 */
export function renderSummaryGauge(container, scored) {
  if (!container) return;
  container.innerHTML = '';

  const { score, rating, isPartial, families } = scored || {};
  const badge = BADGE_META[rating] || BADGE_META.wait;

  // Card shell
  const card = document.createElement('div');
  card.className = 'sg-card';

  card.innerHTML = `
    <div class="sg-header">
      <span class="sg-badge ${badge.cls}">${t(badge.key)}</span>
    </div>`;

  // Body: SVG + breakdown (flex)
  const body = document.createElement('div');
  body.className = 'sg-body';

  const svgWrap = document.createElement('div');
  svgWrap.className = 'sg-svg-wrap';

  const svg = buildGaugeSVG();
  svgWrap.appendChild(svg);

  if (isPartial) {
    const note = document.createElement('p');
    note.className = 'sg-partial';
    note.textContent = t('partialDataWarn');
    svgWrap.appendChild(note);
  }

  if (score == null) {
    const na = document.createElement('p');
    na.className = 'sg-no-data';
    na.textContent = t('notEnoughData');
    svgWrap.appendChild(na);
  }

  body.appendChild(svgWrap);
  body.appendChild(buildBreakdown(families));
  card.appendChild(body);
  container.appendChild(card);

  requestAnimationFrame(() => animateGauge(svg, score ?? 0));

  initInfoButtons(card);
}
