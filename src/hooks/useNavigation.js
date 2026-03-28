// useNavigation.js — page navigation state

let currentPage = 'home';

function closeDrawer() {
  document.getElementById('nav-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
  document.getElementById('nav-drawer')?.setAttribute('aria-hidden', 'true');
}

export function navigateTo(page, symbol = null, { loadResults } = {}) {
  closeDrawer();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const activePage = document.getElementById(`page-${page}`);
  if (!activePage) return;
  activePage.classList.add('active');
  const footer = document.querySelector('.app-footer');
  if (footer) activePage.appendChild(footer);
  // Update drawer active state
  document.querySelectorAll('.drawer-nav-item').forEach(b => b.classList.remove('active'));
  const drawerBtn = document.querySelector(`.drawer-nav-item[data-page="${page}"]`);
  if (drawerBtn) drawerBtn.classList.add('active');
  currentPage = page;
  document.body.dataset.page = page;

  if (page === 'home') {
    const inp = document.getElementById('search-input');
    if (inp) inp.value = '';
  }
  if (page === 'results' && symbol) {
    // Clear stale header + hide content before the page becomes visible
    const resSymbol = document.getElementById('res-symbol');
    const resName   = document.getElementById('res-name');
    if (resSymbol) resSymbol.textContent = symbol;
    if (resName)   resName.textContent   = '';
    const content = document.getElementById('results-content');
    const loading  = document.getElementById('results-loading');
    if (content) content.classList.add('hidden');
    if (loading)  loading.style.display = 'flex';
    if (loadResults) loadResults(symbol);
  }
}

export function getCurrentPage() {
  return currentPage;
}
