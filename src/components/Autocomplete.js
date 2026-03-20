// Autocomplete.js — search autocomplete with local + Yahoo Finance results

import { fetchProxy } from '../services/StockService.js';
import { STOCK_LIST } from '../utils/stockList.js';

let acIndex = -1;
let acDebounceTimer = null;
let acLastQuery = '';
let _onSelectCallback = null;

async function fetchYahooSearch(query) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableNavLinks=false`;
    const raw = await fetchProxy(url);
    const quotes = raw?.quotes || [];
    return quotes
      .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'CRYPTOCURRENCY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND'))
      .slice(0, 8)
      .map(q => ({
        symbol:   q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
      }));
  } catch {
    return [];
  }
}

function renderAutocompleteItems(matches) {
  const list = document.getElementById('autocomplete-list');
  if (!list) return;
  if (!matches.length) { hideAutocomplete(); return; }
  list.innerHTML = matches.map((s, i) => `
    <div class="autocomplete-item" data-index="${i}" data-symbol="${s.symbol}">
      <span class="ac-symbol">${s.symbol}</span>
      <span class="ac-name">${s.name}</span>
      <span class="ac-exchange">${s.exchange}</span>
    </div>`).join('');
  list.querySelectorAll('.autocomplete-item').forEach(el => {
    el.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      if (input) input.value = el.dataset.symbol;
      hideAutocomplete();
      if (_onSelectCallback) _onSelectCallback(el.dataset.symbol);
    });
  });
  acIndex = -1;
  list.classList.remove('hidden');
}

export function showAutocomplete(query) {
  const rawQuery = query.trim();
  if (!rawQuery) { hideAutocomplete(); return; }
  const upperQuery = rawQuery.toUpperCase();

  // 1. Instant: show local matches right away
  const localMatches = STOCK_LIST.filter(s =>
    s.symbol.startsWith(upperQuery) ||
    s.symbol.includes(upperQuery) ||
    s.name.toUpperCase().includes(upperQuery)
  ).slice(0, 8);

  if (localMatches.length) renderAutocompleteItems(localMatches);

  // 2. Debounced: query Yahoo Finance for comprehensive results
  clearTimeout(acDebounceTimer);
  acLastQuery = rawQuery;
  acDebounceTimer = setTimeout(async () => {
    if (acLastQuery !== rawQuery) return; // stale
    const remoteMatches = await fetchYahooSearch(rawQuery);
    if (acLastQuery !== rawQuery) return; // stale

    // Merge: remote results first, then fill with local if needed
    const seen = new Set(remoteMatches.map(s => s.symbol));
    const merged = [
      ...remoteMatches,
      ...localMatches.filter(s => !seen.has(s.symbol)),
    ].slice(0, 8);

    if (merged.length) renderAutocompleteItems(merged);
    else if (!localMatches.length) hideAutocomplete();
  }, 200);
}

export function hideAutocomplete() {
  const list = document.getElementById('autocomplete-list');
  if (list) list.classList.add('hidden');
  acIndex = -1;
}

export function selectAutocomplete(dir) {
  const items = document.querySelectorAll('.autocomplete-item');
  if (!items.length) return;
  acIndex = Math.max(0, Math.min(items.length - 1, acIndex + dir));
  items.forEach((el, i) => el.classList.toggle('selected', i === acIndex));
  const selected = items[acIndex];
  if (selected) {
    const input = document.getElementById('search-input');
    if (input) input.value = selected.dataset.symbol;
  }
}

export function initAutocomplete(onSelect) {
  _onSelectCallback = onSelect;
}
