// Autocomplete.js — search autocomplete with local + Yahoo Finance results

import { fetchProxy } from '../services/StockService.js';
import { STOCK_LIST } from '../utils/stockList.js';

let acIndex = -1;
let acDebounceTimer = null;
let acLastQuery = '';
let _onSelectCallback = null;

// ── Type badge helpers ───────────────────────────────────
const TYPE_LABEL = {
  EQUITY:     { text: 'Stock',  cls: 'ac-type-stock'  },
  ETF:        { text: 'ETF',    cls: 'ac-type-etf'    },
  CRYPTOCURRENCY: { text: 'Crypto', cls: 'ac-type-crypto' },
  MUTUALFUND: { text: 'Fund',   cls: 'ac-type-fund'   },
};

function typeBadge(quoteType) {
  const meta = TYPE_LABEL[quoteType] || { text: 'Stock', cls: 'ac-type-stock' };
  return `<span class="ac-type ${meta.cls}">${meta.text}</span>`;
}

async function fetchYahooSearch(query) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableNavLinks=false`;
    const raw = await fetchProxy(url);
    const quotes = raw?.quotes || [];
    return quotes
      .filter(q => q.symbol && (
        q.quoteType === 'EQUITY' ||
        q.quoteType === 'CRYPTOCURRENCY' ||
        q.quoteType === 'ETF' ||
        q.quoteType === 'MUTUALFUND'
      ))
      .slice(0, 8)
      .map(q => ({
        symbol:    q.symbol,
        name:      q.longname || q.shortname || q.symbol,
        exchange:  q.exchDisp || q.exchange || '',
        quoteType: q.quoteType || 'EQUITY',
      }));
  } catch {
    return [];
  }
}

// ── Render helpers ───────────────────────────────────────

function setLoading(on) {
  const list = document.getElementById('autocomplete-list');
  if (!list) return;
  const existing = list.querySelector('.ac-loading');
  if (on && !existing) {
    const row = document.createElement('div');
    row.className = 'ac-loading';
    row.innerHTML = `<span class="ac-loading-dot"></span><span class="ac-loading-dot"></span><span class="ac-loading-dot"></span>`;
    list.prepend(row);
    list.classList.remove('hidden');
  } else if (!on && existing) {
    existing.remove();
  }
}

function renderAutocompleteItems(matches, sectionLabel = '') {
  const list = document.getElementById('autocomplete-list');
  if (!list) return;
  if (!matches.length) { hideAutocomplete(); return; }

  // Remove old results (keep section headers if any)
  list.querySelectorAll('.ac-item-group').forEach(g => g.remove());

  const group = document.createElement('div');
  group.className = 'ac-item-group';

  if (sectionLabel) {
    const lbl = document.createElement('div');
    lbl.className = 'ac-section-label';
    lbl.textContent = sectionLabel;
    group.appendChild(lbl);
  }

  matches.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'autocomplete-item';
    row.dataset.index  = i;
    row.dataset.symbol = s.symbol;
    row.innerHTML = `
      <span class="ac-symbol">${s.symbol}</span>
      <span class="ac-name">${s.name}</span>
      ${typeBadge(s.quoteType || 'EQUITY')}
      <span class="ac-exchange">${s.exchange || ''}</span>`;
    row.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      if (input) input.value = s.symbol;
      hideAutocomplete();
      if (_onSelectCallback) _onSelectCallback(s.symbol);
    });
    group.appendChild(row);
  });

  list.appendChild(group);
  acIndex = -1;
  list.classList.remove('hidden');
}

// ── Recent searches section ──────────────────────────────

export function showRecentSearches() {
  const list = document.getElementById('autocomplete-list');
  if (!list) return;
  try {
    const history = JSON.parse(localStorage.getItem('bon-history') || '[]').slice(0, 6);
    if (!history.length) return;

    list.innerHTML = '';
    const group = document.createElement('div');
    group.className = 'ac-item-group';

    const lbl = document.createElement('div');
    lbl.className = 'ac-section-label';
    lbl.textContent = 'Recent searches';
    group.appendChild(lbl);

    history.forEach(item => {
      const symbol = typeof item === 'string' ? item : item.symbol;
      const name   = typeof item === 'object' ? (item.name || '') : '';
      const row = document.createElement('div');
      row.className = 'autocomplete-item ac-recent';
      row.dataset.symbol = symbol;
      row.innerHTML = `
        <span class="ac-recent-icon">↩</span>
        <span class="ac-symbol">${symbol}</span>
        <span class="ac-name">${name}</span>`;
      row.addEventListener('click', () => {
        const input = document.getElementById('search-input');
        if (input) input.value = symbol;
        hideAutocomplete();
        if (_onSelectCallback) _onSelectCallback(symbol);
      });
      group.appendChild(row);
    });

    list.appendChild(group);
    list.classList.remove('hidden');
  } catch {}
}

// ── Main public API ──────────────────────────────────────

export function showAutocomplete(query) {
  const rawQuery = query.trim();
  if (!rawQuery) { showRecentSearches(); return; }
  const upperQuery = rawQuery.toUpperCase();

  // 1. Instant: local matches right away
  const localMatches = STOCK_LIST.filter(s =>
    s.symbol.startsWith(upperQuery) ||
    s.symbol.includes(upperQuery) ||
    s.name.toUpperCase().includes(upperQuery)
  ).slice(0, 8);

  // Clear list and show local results immediately
  const list = document.getElementById('autocomplete-list');
  if (list) list.innerHTML = '';
  if (localMatches.length) renderAutocompleteItems(localMatches);

  // 2. Debounced 300ms: fetch Yahoo Finance
  clearTimeout(acDebounceTimer);
  acLastQuery = rawQuery;
  setLoading(true);

  acDebounceTimer = setTimeout(async () => {
    if (acLastQuery !== rawQuery) return; // stale
    const remoteMatches = await fetchYahooSearch(rawQuery);
    if (acLastQuery !== rawQuery) return; // stale
    setLoading(false);

    // Merge: remote first, fill with local
    const seen   = new Set(remoteMatches.map(s => s.symbol));
    const merged = [
      ...remoteMatches,
      ...localMatches
        .filter(s => !seen.has(s.symbol))
        .map(s => ({ ...s, quoteType: 'EQUITY' })),
    ].slice(0, 8);

    if (list) list.innerHTML = '';
    if (merged.length) renderAutocompleteItems(merged);
    else if (!localMatches.length) hideAutocomplete();
  }, 300);
}

export function hideAutocomplete() {
  const list = document.getElementById('autocomplete-list');
  if (list) {
    list.classList.add('hidden');
    list.innerHTML = '';
  }
  acIndex = -1;
  clearTimeout(acDebounceTimer);
  acLastQuery = '';
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

export function confirmAutocomplete() {
  const items = document.querySelectorAll('.autocomplete-item');
  if (acIndex >= 0 && items[acIndex]) {
    const symbol = items[acIndex].dataset.symbol;
    const input  = document.getElementById('search-input');
    if (input) input.value = symbol;
    hideAutocomplete();
    if (_onSelectCallback) _onSelectCallback(symbol);
    return true; // consumed the event
  }
  return false;
}

export function initAutocomplete(onSelect) {
  _onSelectCallback = onSelect;
}
