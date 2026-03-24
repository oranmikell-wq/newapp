// AnalysisTables.js
// Renders two unified analysis tables: Fundamental + Technical
// Each row shows: name + ⓘ | score (0–100) or status (YES/NO/NEUTRAL) | expandable description

import { t } from '../utils/i18n.js?v=4';
import { calcSMA, yahooChart } from '../services/StockService.js';
import { getSectorKey } from '../utils/scoring.js';
import { initInfoButtons } from './InfoPopup.js';

// ── Sector averages (P/E and P/S) ──────────────────────────────
const INDUSTRY_PE_AVG = {
  technology: 28, financials: 14, energy: 12, healthcare: 22,
  real_estate: 35, consumer: 22, industrials: 20, communication: 22,
  utilities: 18, materials: 16, default: 22,
};
const INDUSTRY_PS_AVG = {
  technology: 5, financials: 2, energy: 1, healthcare: 3,
  real_estate: 6, consumer: 0.8, industrials: 1, communication: 3,
  utilities: 2, materials: 1, default: 3,
};

// ── Contextual description builder ──────────────────────────────

function buildContextualDesc(key, score, dataItems, data) {
  const vals = dataItems.length ? dataItems.join(' · ') : null;
  let ctx = '';

  switch (key) {
    case 'eps':
      ctx = score == null ? '' : score >= 66 ? t('ctxStrongEPS') : score >= 41 ? t('ctxMidEPS') : t('ctxWeakEPS');
      break;
    case 'revenue':
      ctx = score == null ? '' : score >= 66 ? t('ctxStrongRevenue') : score >= 41 ? t('ctxMidRevenue') : t('ctxWeakRevenue');
      break;
    case 'multiples':
      ctx = score == null ? '' : score >= 66 ? t('ctxValuationLow') : score >= 41 ? t('ctxValuationFair') : t('ctxValuationHigh');
      break;
    case 'analysts':
      ctx = score == null ? '' : score >= 66 ? t('ctxBullishConsensus') : score >= 41 ? t('ctxNeutralConsensus') : t('ctxBearishConsensus');
      break;
    case 'momentum':
      ctx = score == null ? '' : score >= 66 ? t('ctxHighMomentum') : score >= 41 ? t('ctxMidMomentum') : t('ctxLowMomentum');
      break;
    case 'institutional':
      ctx = score == null ? '' : score >= 66 ? t('ctxHighInstitutional') : score >= 41 ? t('ctxMidInstitutional') : t('ctxLowInstitutional');
      break;
    case 'debt':
      ctx = score == null ? '' : score >= 66 ? t('ctxLowDebt') : score >= 41 ? t('ctxMidDebt') : t('ctxHighDebt');
      break;
    case 'technical': {
      const rsiMatch = vals?.match(/RSI[:\s]+(\d+\.?\d*)/);
      const rsi = rsiMatch ? parseFloat(rsiMatch[1]) : null;
      ctx = rsi != null ? (rsi > 70 ? t('ctxRSIOverbought') : rsi < 30 ? t('ctxRSIOversold') : t('ctxRSINeutral'))
          : score == null ? '' : score >= 66 ? t('ctxHighMomentum') : score >= 41 ? t('ctxRSINeutral') : t('ctxLowMomentum');
      break;
    }
    case 'ath':
      ctx = score == null ? '' : score >= 66 ? t('ctxNearHigh') : t('ctxFarFromHigh');
      break;
    case 'highs':
      ctx = score == null ? '' : score >= 66 ? t('ctxManyHighs') : t('ctxFewHighs');
      break;
    case 'peg':
      if (data?.peg != null) ctx = data.peg < 1 ? t('ctxPEGCheap') : data.peg <= 2 ? t('ctxPEGFair') : t('ctxPEGExpensive');
      break;
    case 'currentRatio':
      if (data?.currentRatio != null) {
        const cr = data.currentRatio;
        ctx = cr >= 2 ? t('ctxCRExcellent') : cr >= 1.5 ? t('ctxCRGood') : cr >= 1 ? t('ctxCROk') : t('ctxCRRisk');
      }
      break;
    case 'roe':
      if (data?.roe != null) ctx = data.roe >= 20 ? t('ctxROEHigh') : data.roe >= 15 ? t('ctxROEGood') : data.roe >= 10 ? t('ctxROEMid') : t('ctxROELow');
      break;
    case 'fcf':
      if (data?.fcf != null) ctx = data.fcf >= 0 ? t('ctxFCFPositive') : t('ctxFCFNegative');
      break;
    default:
      ctx = '';
  }

  if (vals && ctx) return `${vals} — ${ctx}`;
  if (vals) return vals;
  if (ctx) return ctx;
  return t('criteria_' + key + '_desc');
}

// ── Row builders ────────────────────────────────────────────────

/**
 * Scored row: Indicator | Score | Status | Explanation
 */
function criteriaRow(key, score, descText, dataItems = [], data = null) {
  const hasData    = score != null;
  const scoreNum   = hasData ? Math.round(score) : '—';
  const statusCls  = !hasData ? 'score-none' : score >= 66 ? 'score-high' : score >= 41 ? 'score-mid' : 'score-low';
  const statusText = !hasData ? t('noData') : score >= 66 ? t('statusHigh') : score >= 41 ? t('statusMid') : t('statusLow');
  const barColor   = !hasData ? 'var(--border)' : score >= 66 ? 'var(--green)' : score >= 41 ? 'var(--yellow)' : 'var(--red)';
  const descLine   = buildContextualDesc(key, score, dataItems, data);
  return `
    <tr class="at-tr">
      <td class="at-td-name">
        <span class="at-name">${t('criteria_' + key)}</span>
        <button class="info-icon-btn" data-info="crit_${key}" aria-label="info">i</button>
      </td>
      <td class="at-td-score">
        <div class="at-score-wrap">
          <span class="at-score-num">${scoreNum}</span>
          ${hasData ? `<div class="at-bar-track"><div class="at-bar" style="width:${score}%;background:${barColor}"></div></div>` : ''}
        </div>
      </td>
      <td class="at-td-status">
        <span class="criteria-score-badge ${statusCls}">${statusText}</span>
      </td>
      <td class="at-td-desc">${descLine}</td>
    </tr>`;
}

/**
 * Checklist row: Indicator | — | YES/NO/NEUTRAL | Explanation
 */
function checklistRow(name, infoKey, statusType, statusLabel, insight, score) {
  const statusCls  = statusType === 'YES' ? 'score-high' : statusType === 'NO' ? 'score-low' : statusType === 'NEUTRAL' ? 'score-mid' : 'score-none';
  const badgeText  = statusLabel || (statusType === 'YES' ? '✓' : statusType === 'NO' ? '✗' : statusType === 'NEUTRAL' ? '~' : 'N/A');
  const descLine   = insight || '—';
  return `
    <tr class="at-tr">
      <td class="at-td-name">
        <span class="at-name">${name}</span>
        <button class="info-icon-btn" data-info="${infoKey}" aria-label="info">i</button>
      </td>
      <td class="at-td-score">—</td>
      <td class="at-td-status">
        <span class="criteria-score-badge ${statusCls}">${badgeText}</span>
      </td>
      <td class="at-td-desc">${descLine}</td>
    </tr>`;
}

// ── Section wrapper ─────────────────────────────────────────────
function sectionHTML(titleKey, rows) {
  return `
    <h2 class="section-title at-section-title">${t(titleKey)}</h2>
    <table class="at-table">
      <thead>
        <tr class="at-thead-tr">
          <th class="at-th at-th-name">${t('colIndicator')}</th>
          <th class="at-th at-th-score">${t('colScore')}</th>
          <th class="at-th at-th-status">${t('colStatus')}</th>
          <th class="at-th at-th-desc">${t('colExplanation')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Raw data helpers (same as CriteriaTable.js) ─────────────────
function rawDataFor(key, scored, data) {
  switch (key) {
    case 'eps':
      return data.epsGrowth != null ? [`${t('criteriaEpsGrowthLabel')}: ${data.epsGrowth.toFixed(1)}%`] : [];
    case 'multiples':
      return [
        data.pe != null ? (data.pe > 0 ? `P/E: ${data.pe.toFixed(1)}` : 'P/E: N/A') : null,
        data.pb && data.pb > 0 ? `P/B: ${data.pb.toFixed(1)}` : null,
        data.ps && data.ps > 0 ? `P/S: ${data.ps.toFixed(1)}` : null,
      ].filter(Boolean);
    case 'revenue':
      return data.revenueGrowth != null ? [`${t('criteriaRevenueGrowthLabel')}: ${data.revenueGrowth.toFixed(1)}%`] : [];
    case 'analysts': {
      if (data.analystMean != null) {
        const labelKeys = ['', 'analystStrongBuy', 'analystBuy', 'analystHold', 'analystUnderperform', 'analystSell'];
        const labelKey  = labelKeys[Math.round(data.analystMean)];
        const label     = labelKey ? t(labelKey) : '';
        const count     = data.analystCount ? ` (${data.analystCount})` : '';
        return [`Mean: ${data.analystMean.toFixed(1)} — ${label}${count}`];
      }
      if (data.analystScore) {
        return [
          `${t('analystBuy')}: ${data.analystScore.buy + data.analystScore.strongBuy}`,
          `${t('analystHold')}: ${data.analystScore.hold}`,
          `${t('analystSell')}: ${data.analystScore.sell}`,
        ];
      }
      return [];
    }
    case 'momentum':
      return [
        data.changePct != null && `${t('criteriaDailyChange')}: ${data.changePct.toFixed(2)}%`,
        data.high52w   && `${t('criteria52wHigh')}: ${data.high52w.toFixed(2)}`,
      ].filter(Boolean);
    case 'institutional':
      return data.instPct != null ? [`Holdings: ${(data.instPct * 100).toFixed(1)}%`] : [];
    case 'debt':
      return data.debtEquity != null ? [`D/E: ${data.debtEquity.toFixed(2)}`] : [];
    case 'technical':
      return [
        scored.technicals?.rsi  != null && `RSI: ${scored.technicals.rsi.toFixed(1)}`,
        scored.technicals?.macd != null && `MACD: ${scored.technicals.macd.toFixed(2)}`,
      ].filter(Boolean);
    case 'ath':
      return [
        data.price    != null && data.high52w != null && `52w High: $${data.high52w.toFixed(2)}`,
        data.price    != null && `${t('distFromHigh')}: ${data.high52w ? (((data.price - data.high52w) / data.high52w) * 100).toFixed(1) + '%' : 'N/A'}`,
      ].filter(Boolean);
    case 'highs':
      return scored.technicals?.highs
        ? [`1Y: ${scored.technicals.highs.y1 ?? 0}×`, `3Y: ${scored.technicals.highs.y3 ?? 0}×`, `5Y: ${scored.technicals.highs.y5 ?? 0}×`]
        : [];
    case 'peg':
      return data.peg != null ? [`PEG: ${data.peg.toFixed(2)}`] : [];
    case 'currentRatio':
      return data.currentRatio != null ? [`${data.currentRatio.toFixed(2)}`] : [];
    case 'roe':
      return data.roe != null ? [`ROE: ${data.roe.toFixed(1)}%`] : [];
    case 'fcf':
      if (data.fcf == null) return [];
      const fcfAbs = Math.abs(data.fcf);
      const fcfFmt = fcfAbs >= 1e9 ? `${(data.fcf / 1e9).toFixed(1)}B`
                   : fcfAbs >= 1e6 ? `${(data.fcf / 1e6).toFixed(0)}M`
                   : `${data.fcf.toFixed(0)}`;
      return [`FCF: $${fcfFmt}`];
    default:
      return [];
  }
}

// ── Main render ─────────────────────────────────────────────────

/**
 * renderAnalysisTables(fundamentalEl, technicalEl, scored, data, history, indicators)
 *
 * Renders two unified tables: Fundamental + Technical.
 * The SPY row is updated asynchronously after the initial render.
 */
export async function renderAnalysisTables(fundamentalEl, technicalEl, scored, data, history, indicators) {
  if (!fundamentalEl && !technicalEl) return;

  const closes       = (history || []).map(h => h.value).filter(v => v != null && v > 0);
  const currentPrice = data.price;
  const sectorKey    = getSectorKey(data.sector);

  // ── FUNDAMENTAL rows ─────────────────────────────────────────
  const FUNDAMENTAL_CRITERIA = ['eps', 'multiples', 'revenue', 'analysts', 'institutional', 'debt', 'peg', 'currentRatio', 'roe', 'fcf'];
  let fundRows = '';

  for (const key of FUNDAMENTAL_CRITERIA) {
    const score = scored.criteria[key];
    fundRows += criteriaRow(key, score, '', rawDataFor(key, scored, data), data);
  }

  // P/E vs Sector (checklist item → Fundamental)
  const industryAvgPE = INDUSTRY_PE_AVG[sectorKey] || INDUSTRY_PE_AVG.default;
  const industryAvgPS = INDUSTRY_PS_AVG[sectorKey] || INDUSTRY_PS_AVG.default;
  const sectorLabel   = data.sector || '';

  if (data.pe != null && data.pe > 0) {
    const ratio = data.pe / industryAvgPE;
    let vType, vLabel, vInsight;
    if (ratio <= 0.8) {
      vType = 'YES'; vLabel = t('sc_cheap');
      vInsight = t('sc_i_pe_cheap', { pe: data.pe.toFixed(1), pct: ((1 - ratio) * 100).toFixed(0), sector: sectorLabel, avg: industryAvgPE });
    } else if (ratio <= 1.2) {
      vType = 'NEUTRAL'; vLabel = t('sc_fair');
      vInsight = t('sc_i_pe_fair', { pe: data.pe.toFixed(1), sector: sectorLabel, avg: industryAvgPE });
    } else {
      vType = 'NO'; vLabel = t('sc_expensive');
      vInsight = t('sc_i_pe_expensive', { pe: data.pe.toFixed(1), pct: ((ratio - 1) * 100).toFixed(0), sector: sectorLabel, avg: industryAvgPE });
    }
    fundRows += checklistRow(t('sc_pe_vs_sector'), 'sc_pe_sector', vType, vLabel, vInsight);
  } else if (data.ps != null && data.ps > 0) {
    const ratio = data.ps / industryAvgPS;
    let vType, vLabel, vInsight;
    if (ratio <= 0.8) {
      vType = 'YES'; vLabel = t('sc_cheap');
      vInsight = t('sc_i_ps_cheap', { ps: data.ps.toFixed(1), pct: ((1 - ratio) * 100).toFixed(0), sector: sectorLabel, avg: industryAvgPS });
    } else if (ratio <= 1.2) {
      vType = 'NEUTRAL'; vLabel = t('sc_fair');
      vInsight = t('sc_i_ps_fair', { ps: data.ps.toFixed(1), sector: sectorLabel, avg: industryAvgPS });
    } else {
      vType = 'NO'; vLabel = t('sc_expensive');
      vInsight = t('sc_i_ps_expensive', { ps: data.ps.toFixed(1), pct: ((ratio - 1) * 100).toFixed(0), sector: sectorLabel, avg: industryAvgPS });
    }
    fundRows += checklistRow(t('sc_ps_vs_sector'), 'sc_pe_sector', vType, vLabel, vInsight);
  } else {
    fundRows += checklistRow(t('sc_pe_vs_sector'), 'sc_pe_sector', 'NA', null, t('sc_i_pe_nodata'));
  }

  // ── TECHNICAL rows ───────────────────────────────────────────
  const TECHNICAL_CRITERIA = ['momentum', 'technical', 'ath', 'highs'];
  let techRows = '';

  for (const key of TECHNICAL_CRITERIA) {
    const score = scored.criteria[key];
    techRows += criteriaRow(key, score, '', rawDataFor(key, scored, data), data);
  }

  // MA150
  const ma150 = calcSMA(closes, 150);
  if (ma150 != null && currentPrice != null) {
    const above = currentPrice > ma150;
    const pct   = Math.abs((currentPrice / ma150 - 1) * 100).toFixed(1);
    techRows += checklistRow(t('sc_ma150'), 'sc_ma150', above ? 'YES' : 'NO', null,
      above ? t('sc_i_ma150_above', { pct }) : t('sc_i_ma150_below', { pct }));
  } else {
    techRows += checklistRow(t('sc_ma150'), 'sc_ma150', 'NA', null, t('sc_i_ma_nodata', { n: 150 }));
  }

  // MA200
  if (indicators?.ma200 != null && currentPrice != null) {
    const above = indicators.priceAboveMA200;
    const pct   = Math.abs((currentPrice / indicators.ma200 - 1) * 100).toFixed(1);
    techRows += checklistRow(t('sc_ma200'), 'sc_ma200', above ? 'YES' : 'NO', null,
      above ? t('sc_i_ma200_above', { pct }) : t('sc_i_ma200_below', { pct }));
  } else {
    techRows += checklistRow(t('sc_ma200'), 'sc_ma200', 'NA', null, t('sc_i_ma_nodata', { n: 200 }));
  }

  // New 52-week highs
  const highCount  = countNewHighs(closes);
  const highStatus = highCount >= 10 ? 'YES' : highCount >= 3 ? 'NEUTRAL' : 'NO';
  techRows += checklistRow(t('sc_new_highs'), 'sc_new_highs', highStatus, `${highCount}×`,
    highCount >= 10 ? t('sc_i_highs_high', { n: highCount })
    : highCount >= 3 ? t('sc_i_highs_mid', { n: highCount })
    : highCount === 0 ? t('sc_i_highs_zero')
    : t('sc_i_highs_few', { n: highCount }));

  // Cup & Handle
  const cup = detectCupAndHandle(closes);
  techRows += checklistRow(t('sc_cup_handle'), 'sc_cup_handle',
    cup.detected ? 'YES' : 'NEUTRAL',
    cup.detected ? t('sc_forming') : t('sc_not_detected'),
    cup.detected
      ? t('sc_i_cup_found', { depth: cup.depth, handle: cup.handlePct, msg: cup.confidence === 'high' ? t('sc_i_cup_break') : t('sc_i_cup_forming') })
      : t('sc_i_cup_none'));

  // Double Bottom
  const dbl = detectDoubleBottom(closes);
  techRows += checklistRow(t('sc_double_bottom'), 'sc_double_bottom',
    dbl.detected ? 'YES' : 'NEUTRAL',
    dbl.detected ? (dbl.confirmed ? t('sc_confirmed') : t('sc_forming')) : t('sc_not_detected'),
    dbl.detected
      ? t('sc_i_dbl_found', { v: dbl.variance, r: dbl.recovery, msg: dbl.confirmed ? t('sc_i_dbl_confirmed') : t('sc_i_dbl_forming') })
      : t('sc_i_dbl_none'));

  // SPY placeholder (async)
  const spyId = `at-spy-${Date.now()}`;
  techRows += `
    <tr class="at-tr" id="${spyId}">
      <td class="at-td-name">
        <span class="at-name">${t('sc_spy_drawdown')}</span>
        <button class="info-icon-btn" data-info="sc_spy" aria-label="info">i</button>
      </td>
      <td class="at-td-score">—</td>
      <td class="at-td-status">
        <span class="criteria-score-badge score-none at-spy-badge">…</span>
      </td>
      <td class="at-td-desc at-spy-desc">—</td>
    </tr>`;

  // ── Render ──────────────────────────────────────────────────
  if (fundamentalEl) {
    fundamentalEl.innerHTML = sectionHTML('analysisFundamental', fundRows);
    initInfoButtons(fundamentalEl);
  }
  if (technicalEl) {
    technicalEl.innerHTML = sectionHTML('analysisTechnical', techRows);
    initInfoButtons(technicalEl);
  }

  // ── Async: fetch SPY ────────────────────────────────────────
  try {
    const spyRaw    = await yahooChart('SPY', '1y', '1d');
    const spyCloses = (spyRaw?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(v => v != null && v > 0);

    if (spyCloses.length > 10 && closes.length > 10 && currentPrice != null) {
      const spyATH        = Math.max(...spyCloses);
      const spyCurrent    = spyCloses[spyCloses.length - 1];
      const spyDrawdown   = (spyATH - spyCurrent) / spyATH * 100;
      const stockATH      = Math.max(...closes);
      const stockDrawdown = (stockATH - currentPrice) / stockATH * 100;
      const diff          = stockDrawdown - spyDrawdown;

      let spyType, spyLabel, spyInsight;
      if (diff < -3) {
        spyType = 'YES'; spyLabel = t('sc_stronger');
        spyInsight = t('sc_i_spy_stronger', { stock: stockDrawdown.toFixed(1), spy: spyDrawdown.toFixed(1), diff: Math.abs(diff).toFixed(1) });
      } else if (diff > 3) {
        spyType = 'NO'; spyLabel = t('sc_weaker');
        spyInsight = t('sc_i_spy_weaker', { stock: stockDrawdown.toFixed(1), spy: spyDrawdown.toFixed(1), diff: diff.toFixed(1) });
      } else {
        spyType = 'NEUTRAL'; spyLabel = t('sc_in_line');
        spyInsight = t('sc_i_spy_inline', { stock: stockDrawdown.toFixed(1), spy: spyDrawdown.toFixed(1) });
      }

      const spyRow = document.getElementById(spyId);
      if (spyRow) {
        const badgeCls = spyType === 'YES' ? 'score-high' : spyType === 'NO' ? 'score-low' : 'score-mid';
        const badge    = spyRow.querySelector('.at-spy-badge');
        const desc     = spyRow.querySelector('.at-spy-desc');
        if (badge) { badge.textContent = spyLabel; badge.className = `criteria-score-badge ${badgeCls}`; }
        if (desc)  { desc.textContent = spyInsight; }
      }
    }
  } catch { /* SPY unavailable — keep N/A state */ }
}

// ── Pattern detection (from StrategyChecklist.js) ───────────────

export function countNewHighs(closes) {
  if (!closes || closes.length < 5) return 0;
  let count = 0;
  for (let i = 1; i < closes.length; i++) {
    const windowStart = Math.max(0, i - 251);
    const prevHigh    = Math.max(...closes.slice(windowStart, i));
    if (closes[i] >= prevHigh * 0.999) count++;
  }
  return count;
}

function detectCupAndHandle(closes) {
  if (!closes || closes.length < 35) return { detected: false };
  const trySizes = [];
  for (let w = Math.min(65, Math.floor(closes.length / 5)); w >= 7; w -= 4) {
    trySizes.push(w * 5);
  }
  for (const size of trySizes) {
    if (closes.length < size) continue;
    const bars = closes.slice(-size);
    const n    = bars.length;
    const leftLip  = Math.max(...bars.slice(0, Math.max(3, Math.floor(n * 0.15))));
    const cupBase  = Math.min(...bars.slice(Math.floor(n * 0.20), Math.floor(n * 0.80)));
    const rightLip = Math.max(...bars.slice(Math.floor(n * 0.65)));
    const depth    = (leftLip - cupBase) / leftLip;
    if (depth < 0.15 || depth > 0.33) continue;
    if ((rightLip - cupBase) / (leftLip - cupBase) < 0.90) continue;
    const upperThirdFloor = leftLip - (leftLip - cupBase) / 3;
    const handleWindow    = bars.slice(Math.floor(n * 0.80));
    const handleLow       = Math.min(...handleWindow);
    const handleHigh      = Math.max(...handleWindow);
    if (handleLow < upperThirdFloor) continue;
    const handlePct = (handleHigh - handleLow) / handleHigh;
    if (handlePct < 0 || handlePct > 0.12) continue;
    return { detected: true, confidence: handlePct < 0.06 ? 'high' : 'medium', depth: (depth * 100).toFixed(0), handlePct: (handlePct * 100).toFixed(1), weeks: Math.round(size / 5) };
  }
  return { detected: false };
}

function detectDoubleBottom(closes) {
  if (!closes || closes.length < 40) return { detected: false };
  const bars   = closes.slice(-Math.min(closes.length, 126));
  const minima = [];
  for (let i = 7; i < bars.length - 7; i++) {
    if (bars[i] < Math.min(...bars.slice(i - 7, i)) && bars[i] < Math.min(...bars.slice(i + 1, i + 8))) {
      minima.push({ idx: i, val: bars[i] });
    }
  }
  if (minima.length < 2) return { detected: false };
  for (let a = minima.length - 2; a >= 0; a--) {
    const m1 = minima[a], m2 = minima[a + 1];
    if (m2.idx - m1.idx < 10) continue;
    const variance    = Math.abs(m1.val - m2.val) / m1.val;
    if (variance > 0.03) continue;
    const peakBetween = Math.max(...bars.slice(m1.idx, m2.idx + 1));
    const recovery    = (peakBetween - Math.min(m1.val, m2.val)) / Math.min(m1.val, m2.val);
    if (recovery < 0.10) continue;
    return { detected: true, confirmed: closes[closes.length - 1] >= peakBetween * 0.97, variance: (variance * 100).toFixed(1), recovery: (recovery * 100).toFixed(0) };
  }
  return { detected: false };
}
