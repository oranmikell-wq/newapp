// AAIISentiment.js — AAII Investor Sentiment Survey (stacked bar chart)

import { t } from '../utils/i18n.js';
import { fetchProxy } from '../services/StockService.js';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY  = '7a1406a89db10455c27f6c7af6a94e08';

async function fetchFred(seriesId) {
  const key = localStorage.getItem('bon-fred-key') || FRED_KEY;
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=56`;
  const json = await fetchProxy(url);
  if (json.error_message) throw new Error(json.error_message);
  return json.observations || [];
}

// Align 3 series by date (FRED returns desc, index 0 = most recent)
function align(bullObs, neuObs, bearObs) {
  const neuMap  = Object.fromEntries(neuObs.filter(o => o.value !== '.').map(o => [o.date, +o.value]));
  const bearMap = Object.fromEntries(bearObs.filter(o => o.value !== '.').map(o => [o.date, +o.value]));
  return bullObs
    .filter(o => o.value !== '.' && neuMap[o.date] != null && bearMap[o.date] != null)
    .map(o => ({ date: o.date, bull: +o.value, neu: neuMap[o.date], bear: bearMap[o.date] }));
}

function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${+m}/${+day}/${y}`;
}

// Stacked bar (3 colors)
function stackedBar(bull, neu, bear) {
  const sum = bull + neu + bear || 100;
  const b = +(bull / sum * 100).toFixed(1);
  const n = +(neu  / sum * 100).toFixed(1);
  const r = +(100  - b - n).toFixed(1);
  return `
    <div class="aaii-bar">
      <div class="aaii-seg aaii-seg--bull" style="flex:0 0 ${b}%">
        <span class="aaii-seg-txt">${b}%</span>
      </div>
      <div class="aaii-seg aaii-seg--neu" style="flex:0 0 ${n}%">
        <span class="aaii-seg-txt">${n}%</span>
      </div>
      <div class="aaii-seg aaii-seg--bear" style="flex:0 0 ${r}%">
        <span class="aaii-seg-txt">${r}%</span>
      </div>
    </div>`;
}

// Single-color bar (for historical highs)
function singleBar(val, mod, dateStr) {
  return `
    <div class="aaii-bar aaii-bar--single">
      <div class="aaii-seg ${mod}" style="flex:0 0 ${val.toFixed(1)}%;border-radius:4px">
        <span class="aaii-seg-txt">${val.toFixed(1)}%</span>
      </div>
      <span class="aaii-bar-annot">${t('aaii_week_ending')} ${fmtDate(dateStr)}</span>
    </div>`;
}

function row(label, barHTML, bold = false) {
  return `
    <div class="aaii-row">
      <div class="aaii-row-label${bold ? ' aaii-row-label--bold' : ''}">${label}</div>
      <div class="aaii-row-bar">${barHTML}</div>
    </div>`;
}

// ── Public ─────────────────────────────────────────────
export async function loadAAII() {
  const el = document.getElementById('aaii-container');
  if (!el) return;

  try {
    const [bullObs, neuObs, bearObs] = await Promise.all([
      fetchFred('AAIIBULL'),
      fetchFred('AAIINEU'),
      fetchFred('AAIIBEAR'),
    ]);

    const data = align(bullObs, neuObs, bearObs);
    if (!data.length) throw new Error('no_data');

    const recent   = data.slice(0, 4);
    const yearData = data.slice(0, 52);

    const avg = (arr, key) => arr.reduce((s, r) => s + r[key], 0) / arr.length;
    const max = (arr, key) => arr.reduce((m, r) => r[key] > m.val ? { val: r[key], date: r.date } : m, { val: 0, date: '' });

    const avgBull = avg(yearData, 'bull');
    const avgNeu  = avg(yearData, 'neu');
    const avgBear = avg(yearData, 'bear');
    const maxBull = max(yearData, 'bull');
    const maxNeu  = max(yearData, 'neu');
    const maxBear = max(yearData, 'bear');

    el.innerHTML = `
      <div class="aaii-legend">
        <span class="aaii-legend-item">
          <span class="aaii-dot aaii-seg--bull"></span>${t('aaii_bullish')}
        </span>
        <span class="aaii-legend-item">
          <span class="aaii-dot aaii-seg--neu"></span>${t('aaii_neutral')}
        </span>
        <span class="aaii-legend-item">
          <span class="aaii-dot aaii-seg--bear"></span>${t('aaii_bearish')}
        </span>
      </div>

      <p class="aaii-section-title">${t('aaii_sentiment_votes')}</p>
      ${recent.map(r => row(fmtDate(r.date), stackedBar(r.bull, r.neu, r.bear))).join('')}

      <p class="aaii-section-title aaii-section-title--gap">${t('aaii_historical')}</p>
      ${row(t('aaii_avg'),       stackedBar(avgBull, avgNeu, avgBear), true)}
      ${row(t('aaii_bull_high'), singleBar(maxBull.val, 'aaii-seg--bull', maxBull.date))}
      ${row(t('aaii_neu_high'),  singleBar(maxNeu.val,  'aaii-seg--neu',  maxNeu.date))}
      ${row(t('aaii_bear_high'), singleBar(maxBear.val, 'aaii-seg--bear', maxBear.date))}

      <p class="aaii-source">${t('aaii_source')}</p>`;

  } catch (e) {
    el.innerHTML = `<p class="aaii-error">${t('aaii_error')}</p>`;
  }
}
