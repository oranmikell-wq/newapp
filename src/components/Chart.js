// Chart.js — TradingView Advanced Chart widget

import { fetchHistory } from '../services/StockService.js';

let currentSymbol = null;
let currentRange   = '1M';

// Map our range keys → TradingView widget params
const RANGE_MAP = {
  '1D': { range: '1D',  interval: '5'  },
  '1W': { range: '5D',  interval: '30' },
  '1M': { range: '1M',  interval: 'D'  },
  '3M': { range: '3M',  interval: 'D'  },
  '6M': { range: '6M',  interval: 'D'  },
  '1Y': { range: '12M', interval: 'W'  },
  '3Y': { range: '36M', interval: 'W'  },
  '5Y': { range: '60M', interval: 'M'  },
};

function getTVSymbol(symbol) {
  // TASE stocks: "TEVA.TA" → "TASE:TEVA"
  if (symbol.endsWith('.TA')) return 'TASE:' + symbol.replace('.TA', '');
  return symbol;
}

export function initChart() {
  // No-op — widget is created on loadChart
}

export async function loadChart(symbol, range = '1M') {
  const container = document.getElementById('chart-container');
  if (!container) return;

  currentSymbol = symbol;
  currentRange  = range;

  const isDark    = document.body.classList.contains('theme-dark');
  const { range: tvRange, interval } = RANGE_MAP[range] || RANGE_MAP['1M'];
  const tvSymbol  = getTVSymbol(symbol);

  // Clear previous widget
  container.innerHTML = '';

  if (typeof TradingView === 'undefined') return;

  // TradingView widget needs a child div with an ID
  const inner = document.createElement('div');
  inner.id    = 'tv_main_chart';
  inner.style.cssText = 'width:100%;height:100%';
  container.appendChild(inner);

  new TradingView.widget({
    container_id:       'tv_main_chart',
    autosize:           true,
    symbol:             tvSymbol,
    interval:           interval,
    range:              tvRange,
    timezone:           'Etc/UTC',
    theme:              isDark ? 'dark' : 'light',
    style:              '1',          // Candlestick
    locale:             'en',
    toolbar_bg:         isDark ? '#111113' : '#f8fafc',
    enable_publishing:  false,
    allow_symbol_change: false,
    save_image:         true,
    withdateranges:     true,
    hide_side_toolbar:  false,
    details:            false,
    hotlist:            false,
    calendar:           false,
    studies:            [],
    show_popup_button:  false,
    no_referral_id:     true,
    loading_screen:     { backgroundColor: isDark ? '#111113' : '#ffffff' },
  });
}

export function updateChartTheme(isDark) {
  if (!currentSymbol) return;
  loadChart(currentSymbol, currentRange);
}

