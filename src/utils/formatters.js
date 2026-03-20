// formatters.js — shared formatting utilities

export function formatMarketCap(val) {
  if (val == null) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
}
