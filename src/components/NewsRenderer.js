// NewsRenderer.js — renders the latest news items

import { t } from '../utils/i18n.js';

export function renderNews(items) {
  const container = document.getElementById('news-list');
  if (!container) return;
  if (!items || !items.length) {
    container.innerHTML = `<p style="color:var(--text-3);font-size:13px">${t('noData')}</p>`;
    return;
  }
  container.innerHTML = items.map(n => `
    <a class="news-item" href="${n.url}" target="_blank" rel="noopener">
      ${n.image ? `<img class="news-thumb" src="${n.image}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="news-body">
        <div class="news-headline">${n.headline}</div>
        <div class="news-meta">${n.source} · ${new Date(n.datetime).toLocaleDateString()}</div>
      </div>
    </a>`).join('');
}
