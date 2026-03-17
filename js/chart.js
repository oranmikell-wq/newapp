// chart.js — TradingView Lightweight Charts

let mainChart = null;
let mainSeries = null;
let compareChart = null;
let currentSymbol = null;
let currentRange = '1M';

function initChart() {
  const container = document.getElementById('chart-container');
  if (!container) return;

  const isDark = document.body.classList.contains('theme-dark');

  mainChart = LightweightCharts.createChart(container, {
    width:  container.clientWidth,
    height: 260,
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
    for (const entry of entries) {
      mainChart.applyOptions({ width: entry.contentRect.width });
    }
  });
  ro.observe(container);
}

async function loadChart(symbol, range = '1M') {
  if (!mainChart) initChart();
  currentSymbol = symbol;
  currentRange  = range;

  try {
    const data = await fetchHistory(symbol, range);
    if (!data.length) return;

    const chartData = data.map(p => ({
      time:  p.time,
      value: p.value,
    }));

    mainSeries.setData(chartData);
    mainChart.timeScale().fitContent();

    // Color based on performance
    const first = chartData[0]?.value;
    const last  = chartData[chartData.length - 1]?.value;
    if (first && last) {
      const color = last >= first ? '#16a34a' : '#dc2626';
      mainSeries.applyOptions({
        lineColor:   color,
        topColor:    color.replace(')', ',0.2)').replace('rgb', 'rgba'),
        bottomColor: color.replace(')', ',0)').replace('rgb', 'rgba'),
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
