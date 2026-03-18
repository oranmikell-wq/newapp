// compare.js — השוואת מניות (עד 3)

function loadCompareList() {
  try { return JSON.parse(localStorage.getItem('bon-compare') || '[]'); } catch { return []; }
}
function saveCompareList() {
  localStorage.setItem('bon-compare', JSON.stringify(compareList));
}

let compareList = loadCompareList();

function getCompareList() { return compareList; }

function addToCompare(symbol, name) {
  if (compareList.length >= 3) {
    showNotification(t('compareMax'));
    return;
  }
  if (compareList.some(s => s.symbol === symbol)) return;
  compareList.push({ symbol, name });
  saveCompareList();
  showNotification(t('compareAdded'));
  updateCompareBtn(symbol);
}

function removeFromCompare(symbol) {
  compareList = compareList.filter(s => s.symbol !== symbol);
  saveCompareList();
  updateCompareBtn(symbol);
  if (document.getElementById('page-compare').classList.contains('active')) {
    renderCompare();
  }
}

function updateCompareBtn(symbol) {
  const btn = document.getElementById('btn-add-compare');
  if (!btn) return;
  const inList = compareList.some(s => s.symbol === symbol);
  btn.textContent = inList ? t('removeFromCompare') || 'הסר מהשוואה' : t('addToCompare');
}

async function renderCompare() {
  const container = document.getElementById('compare-content');
  if (!container) return;

  if (!compareList.length) {
    container.innerHTML = `<div class="compare-empty">${t('compareEmpty')}</div>`;
    return;
  }

  // Loading
  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

  try {
    const results = await Promise.all(compareList.map(async s => {
      const { data } = await fetchAllData(s.symbol);
      const h5 = await fetchHistory(s.symbol, '5Y');
      const scored = calcScore(data, h5);
      return { ...data, ...scored };
    }));

    const symbols = results.map(r => r.symbol);

    // Build compare chips header
    const chipsHtml = `
      <div class="compare-stocks-header" style="grid-template-columns: repeat(${results.length}, 1fr)">
        ${results.map(r => `
          <div class="compare-stock-chip">
            <span class="symbol">${r.symbol}</span>
            <button class="compare-remove" onclick="removeFromCompare('${r.symbol}')">✕</button>
          </div>`).join('')}
      </div>`;

    // Chart
    const chartHtml = `
      <div class="compare-chart-wrap">
        <div id="compare-chart"></div>
      </div>`;

    // Table rows
    const rows = [
      { label: t('price'),     vals: results.map(r => r.price ? `${r.currency} ${r.price.toLocaleString()}` : t('noData')) },
      { label: 'P/E',          vals: results.map(r => r.pe?.toFixed(1) ?? t('noData')) },
      { label: 'P/B',          vals: results.map(r => r.pb?.toFixed(1) ?? t('noData')) },
      { label: t('marketCap'), vals: results.map(r => formatMarketCap(r.marketCap)) },
      { label: 'EPS Growth',   vals: results.map(r => r.epsGrowth != null ? r.epsGrowth.toFixed(1) + '%' : t('noData')) },
      { label: 'Revenue Growth', vals: results.map(r => r.revenueGrowth != null ? r.revenueGrowth.toFixed(1) + '%' : t('noData')) },
      { label: 'Debt/Equity',  vals: results.map(r => r.debtEquity != null ? r.debtEquity.toFixed(1) : t('noData')) },
      { label: t('beta'),      vals: results.map(r => r.beta?.toFixed(2) ?? t('noData')) },
      { label: 'Score',        vals: results.map(r => r.score ?? t('noData')), isScore: true },
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

    // Init compare chart
    await initCompareChart(symbols);

  } catch (e) {
    container.innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
  }
}

function formatMarketCap(val) {
  if (val == null) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
}
