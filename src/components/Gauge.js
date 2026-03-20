// Gauge.js — animated speedometer gauge drawn on canvas #gauge-canvas

export function drawGauge(score, rating) {
  const canvas = document.getElementById('gauge-canvas');
  if (!canvas) return;
  // Match canvas buffer to CSS display size (sharp on desktop)
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0) { canvas.width = Math.round(rect.width); canvas.height = Math.round(rect.height); }
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H - 8;
  const r  = Math.min(W, H * 2) / 2 - 20;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.lineWidth = 18;
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg-3').trim() || '#f1f5f9';
  ctx.stroke();

  if (score == null) return;

  // Colored arc
  const pct     = score / 100;
  const endAngle = Math.PI + pct * Math.PI;
  const gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  gradient.addColorStop(0,   '#dc2626');
  gradient.addColorStop(0.4, '#ca8a04');
  gradient.addColorStop(1,   '#16a34a');

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, endAngle);
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.strokeStyle = gradient;
  ctx.stroke();

  // Needle
  const needleAngle = Math.PI + pct * Math.PI;
  const nx = cx + (r - 10) * Math.cos(needleAngle);
  const ny = cy + (r - 10) * Math.sin(needleAngle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.lineWidth = 3;
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#0f172a';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim();
  ctx.fill();
}
