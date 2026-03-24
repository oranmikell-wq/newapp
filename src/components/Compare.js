// Compare.js — stock comparison (up to 3)

import { fetchAllData, fetchHistory } from '../services/StockService.js';
import { calcScore } from '../utils/scoring.js';
import { t } from '../utils/i18n.js?v=4';
import { formatMarketCap } from '../utils/formatters.js';
import { initCompareChart } from './Chart.js';

function loadCompareList() {
  try { return JSON.parse(localStorage.getItem('bon-compare') || '[]'); } catch { return []; }
}

let compareList = loadCompareList();

function saveCompareList() {
  localStorage.setItem('bon-compare', JSON.stringify(compareList));
}

export function getCompareList() { return compareList; }

export function addToCompare(symbol, name, showNotif, updateBtn) {
  if (compareList.length >= 3) {
    if (showNotif) showNotif(t('compareMax'));
    return;
  }
  if (compareList.some(s => s.symbol === symbol)) return;
  compareList.push({ symbol, name });
  saveCompareList();
  if (showNotif) showNotif(t('compareAdded'));
  if (updateBtn) updateBtn(symbol);
}

export function removeFromCompare(symbol, updateBtn, renderComp) {
  compareList = compareList.filter(s => s.symbol !== symbol);
  saveCompareList();
  if (updateBtn) updateBtn(symbol);
  if (document.getElementById('page-compare')?.classList.contains('active')) {
    if (renderComp) renderComp();
  }
}

export function updateCompareBtn(symbol) {
  const btn = document.getElementById('btn-add-compare');
  if (!btn) return;
  const inList = compareList.some(s => s.symbol === symbol);
  btn.textContent = inList ? (t('removeFromCompare') || 'הסר מהשוואה') : t('addToCompare');
}

export async function renderCompare(showNotif) {
  const container = document.getElementById('compare-content');
  if (!container) return;

  if (!compareList.length) {
    container.innerHTML = `<div class="compare-empty">${t('compareEmpty')}</div>`;
    return;
  }

  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

  try {
    const results = await Promise.all(compareList.map(async s => {
      const { data } = await fetchAllData(s.symbol);
      const h5 = await fetchHistory(s.symbol, '5Y');
      const scored = calcScore(data, h5);
      return { ...data, ...scored };
    }));

    const symbols = results.map(r => r.symbol);

    const chipsHtml = `
      <div class="compare-stocks-header" style="grid-template-columns: repeat(${results.length}, 1fr)">
        ${results.map(r => `
          <div class="compare-stock-chip">
            <span class="symbol">${r.symbol}</span>
            <button class="compare-remove" onclick="window.removeFromCompare('${r.symbol}')">✕</button>
          </div>`).join('')}
      </div>`;

    const chartHtml = `
      <div class="compare-chart-wrap">
        <div id="compare-chart"></div>
      </div>`;

    const rows = [
      { label: t('price'),                vals: results.map(r => r.price ? `${r.currency} ${r.price.toLocaleString()}` : t('noData')) },
      { label: 'P/E',                     vals: results.map(r => r.pe?.toFixed(1) ?? t('noData')) },
      { label: 'P/B',                     vals: results.map(r => r.pb?.toFixed(1) ?? t('noData')) },
      { label: t('marketCap'),            vals: results.map(r => formatMarketCap(r.marketCap)) },
      { label: t('compareEpsGrowth'),     vals: results.map(r => r.epsGrowth != null ? r.epsGrowth.toFixed(1) + '%' : t('noData')) },
      { label: t('compareRevenueGrowth'), vals: results.map(r => r.revenueGrowth != null ? r.revenueGrowth.toFixed(1) + '%' : t('noData')) },
      { label: t('compareDebtEquity'),    vals: results.map(r => r.debtEquity != null ? r.debtEquity.toFixed(1) : t('noData')) },
      { label: t('beta'),                 vals: results.map(r => r.beta?.toFixed(2) ?? t('noData')) },
      { label: t('compareScore'),         vals: results.map(r => r.score ?? t('noData')), isScore: true },
    ];

    const tableHtml = `
      <div class="compare-table">
        <div class="compare-table-row header" style="grid-template-columns: 120px ${results.map(() => '1fr').join(' ')}">
          <div class="compare-cell"></div>
          ${results.map(r => `<div class="compare-cell">${r.symbol}</div>`).join('')}
        </div>
        ${rows.map(row => {
          const numericVals = row.vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
          const maxVal = row.isScore ? Math.max(...numericVals) : null;
          return `
            <div class="compare-table-row" style="grid-template-columns: 120px ${results.map(() => '1fr').join(' ')}">
              <div class="compare-cell">${row.label}</div>
              ${row.vals.map(v => {
                const num = parseFloat(v);
                const isBest = row.isScore && !isNaN(num) && num === maxVal;
                return `<div class="compare-cell ${isBest ? 'compare-best' : ''}">${v}</div>`;
              }).join('')}
            </div>`;
        }).join('')}
      </div>`;

    container.innerHTML = chipsHtml + chartHtml + tableHtml;

    await initCompareChart(symbols);

  } catch (e) {
    container.innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
  }
}
