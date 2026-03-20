// FearGreedGauge.js — CNN-style Fear & Greed speedometer gauge

import { fetchProxy } from '../services/StockService.js';
import { t } from '../utils/i18n.js';

const FNG_URL = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

// ── Zone config ────────────────────────────────────────
const ZONES = [
  { s1: 0,  s2: 25,  key: 'fng_extreme_fear',  color: '#ef4444', l1: 'EXTREME', l2: 'FEAR'  },
  { s1: 25, s2: 45,  key: 'fng_fear',           color: '#f97316', l1: 'FEAR',    l2: null    },
  { s1: 45, s2: 55,  key: 'fng_neutral',        color: '#eab308', l1: 'NEUTRAL', l2: null    },
  { s1: 55, s2: 75,  key: 'fng_greed',          color: '#84cc16', l1: 'GREED',   l2: null    },
  { s1: 75, s2: 100, key: 'fng_extreme_greed',  color: '#22c55e', l1: 'EXTREME', l2: 'GREED' },
];

function getZoneIndex(score) {
  for (let i = 0; i < ZONES.length; i++) if (score <= ZONES[i].s2) return i;
  return ZONES.length - 1;
}

function ratingToKey(cnnRating) {
  const s = (cnnRating || '').toLowerCase().replace(/\s+/g, '_');
  return ({ extreme_fear: 'fng_extreme_fear', fear: 'fng_fear', neutral: 'fng_neutral',
            greed: 'fng_greed', extreme_greed: 'fng_extreme_greed' })[s] || 'fng_neutral';
}

// ── SVG geometry ───────────────────────────────────────
const CX = 140, CY = 150, R_O = 130, R_I = 72, R_MID = 101;
const PI = Math.PI;

function pt(a, r) {
  return { x: +(CX + r * Math.cos(a)).toFixed(2), y: +(CY - r * Math.sin(a)).toFixed(2) };
}

// Annular sector path from score s1→s2 (arc fills left to right = fear→greed)
function sectorPath(s1, s2) {
  const a1 = PI * (1 - s1 / 100); // angle at s1 (left = large angle)
  const a2 = PI * (1 - s2 / 100); // angle at s2 (right = small angle)
  const { x: ox1, y: oy1 } = pt(a1, R_O);
  const { x: ox2, y: oy2 } = pt(a2, R_O);
  const { x: ix1, y: iy1 } = pt(a1, R_I);
  const { x: ix2, y: iy2 } = pt(a2, R_I);
  // Outer arc CW (a1→a2), line to inner, inner arc CCW (a2→a1), close
  return `M${ox1} ${oy1} A${R_O} ${R_O} 0 0 1 ${ox2} ${oy2} L${ix2} ${iy2} A${R_I} ${R_I} 0 0 0 ${ix1} ${iy1}Z`;
}

// ── Build SVG ──────────────────────────────────────────
function buildGaugeSVG(score, activeIdx, label) {
  const activeZone = ZONES[activeIdx];

  // 1. Sector shapes
  const sectors = ZONES.map((z, i) => {
    const isActive = i === activeIdx;
    return `<path d="${sectorPath(z.s1, z.s2)}"
      fill="${z.color}" fill-opacity="${isActive ? '0.22' : '0.10'}"
      stroke="${isActive ? z.color : 'var(--border)'}" stroke-width="${isActive ? '1.5' : '0.8'}"/>`;
  }).join('');

  // 2. Zone text labels (rotated along radius)
  const zoneLabels = ZONES.map((z, i) => {
    const mid = (z.s1 + z.s2) / 2;
    const a   = PI * (1 - mid / 100);
    const { x: lx, y: ly } = pt(a, R_MID);
    const rot = -(a * 180 / PI - 90);
    const col = i === activeIdx ? activeZone.color : 'var(--text-3)';
    const fw  = i === activeIdx ? '800' : '600';
    const fs  = 9;
    if (z.l2) {
      return `<g transform="translate(${lx},${ly}) rotate(${rot.toFixed(1)})">
        <text text-anchor="middle" font-size="${fs}" font-weight="${fw}" fill="${col}" letter-spacing="0.7">
          <tspan x="0" dy="-5.5">${z.l1}</tspan><tspan x="0" dy="12">${z.l2}</tspan>
        </text></g>`;
    }
    return `<g transform="translate(${lx},${ly}) rotate(${rot.toFixed(1)})">
      <text text-anchor="middle" font-size="${fs}" font-weight="${fw}" fill="${col}" letter-spacing="0.7" dy="4">${z.l1}</text>
    </g>`;
  }).join('');

  // 3. Tick dots on inner arc at every 5 units (skip zone boundaries + number positions)
  const skipS = new Set([0, 25, 45, 50, 55, 75, 100]);
  const dots = [];
  for (let s = 5; s < 100; s += 5) {
    if (skipS.has(s)) continue;
    const { x: dx, y: dy } = pt(PI * (1 - s / 100), R_I + 7);
    dots.push(`<circle cx="${dx}" cy="${dy}" r="1.5" fill="var(--text-3)" opacity="0.4"/>`);
  }

  // 4. Numbers: 0 and 100 at base endpoints; 25, 50, 75 along inner arc
  const R_NUM = R_I - 18; // just inside the inner ring
  const arcNums = [
    { s: 25,  label: '25'  },
    { s: 50,  label: '50'  },
    { s: 75,  label: '75'  },
  ].map(({ s, label }) => {
    const { x: nx2, y: ny2 } = pt(PI * (1 - s / 100), R_NUM);
    return `<text x="${nx2}" y="${(ny2 + 3.5).toFixed(2)}" text-anchor="middle"
      font-size="8" font-weight="500" fill="var(--text-3)">${label}</text>`;
  });
  const nums = [
    { x: 10,  y: CY + 16, label: '0'   },
    { x: 270, y: CY + 16, label: '100' },
  ].map(({ x, y, label }) =>
    `<text x="${x}" y="${y}" text-anchor="middle"
      font-size="9" font-weight="500" fill="var(--text-3)">${label}</text>`
  );

  // 5. Needle
  const na = PI * (1 - score / 100);
  const { x: nx, y: ny } = pt(na, R_I - 8);

  return `
<svg viewBox="0 0 280 218" fill="none" xmlns="http://www.w3.org/2000/svg" class="fng-svg">
  ${sectors}
  ${zoneLabels}
  ${dots.join('')}
  ${arcNums.join('')}
  ${nums.join('')}
  <!-- Needle -->
  <line x1="${CX}" y1="${CY}" x2="${nx}" y2="${ny}"
    stroke="var(--text)" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="${CX}" cy="${CY}" r="7" fill="var(--text)"/>
  <circle cx="${CX}" cy="${CY}" r="3" fill="var(--bg)"/>
  <!-- Score — safely below needle pivot (clearance ≥ 12px) -->
  <text x="${CX}" y="${CY + 44}" text-anchor="middle"
    font-size="36" font-weight="800" font-family="Inter,Heebo,sans-serif"
    fill="${activeZone.color}">${score}</text>
  <!-- Zone label -->
  <text x="${CX}" y="${CY + 60}" text-anchor="middle"
    font-size="10" font-weight="700" font-family="Inter,Heebo,sans-serif"
    fill="${activeZone.color}" letter-spacing="0.8">${label.toUpperCase()}</text>
</svg>`;
}

// ── Badge background (light tint of zone color) ────────
function badgeBg(color) { return color + '30'; } // 19% opacity

// ── Compare row ────────────────────────────────────────
function compareRow(periodKey, prevScore, currentScore) {
  if (prevScore == null) return '';
  const prev    = Math.round(prevScore);
  const zi      = getZoneIndex(prev);
  const zone    = ZONES[zi];
  const zLabel  = t(zone.key);
  const diff    = Math.round(currentScore) - prev;
  const arrow   = diff > 0 ? '▲' : diff < 0 ? '▼' : '—';
  const diffClr = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--text-3)';

  return `
  <div class="fng-row">
    <div class="fng-row-info">
      <span class="fng-row-period">${t(periodKey)}</span>
      <span class="fng-row-zone" style="color:${zone.color}">${zLabel}</span>
    </div>
    <div class="fng-row-right">
      <span class="fng-row-arrow" style="color:${diffClr}">${arrow}</span>
      <div class="fng-row-badge" style="background:${badgeBg(zone.color)};color:${zone.color}">${prev}</div>
    </div>
  </div>`;
}

// ── Timestamp formatter ────────────────────────────────
function formatTimestamp(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
}

// ── Public ─────────────────────────────────────────────
export async function loadFearGreed() {
  const container = document.getElementById('fng-container');
  if (!container) return;

  try {
    const json = await fetchProxy(FNG_URL);
    const fg   = json?.fear_and_greed;
    if (!fg?.score) throw new Error('no_data');

    const score    = Math.round(fg.score);
    const activeIdx = getZoneIndex(score);
    const labelKey  = ratingToKey(fg.rating);
    const label     = t(labelKey);
    const ts        = formatTimestamp(fg.timestamp);

    container.innerHTML = `
      <div class="fng-gauge-wrap">
        ${buildGaugeSVG(score, activeIdx, label)}
        ${ts ? `<p class="fng-updated">${ts}</p>` : ''}
      </div>
      <div class="fng-compare">
        ${compareRow('fng_prev_close', fg.previous_close,   score)}
        ${compareRow('fng_prev_week',  fg.previous_1_week,  score)}
        ${compareRow('fng_prev_month', fg.previous_1_month, score)}
        ${compareRow('fng_prev_year',  fg.previous_1_year,  score)}
        <p class="fng-source">${t('fng_source')}</p>
      </div>`;
  } catch (e) {
    container.innerHTML = `<p class="fng-error">${t('fng_error')}</p>`;
  }
}
