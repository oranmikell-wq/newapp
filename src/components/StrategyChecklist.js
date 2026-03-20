// StrategyChecklist.js — Advanced pattern recognition & strategy table

import { calcSMA, yahooChart } from '../services/StockService.js';
import { getSectorKey } from '../utils/scoring.js';

// ── Inline Lucide-style SVG icons ──────────────────────
const ICON_CHECK = `<svg class="sc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_X     = `<svg class="sc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_WARN  = `<svg class="sc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

// Industry average P/E ratios (realistic market consensus)
const INDUSTRY_PE_AVG = {
  technology:    28,
  financials:    14,
  energy:        12,
  healthcare:    22,
  real_estate:   35,
  consumer:      22,
  industrials:   20,
  communication: 22,
  utilities:     18,
  materials:     16,
  default:       22,
};

// ── Helpers ────────────────────────────────────────────
function statusCell(type, label) {
  const map = {
    YES:     { cls: 'sc-yes',     icon: ICON_CHECK },
    NO:      { cls: 'sc-no',      icon: ICON_X     },
    NEUTRAL: { cls: 'sc-neutral', icon: ICON_WARN  },
    NA:      { cls: 'sc-na',      icon: ICON_WARN  },
  };
  const s = map[type] || map.NA;
  return `<span class="sc-status ${s.cls}">${s.icon}<span>${label ?? (type === 'YES' ? 'Yes' : type === 'NO' ? 'No' : type === 'NEUTRAL' ? 'Neutral' : 'N/A')}</span></span>`;
}

function row(criteria, statusType, statusLabel, insight) {
  return `
    <tr class="sc-row">
      <td class="sc-criteria">${criteria}</td>
      <td class="sc-status-cell">${statusCell(statusType, statusLabel)}</td>
      <td class="sc-insight">${insight}</td>
    </tr>`;
}

function groupHeader(title) {
  return `<tr class="sc-group-header"><td colspan="3">${title}</td></tr>`;
}

// ── Pattern Detection ──────────────────────────────────

/**
 * Count how many times the close made a new rolling 52-week high.
 */
function countNewHighs(closes) {
  if (!closes || closes.length < 5) return 0;
  let count = 0;
  for (let i = 1; i < closes.length; i++) {
    const windowStart = Math.max(0, i - 251);
    const prevHigh    = Math.max(...closes.slice(windowStart, i));
    if (closes[i] >= prevHigh * 0.999) count++;
  }
  return count;
}

/**
 * Cup & Handle heuristic (Stan Weinstein / O'Neil rules).
 *
 * - Consolidation window: 7–65 weeks (~35–325 trading days)
 * - Cup depth: 15%–33% from left-lip high to base low
 * - Handle forms in the upper third of the cup (above 2/3 of cup depth)
 * - Handle pullback: ≤12% from handle peak
 *
 * Returns { detected, confidence, depth, handlePct, weeks }
 */
function detectCupAndHandle(closes) {
  if (!closes || closes.length < 35) return { detected: false };

  // Try windows from 65 weeks down to 7 weeks, pick best fit
  const trySizes = [];
  for (let w = Math.min(65, Math.floor(closes.length / 5)); w >= 7; w -= 4) {
    trySizes.push(w * 5); // convert weeks → trading days (≈5/week)
  }

  for (const size of trySizes) {
    if (closes.length < size) continue;
    const bars = closes.slice(-size);
    const n    = bars.length;

    // Left lip: highest in first 15%
    const leftLip  = Math.max(...bars.slice(0, Math.max(3, Math.floor(n * 0.15))));
    // Cup base: lowest in middle 50–70%
    const baseStart = Math.floor(n * 0.20);
    const baseEnd   = Math.floor(n * 0.80);
    const cupBase  = Math.min(...bars.slice(baseStart, baseEnd));
    // Right cup rim: highest in last 25%
    const rightStart = Math.floor(n * 0.65);
    const rightLip   = Math.max(...bars.slice(rightStart));

    const depth = (leftLip - cupBase) / leftLip;
    if (depth < 0.15 || depth > 0.33) continue; // cup must be 15–33% deep

    // Right lip must recover to at least 90% of left lip
    const recovery = (rightLip - cupBase) / (leftLip - cupBase);
    if (recovery < 0.90) continue;

    // Handle must form in the upper third of the cup
    const upperThirdFloor = leftLip - (leftLip - cupBase) / 3;
    const handleWindow    = bars.slice(Math.floor(n * 0.80));
    const handleLow       = Math.min(...handleWindow);
    const handleHigh      = Math.max(...handleWindow);
    if (handleLow < upperThirdFloor) continue; // handle dipped too deep

    // Handle pullback ≤ 12% from handle peak
    const handlePct = (handleHigh - handleLow) / handleHigh;
    if (handlePct < 0 || handlePct > 0.12) continue;

    return {
      detected:   true,
      confidence: handlePct < 0.06 ? 'high' : 'medium',
      depth:      (depth * 100).toFixed(0),
      handlePct:  (handlePct * 100).toFixed(1),
      weeks:      Math.round(size / 5),
    };
  }

  return { detected: false };
}

/**
 * Double Bottom heuristic (last 6 months, ~126 trading days).
 *
 * - Two distinct local minima (L1 and L2) within last 6 months
 * - L2 within ±3% of L1
 * - Peak between L1 and L2 at least 10% above the lows
 * - Confirmed if current price ≥ 97% of that peak (breakout)
 *
 * Returns { detected, confirmed, variance, recovery }
 */
function detectDoubleBottom(closes) {
  if (!closes || closes.length < 40) return { detected: false };

  const bars = closes.slice(-Math.min(closes.length, 126)); // last ~6 months

  // Find local minima: lower than 7 neighbours on each side
  const minima = [];
  for (let i = 7; i < bars.length - 7; i++) {
    const left  = bars.slice(i - 7, i);
    const right = bars.slice(i + 1, i + 8);
    if (bars[i] < Math.min(...left) && bars[i] < Math.min(...right)) {
      minima.push({ idx: i, val: bars[i] });
    }
  }

  if (minima.length < 2) return { detected: false };

  // Check all pairs of minima (prefer the last two)
  for (let a = minima.length - 2; a >= 0; a--) {
    const m1 = minima[a];
    const m2 = minima[a + 1];

    if (m2.idx - m1.idx < 10) continue; // too close together

    const variance = Math.abs(m1.val - m2.val) / m1.val;
    if (variance > 0.03) continue; // must be within 3% of each other

    const peakBetween = Math.max(...bars.slice(m1.idx, m2.idx + 1));
    const recovery    = (peakBetween - Math.min(m1.val, m2.val)) / Math.min(m1.val, m2.val);
    if (recovery < 0.10) continue; // peak must be ≥10% above both lows

    const currentPrice = closes[closes.length - 1];
    const confirmed    = currentPrice >= peakBetween * 0.97;

    return {
      detected:  true,
      confirmed,
      variance:  (variance * 100).toFixed(1),
      recovery:  (recovery * 100).toFixed(0),
    };
  }

  return { detected: false };
}

// ── Main Render ────────────────────────────────────────
export async function renderStrategyChecklist(container, data, history1Y, indicators) {
  if (!container) return;

  container.innerHTML = `<div class="sc-loading"><div class="sc-spinner"></div><span>Analyzing patterns…</span></div>`;

  const closes       = (history1Y || []).map(h => h.value).filter(v => v != null && v > 0);
  const currentPrice = data.price;

  let rows = '';

  // ── GROUP 1: Trend Indicators ──────────────────────────
  rows += groupHeader('📈 Trend Indicators');

  // MA150
  const ma150 = calcSMA(closes, 150);
  if (ma150 != null && currentPrice != null) {
    const above = currentPrice > ma150;
    const pct   = Math.abs((currentPrice / ma150 - 1) * 100).toFixed(1);
    rows += row(
      'Price above MA150',
      above ? 'YES' : 'NO',
      null,
      above
        ? `Strong mid-term uptrend — price is ${pct}% above the 150-day average`
        : `Mid-term downtrend — price is ${pct}% below the 150-day average`,
    );
  } else {
    rows += row('Price above MA150', 'NA', null, 'Insufficient price history (need 150+ trading days)');
  }

  // MA200
  if (indicators?.ma200 != null && currentPrice != null) {
    const above = indicators.priceAboveMA200;
    const pct   = Math.abs((currentPrice / indicators.ma200 - 1) * 100).toFixed(1);
    rows += row(
      'Price above MA200',
      above ? 'YES' : 'NO',
      null,
      above
        ? `Long-term uptrend confirmed — price is ${pct}% above the 200-day average`
        : `Below 200-day average — long-term trend is bearish (${pct}% below)`,
    );
  } else {
    rows += row('Price above MA200', 'NA', null, 'Insufficient price history (need 200+ trading days)');
  }

  // New 52-week highs count
  const highCount = countNewHighs(closes);
  const highStatus = highCount >= 10 ? 'YES' : highCount >= 3 ? 'NEUTRAL' : 'NO';
  rows += row(
    'New 52-Week Highs (last year)',
    highStatus,
    `${highCount}×`,
    highCount >= 10
      ? `Exceptional momentum — hit new 52-week highs ${highCount} times this year`
      : highCount >= 3
        ? `Moderate momentum — ${highCount} new highs made in the past year`
        : highCount === 0
          ? 'No new 52-week highs — weak or declining trend structure'
          : `Only ${highCount} new high(s) — limited upside momentum`,
  );

  // ── GROUP 2: Pattern Recognition ──────────────────────
  rows += groupHeader('🔍 Pattern Recognition');

  // Cup & Handle
  const cup = detectCupAndHandle(closes);
  rows += row(
    'Cup & Handle',
    cup.detected ? 'YES' : 'NEUTRAL',
    cup.detected ? (cup.confidence === 'high' ? 'Strong signal' : 'Forming') : 'Not detected',
    cup.detected
      ? `Cup depth ${cup.depth}%, handle pullback ${cup.handlePct}% — ${cup.confidence === 'high' ? 'breakout setup is imminent' : 'pattern still developing'}`
      : 'No Cup & Handle pattern identified in the last 6 months',
  );

  // Double Bottom
  const dbl = detectDoubleBottom(closes);
  rows += row(
    'Double Bottom',
    dbl.detected ? 'YES' : 'NEUTRAL',
    dbl.detected ? (dbl.confirmed ? 'Confirmed' : 'Forming') : 'Not detected',
    dbl.detected
      ? `Two lows within ${dbl.variance}% of each other, ${dbl.recovery}% bounce between them — ${dbl.confirmed ? 'breakout confirmed above neckline' : 'awaiting breakout confirmation'}`
      : 'No Double Bottom pattern identified in the last 3 months',
  );

  // ── GROUP 3: Valuation vs. Sector ─────────────────────
  rows += groupHeader('💰 Valuation vs. Sector');

  const sectorKey     = getSectorKey(data.sector);
  const industryAvgPE = INDUSTRY_PE_AVG[sectorKey] || INDUSTRY_PE_AVG.default;
  const sectorLabel   = data.sector || 'sector';

  if (data.pe != null && data.pe > 0) {
    const ratio = data.pe / industryAvgPE;
    let vType, vLabel, vInsight;

    if (ratio <= 0.8) {
      vType    = 'YES';
      vLabel   = 'Cheap';
      vInsight = `P/E of ${data.pe.toFixed(1)}x is ${((1 - ratio) * 100).toFixed(0)}% below the ${sectorLabel} average (${industryAvgPE}x) — potentially undervalued vs peers`;
    } else if (ratio <= 1.2) {
      vType    = 'NEUTRAL';
      vLabel   = 'Fair value';
      vInsight = `P/E of ${data.pe.toFixed(1)}x is in line with the ${sectorLabel} average of ${industryAvgPE}x — fairly valued`;
    } else {
      vType    = 'NO';
      vLabel   = 'Expensive';
      vInsight = `P/E of ${data.pe.toFixed(1)}x is ${((ratio - 1) * 100).toFixed(0)}% above the ${sectorLabel} average (${industryAvgPE}x) — overvalued vs peers`;
    }

    rows += row('P/E vs. Industry Average', vType, vLabel, vInsight);
  } else {
    rows += row('P/E vs. Industry Average', 'NA', null, 'P/E ratio not available — may be a non-profitable or financial-sector stock');
  }

  // ── GROUP 4: Relative Strength vs. SPY ────────────────
  rows += groupHeader('📊 Relative Strength');

  // SPY row rendered with a unique ID so we can update it after async fetch
  const spyId = `sc-spy-${Date.now()}`;
  rows += `
    <tr class="sc-row" id="${spyId}">
      <td class="sc-criteria">Drawdown vs. S&amp;P 500 (SPY)</td>
      <td class="sc-status-cell">${statusCell('NEUTRAL', 'Loading…')}</td>
      <td class="sc-insight sc-insight-loading">Fetching SPY data…</td>
    </tr>`;

  // Render table immediately (SPY will fill in async)
  container.innerHTML = `
    <div class="sc-wrap">
      <table class="sc-table">
        <thead>
          <tr>
            <th>Criteria</th>
            <th>Status</th>
            <th>Insight</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  // ── Async: fetch SPY and update row ───────────────────
  try {
    const spyRaw    = await yahooChart('SPY', '1y', '1d');
    const spyCloses = (spyRaw?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(v => v != null && v > 0);

    if (spyCloses.length > 10 && closes.length > 10 && currentPrice != null) {
      const spyATH        = Math.max(...spyCloses);
      const spyCurrent    = spyCloses[spyCloses.length - 1];
      const spyDrawdown   = (spyATH - spyCurrent) / spyATH * 100;

      const stockATH      = Math.max(...closes);
      const stockDrawdown = (stockATH - currentPrice) / stockATH * 100;

      const diff = stockDrawdown - spyDrawdown;

      let spyType, spyLabel, spyInsight;
      if (diff < -3) {
        spyType    = 'YES';
        spyLabel   = 'Stronger';
        spyInsight = `Stock drawdown: ${stockDrawdown.toFixed(1)}% vs SPY: ${spyDrawdown.toFixed(1)}% — outperforming the market by ${Math.abs(diff).toFixed(1)}%`;
      } else if (diff > 3) {
        spyType    = 'NO';
        spyLabel   = 'Weaker';
        spyInsight = `Stock drawdown: ${stockDrawdown.toFixed(1)}% vs SPY: ${spyDrawdown.toFixed(1)}% — underperforming by ${diff.toFixed(1)}% vs the market`;
      } else {
        spyType    = 'NEUTRAL';
        spyLabel   = 'In line';
        spyInsight = `Stock drawdown ${stockDrawdown.toFixed(1)}% is roughly in line with SPY ${spyDrawdown.toFixed(1)}%`;
      }

      const spyRow = document.getElementById(spyId);
      if (spyRow) {
        spyRow.querySelector('.sc-status-cell').innerHTML = statusCell(spyType, spyLabel);
        spyRow.querySelector('.sc-insight').textContent   = spyInsight;
        spyRow.querySelector('.sc-insight').classList.remove('sc-insight-loading');
      }
    } else {
      throw new Error('insufficient data');
    }
  } catch {
    const spyRow = document.getElementById(spyId);
    if (spyRow) {
      spyRow.querySelector('.sc-status-cell').innerHTML = statusCell('NA', 'N/A');
      spyRow.querySelector('.sc-insight').textContent   = 'Could not fetch SPY comparison data';
      spyRow.querySelector('.sc-insight').classList.remove('sc-insight-loading');
    }
  }
}
