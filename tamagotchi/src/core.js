'use strict';
// ---------- math & helpers ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (v - a) / (b - a);
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const sign = (v) => (v < 0 ? -1 : 1);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const damp = (v, t, rate, dt) => lerp(v, t, 1 - Math.exp(-rate * dt));

// critically/under-damped spring stored as {x, v}
const S2 = (x = 0) => ({ x, v: 0 });
function spring(s, target, k, d, dt) {
  const a = (target - s.x) * k - s.v * d;
  s.v += a * dt;
  s.x += s.v * dt;
  return s.x;
}

// coroutine helpers: inside generators `t -= yield` receives dt
function* wait(t) { while (t > 0) t -= yield; }
function* waitUntil(fn, max = 30) { while (!fn() && max > 0) max -= yield; }

// ---------- colour ----------
const _rgbCache = {};
function hexRgb(h) {
  if (_rgbCache[h]) return _rgbCache[h];
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return (_rgbCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function rgbHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return rgbHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, '#1a1030', t);
function rgba(c, a) { const [r, g, b] = hexRgb(c); return `rgba(${r},${g},${b},${a})`; }

// ---------- canvas path helpers ----------
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
function circ(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, Math.abs(r), 0, TAU); }
function starPath(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n;
    i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
function heartPath(ctx, x, y, s) {
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.3, x - s * 0.55, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 1.05, x + s * 1.1, y - s * 0.3, x, y + s * 0.35);
  ctx.closePath();
}
function hexPath(ctx, x, y, r, rot = 0) {
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
// fill a path with an outer outline: stroke twice as thick first, then fill over the inner half
function fillOutlined(ctx, fill, outline, lw) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw * 2;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

// ---------- save (per-viewer, optional) ----------
const Store = {
  key: 'robogochie.save.v1',
  load() { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  save(o) { try { localStorage.setItem(this.key, JSON.stringify(o)); } catch (e) { /* storage blocked */ } },
  clear() { try { localStorage.removeItem(this.key); } catch (e) { /* storage blocked */ } },
};
