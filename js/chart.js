// chart.js — TradingView Lightweight Charts

let mainChart = null;
let mainSeries = null;
let compareChart = null;
let currentSymbol = null;
let currentRange = '1M';
let chartLoadGen = 0;

function initChart() {
  const container = document.getElementById('chart-container');
  if (!container) return;

  // Destroy existing chart before recreating
  if (mainChart) { try { mainChart.remove(); } catch {} }
  mainChart = null;
  mainSeries = null;

  const isDark = document.body.classList.contains('theme-dark');
  const h = Math.max(container.clientHeight, 260);

  try {
  mainChart = LightweightCharts.createChart(container, {
    width:  container.clientWidth || 400,
    height: h,
    layout: {
      background: { color: isDark ? '#0a0a0a' : '#ffffff' },
      textColor:  isDark ? '#94a3b8' : '#475569',
    },
    grid: {
      vertLines:   { color: isDark ? '#1a1a1a' : '#f1f5f9' },
      horzLines:   { color: isDark ? '#1a1a1a' : '#f1f5f9' },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: isDark ? '#2a2a2a' : '#e2e8f0' },
    timeScale: {
      borderColor: isDark ? '#2a2a2a' : '#e2e8f0',
      timeVisible: true,
    },
    handleScroll: true,
    handleScale: true,
  });

  mainSeries = mainChart.addSeries(LightweightCharts.AreaSeries, {
    lineColor:       '#16a34a',
    topColor:        'rgba(22,163,74,0.2)',
    bottomColor:     'rgba(22,163,74,0)',
    lineWidth:       2,
    priceLineVisible: false,
  });

  // Resize observer
  const ro = new ResizeObserver(entries => {
    if (!mainChart) return;
    for (const entry of entries) {
      const w = entry.contentRect.width;
      const h = Math.max(entry.contentRect.height, 260);
      if (w > 0) mainChart.applyOptions({ width: w, height: h });
    }
  });
  ro.observe(container);
  } catch (e) {
    console.error('Chart init error:', e);
    mainChart = null;
    mainSeries = null;
  }
}

async function loadChart(symbol, range = '1M') {
  if (!mainChart || !mainSeries) initChart();
  if (!mainSeries) return; // init failed silently
  currentSymbol = symbol;
  currentRange  = range;

  const gen = ++chartLoadGen;

  try {
    const data = await fetchHistory(symbol, range);
    if (gen !== chartLoadGen || !mainSeries) return; // stale request

    const chartData = data.map(p => ({
      time:  p.time,
      value: p.value,
    }));

    if (!data.length) return;
    mainSeries.setData(chartData);
    mainChart.timeScale().fitContent();

    // Color based on performance
    const first = chartData[0]?.value;
    const last  = chartData[chartData.length - 1]?.value;
    if (first && last) {
      const up = last >= first;
      mainSeries.applyOptions({
        lineColor:   up ? '#16a34a' : '#dc2626',
        topColor:    up ? 'rgba(22,163,74,0.2)'  : 'rgba(220,38,38,0.2)',
        bottomColor: up ? 'rgba(22,163,74,0)'    : 'rgba(220,38,38,0)',
      });
    }
  } catch (e) {
    console.error('Chart load error:', e);
  }
}

function updateChartTheme(isDark) {
  if (!mainChart) return;
  mainChart.applyOptions({
    layout: {
      background: { color: isDark ? '#0a0a0a' : '#ffffff' },
      textColor:  isDark ? '#94a3b8' : '#475569',
    },
    grid: {
      vertLines: { color: isDark ? '#1a1a1a' : '#f1f5f9' },
      horzLines: { color: isDark ? '#1a1a1a' : '#f1f5f9' },
    },
    rightPriceScale: { borderColor: isDark ? '#2a2a2a' : '#e2e8f0' },
    timeScale:       { borderColor: isDark ? '#2a2a2a' : '#e2e8f0' },
  });
}

// ── Compare chart (relative %) ─────────────────────────
async function initCompareChart(symbols) {
  const container = document.getElementById('compare-chart');
  if (!container) return;

  if (compareChart) { compareChart.remove(); compareChart = null; }

  const isDark = document.body.classList.contains('theme-dark');
  const COLORS  = ['#16a34a', '#2563eb', '#dc2626'];

  compareChart = LightweightCharts.createChart(container, {
    width:  container.clientWidth,
    height: 220,
    layout: {
      background: { color: isDark ? '#0a0a0a' : '#ffffff' },
      textColor:  isDark ? '#94a3b8' : '#475569',
    },
    grid: {
      vertLines: { color: isDark ? '#1a1a1a' : '#f1f5f9' },
      horzLines: { color: isDark ? '#1a1a1a' : '#f1f5f9' },
    },
    rightPriceScale: {
      borderColor: isDark ? '#2a2a2a' : '#e2e8f0',
    },
    timeScale: { borderColor: isDark ? '#2a2a2a' : '#e2e8f0', timeVisible: true },
  });

  for (let i = 0; i < symbols.length; i++) {
    try {
      const data = await fetchHistory(symbols[i], '1Y');
      if (!data.length) continue;
      const base = data[0].value;
      const relData = data.map(p => ({ time: p.time, value: ((p.value - base) / base) * 100 }));

      const series = compareChart.addSeries(LightweightCharts.LineSeries, {
        color:     COLORS[i % COLORS.length],
        lineWidth: 2,
        title:     symbols[i],
      });
      series.setData(relData);
    } catch {}
  }

  compareChart.timeScale().fitContent();
}
