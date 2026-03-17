// Service Worker — StockIT PWA
const CACHE = 'stockit-v1';
const STATIC = [
  '/stockit/',
  '/stockit/index.html',
  '/stockit/css/main.css',
  '/stockit/css/home.css',
  '/stockit/css/results.css',
  '/stockit/css/compare.css',
  '/stockit/js/i18n.js',
  '/stockit/js/api.js',
  '/stockit/js/scoring.js',
  '/stockit/js/chart.js',
  '/stockit/js/watchlist.js',
  '/stockit/js/compare.js',
  '/stockit/js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first for API calls, cache first for static
  const url = e.request.url;
  if (url.includes('finance.yahoo') || url.includes('finnhub') || url.includes('financialmodelingprep') || url.includes('corsproxy')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
