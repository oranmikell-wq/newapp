// useTheme.js — theme management (light/dark)

export function applyTheme() {
  const theme = localStorage.getItem('bon-theme') || 'dark';
  document.body.className = `theme-${theme}`;
  const btn = document.getElementById('btn-theme-drawer');
  if (btn) btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

export function toggleTheme(updateChartThemeFn) {
  const isDark = document.body.classList.contains('theme-dark');
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem('bon-theme', next);
  applyTheme();
  if (updateChartThemeFn) updateChartThemeFn(next === 'dark');
}
