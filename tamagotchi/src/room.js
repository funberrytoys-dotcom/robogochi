'use strict';
// The hideout inside the phone: layout, background, dock, toys, furniture and finger gestures.

const World = {
  W: 390, H: 844, S: 140, cx: 195, floorTop: 400, floorBottom: 720, topUI: 104,
  dock: { x: 80, y: 470 }, shakeAmt: 0, washing: false, night: 0, nightT: 0,
  bg: null, bgDirty: true,
  layout(W, H, topUI = 104, botUI = 112) {
    this.W = W; this.H = H; this.cx = W / 2; this.topUI = topUI;
    this.floorBottom = H - botUI - 6;
    this.floorTop = Math.min(H * 0.48, this.floorBottom - H * 0.25);
    this.S = clamp(Math.min(W * 0.37, (this.floorBottom - topUI) * 0.36), 80, 230);
    this.dock = { x: W * 0.22, y: lerp(this.floorTop, this.floorBottom, 0.2) };
    this.spots = {
      lamp: { x: W * 0.86, y: lerp(this.floorTop, this.floorBottom, 0.12) },
      plant: { x: W * 0.09, y: lerp(this.floorTop, this.floorBottom, 0.82) },
      rug: { x: W * 0.52, y: lerp(this.floorTop, this.floorBottom, 0.6) },
    };
    this.bgDirty = true;
  },
  depthScale(y) { return lerp(0.8, 1.05, clamp(invLerp(this.floorTop, this.floorBottom, y), 0, 1)); },
  clampFloor(x, y) {
    y = clamp(y, this.floorTop + this.H * 0.025, this.floorBottom);
    const t = invLerp(this.floorTop, this.floorBottom, y);
    const m = lerp(this.W * 0.15, this.W * 0.13, t);
    return { x: clamp(x, m, this.W - m), y };
  },
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
};

// ---------------- background (pre-rendered) ----------------
function renderRoomBg(owned) {
  const W = World.W, H = World.H, ft = World.floorTop, fb = World.floorBottom;
  const c = document.createElement('canvas');
  c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
  const g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  // wall
  let gr = g.createLinearGradient(0, 0, 0, ft);
  gr.addColorStop(0, '#9E88E8'); gr.addColorStop(1, '#C8B4F6');
  g.fillStyle = gr; g.fillRect(0, 0, W, ft + 2);
  // wall panels with screws
  const panel = (x, y, w, h) => {
    g.beginPath(); rrect(g, x, y, w, h, 18); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.22)'; g.stroke();
    g.fillStyle = 'rgba(110,84,190,0.55)';
    for (const [sx, sy] of [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) { g.beginPath(); circ(g, sx, sy, 3.2); g.fill(); }
  };
  panel(W * 0.03, H * 0.08, W * 0.34, ft - H * 0.12);
  panel(W * 0.4, H * 0.08, W * 0.57, ft - H * 0.12);
  // pipes
  const pipe = (pts, col, wdt) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineWidth = wdt + 5; g.strokeStyle = darken(col, 0.35); g.stroke();
    g.lineWidth = wdt; g.strokeStyle = col; g.stroke();
    g.lineWidth = wdt * 0.28; g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x - 2, y - 2) : g.moveTo(x - 2, y - 2))); g.stroke();
    for (const [x, y] of pts.slice(1, -1)) { g.beginPath(); circ(g, x, y, wdt * 0.85); g.fillStyle = lighten(col, 0.1); g.fill(); g.lineWidth = 2; g.strokeStyle = darken(col, 0.35); g.stroke(); }
  };
  pipe([[-10, H * 0.155], [W * 0.3, H * 0.155], [W * 0.3, H * 0.06], [W * 0.62, H * 0.06], [W + 10, H * 0.06]], '#FF9A5A', 13);
  pipe([[W * 0.965, H * 0.13], [W * 0.965, ft + 4]], '#7FE0C4', 12);
  pipe([[W * 0.035, H * 0.2], [W * 0.035, ft + 4]], '#FFC94D', 10);
  // phone battery tank on the wall (cute in-phone detail)
  const bx = W * 0.1, by = H * 0.215, bw = W * 0.2, bh = H * 0.075;
  g.beginPath(); rrect(g, bx, by, bw, bh, 10); g.fillStyle = '#5A47A8'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#3D2E80'; g.stroke();
  g.fillStyle = '#3D2E80'; g.fillRect(bx + bw, by + bh * 0.3, 6, bh * 0.4);
  // porthole: window to the phone's home screen
  const px = W * 0.74, py = H * 0.205, pr = Math.min(W * 0.17, H * 0.095);
  g.save(); g.beginPath(); circ(g, px, py, pr); g.clip();
  gr = g.createLinearGradient(px, py - pr, px, py + pr);
  gr.addColorStop(0, '#5B8CFF'); gr.addColorStop(1, '#C277FF');
  g.fillStyle = gr; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  const icons = ['#FF5C5C', '#FFD84A', '#4FD27A', '#4FC3FF', '#FF8AD8', '#FFFFFF', '#FF9A3D', '#7B61FF', '#2ED3B7'];
  try { g.filter = 'blur(1.2px)'; } catch (e) { /* no filter */ }
  const isz = pr * 0.42;
  for (let i = 0; i < 16; i++) {
    const ix = px - pr * 1.05 + (i % 4) * isz * 1.35 + isz * 0.25, iy = py - pr * 1.0 + Math.floor(i / 4) * isz * 1.35 + isz * 0.2;
    g.beginPath(); rrect(g, ix, iy, isz, isz, isz * 0.28); g.fillStyle = icons[(i * 5) % icons.length]; g.fill();
  }
  try { g.filter = 'none'; } catch (e) { /* no filter */ }
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath(); g.moveTo(px - pr, py - pr * 0.2); g.lineTo(px - pr * 0.2, py - pr); g.lineTo(px + pr * 0.1, py - pr); g.lineTo(px - pr, py + pr * 0.1); g.fill();
  g.restore();
  g.lineWidth = pr * 0.2; g.strokeStyle = '#ECE6FA'; g.beginPath(); circ(g, px, py, pr + pr * 0.08); g.stroke();
  g.lineWidth = 2.5; g.strokeStyle = '#7A68B8'; g.beginPath(); circ(g, px, py, pr + pr * 0.18); g.stroke(); g.beginPath(); circ(g, px, py, pr - pr * 0.02); g.stroke();
  g.fillStyle = '#9C8CCF';
  for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + 0.2; g.beginPath(); circ(g, px + Math.cos(a) * pr * 1.08, py + Math.sin(a) * pr * 1.08, 2.6); g.fill(); }
  // hatch door to the next compartment
  const dx = W * 0.4, dw = W * 0.24, dy = ft - H * 0.215;
  g.beginPath(); rrect(g, dx - 8, dy - 8, dw + 16, ft - dy + 10, 26); g.fillStyle = '#8B73DB'; g.fill();
  g.beginPath(); rrect(g, dx, dy, dw, ft - dy + 4, 20);
  gr = g.createLinearGradient(dx, dy, dx + dw, ft); gr.addColorStop(0, '#B7A4F7'); gr.addColorStop(1, '#9A84EC');
  g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = '#6E57C8'; g.stroke();
  g.beginPath(); circ(g, dx + dw / 2, dy + (ft - dy) * 0.32, dw * 0.17); g.fillStyle = '#3C2E78'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#E8E0FF'; g.stroke();
  g.beginPath(); circ(g, dx + dw * 0.78, dy + (ft - dy) * 0.62, 7); g.fillStyle = '#FFD166'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#B88A1E'; g.stroke();
  // shelf
  const sy = H * 0.33, sx0 = W * 0.06, sx1 = W * 0.34;
  g.fillStyle = '#F4E6D8'; g.beginPath(); rrect(g, sx0, sy, sx1 - sx0, 9, 4); g.fill();
  g.fillStyle = '#C9A88A'; g.fillRect(sx0 + 4, sy + 9, sx1 - sx0 - 8, 3);
  // toys on the shelf: magnet, die, tiny rocket
  g.save(); g.translate(sx0 + 20, sy); g.lineCap = 'butt';
  g.lineWidth = 9; g.strokeStyle = '#FF5C5C'; g.beginPath(); g.arc(0, -14, 10, Math.PI, Math.PI * 1.5); g.stroke();
  g.strokeStyle = '#4FA3FF'; g.beginPath(); g.arc(0, -14, 10, Math.PI * 1.5, 0); g.stroke();
  g.fillStyle = '#EEE'; g.fillRect(-14.5, -14, 9, 7); g.fillRect(5.5, -14, 9, 7);
  g.restore();
  g.fillStyle = '#FFFDF8'; g.beginPath(); rrect(g, sx0 + 46, sy - 17, 17, 17, 4); g.fill();
  g.fillStyle = '#5A47A8'; for (const [ax, ay] of [[50, -13], [59, -4], [54.5, -8.5]]) { g.beginPath(); circ(g, sx0 + ax, sy + ay, 1.8); g.fill(); }
  g.save(); g.translate(sx0 + 84, sy); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(9, -18, 7, 0); g.lineTo(-7, 0); g.quadraticCurveTo(-9, -18, 0, -30); g.fill();
  g.fillStyle = '#FF5C8A'; g.beginPath(); circ(g, 0, -15, 3.5); g.fill(); g.fillStyle = '#FF9A3D'; g.fillRect(-10, -6, 5, 6); g.fillRect(5, -6, 5, 6); g.restore();
  // poster
  if (owned.poster) {
    const pw = W * 0.2, ppx = W * 0.71, ppy = py + pr * 1.3, ph = Math.min(ft - ppy - 14, W * 0.26);
    if (ph > 30) {
      g.save(); g.translate(ppx + pw / 2, ppy + ph / 2); g.rotate(-0.04);
      g.beginPath(); rrect(g, -pw / 2, -ph / 2, pw, ph, 6); g.fillStyle = '#1F1A4A'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#FFFFFF'; g.stroke();
      g.fillStyle = '#FFD84A'; g.beginPath(); circ(g, -pw * 0.15, -ph * 0.1, pw * 0.16); g.fill();
      g.strokeStyle = '#FF8AD8'; g.lineWidth = 3; g.beginPath(); g.ellipse(-pw * 0.15, -ph * 0.1, pw * 0.3, pw * 0.07, -0.3, 0, TAU); g.stroke();
      g.fillStyle = '#FFFFFF'; for (let i = 0; i < 6; i++) { g.beginPath(); starPath(g, Math.sin(i * 7) * pw * 0.4, Math.cos(i * 5) * ph * 0.4, 3, 1.2, 4); g.fill(); }
      g.restore();
    }
  }
  // baseboard
  g.fillStyle = '#7F66D2'; g.fillRect(0, ft - 4, W, 10);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, ft - 4, W, 2);
  // floor
  gr = g.createLinearGradient(0, ft, 0, H);
  gr.addColorStop(0, '#F2C4A6'); gr.addColorStop(1, '#F8D8BE');
  g.fillStyle = gr; g.fillRect(0, ft + 6, W, H - ft);
  // circuit traces in perspective
  const vpX = W / 2, vpY = ft - H * 0.6;
  g.strokeStyle = 'rgba(255,240,226,0.75)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = -5; i <= 5; i++) {
    const x0 = W / 2 + i * W * 0.21;
    const t1 = (H - vpY), x1 = vpX + (x0 - vpX) * ((ft + 6 - vpY) / t1);
    g.beginPath(); g.moveTo(x1, ft + 8); g.lineTo(x0, H); g.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const y = ft + 8 + Math.pow(k / 6, 1.6) * (H - ft);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  g.fillStyle = 'rgba(255,230,210,0.9)';
  for (let i = 0; i < 9; i++) {
    const x = (Math.sin(i * 12.7) * 0.45 + 0.5) * W, y = ft + 14 + (Math.cos(i * 7.3) * 0.5 + 0.5) * (fb - ft);
    g.beginPath(); circ(g, x, y, 4 + (i % 3)); g.fill();
  }
  // soft vignette at floor edges
  gr = g.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, 'rgba(120,70,120,0.18)'); gr.addColorStop(0.15, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,70,120,0.18)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}

// --- floor objects drawn every frame ---
function drawDockBack(ctx, charging) {
  const d = World.dock, s = World.S * World.depthScale(d.y) / 140;
  ctx.save(); ctx.translate(d.x, d.y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(60,30,80,0.18)'; ctx.beginPath(); ell(ctx, 0, 6, 92, 20); ctx.fill();
  // pod back shell
  ctx.beginPath(); ctx.moveTo(-86, 4); ctx.lineTo(-86, -60); ctx.bezierCurveTo(-86, -150, 86, -150, 86, -60); ctx.lineTo(86, 4); ctx.closePath();
  fillOutlined(ctx, shadeFill(ctx, '#FFF1E2', -150, 4), '#B8865F', 2.5);
  ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-70, -58); ctx.bezierCurveTo(-70, -126, 70, -126, 70, -58); ctx.lineTo(70, 0); ctx.closePath();
  ctx.fillStyle = '#5E4C93'; ctx.fill();
  // lightning sign
  const on = charging ? 0.6 + Math.sin(performance.now() / 300) * 0.4 : 0.3;
  ctx.shadowColor = '#6BFF8E'; ctx.shadowBlur = charging ? 18 * DPR : 0;
  ctx.fillStyle = rgba('#6BFF8E', on);
  ctx.beginPath(); ctx.moveTo(4, -112); ctx.lineTo(-10, -88); ctx.lineTo(0, -88); ctx.lineTo(-5, -70); ctx.lineTo(11, -95); ctx.lineTo(1, -95); ctx.lineTo(6, -112); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // pillow
  ctx.beginPath(); rrect(ctx, -54, -36, 108, 28, 14); fillOutlined(ctx, '#FFD1E3', '#C77A9C', 2);
  ctx.restore();
}
function drawDockFront(ctx, charging) {
  const d = World.dock, s = World.S * World.depthScale(d.y) / 140;
  ctx.save(); ctx.translate(d.x, d.y); ctx.scale(s, s);
  ctx.beginPath(); rrect(ctx, -92, -18, 184, 30, 15);
  fillOutlined(ctx, shadeFill(ctx, '#FF9A52', -18, 12), '#B2541E', 2.5);
  const k = charging ? 0.7 + Math.sin(performance.now() / 250) * 0.3 : 0.25;
  ctx.shadowColor = '#6BFF8E'; ctx.shadowBlur = charging ? 12 * DPR : 0;
  ctx.fillStyle = rgba('#6BFF8E', k); ctx.beginPath(); rrect(ctx, -40, -8, 80, 8, 4); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}
function drawRug(ctx) {
  const p = World.spots.rug, s = World.S / 140;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  const cols = ['#FF8AB5', '#FFD84A', '#7FD3FF', '#B9A3FF'];
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ell(ctx, 0, 0, 120 - i * 26, 32 - i * 7); ctx.fillStyle = cols[i]; ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ell(ctx, 0, 0, 108, 28); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
function drawLamp(ctx, night) {
  const p = World.spots.lamp, s = World.S * World.depthScale(p.y) / 140;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(60,30,80,0.18)'; ctx.beginPath(); ell(ctx, 0, 2, 28, 8); ctx.fill();
  ctx.beginPath(); rrect(ctx, -8, -70, 16, 72, 6); fillOutlined(ctx, '#FFF3E0', '#B89572', 2);
  if (night) { ctx.shadowColor = '#FFB347'; ctx.shadowBlur = 40 * DPR; }
  ctx.beginPath(); ctx.moveTo(-44, -66); ctx.bezierCurveTo(-44, -120, 44, -120, 44, -66); ctx.closePath();
  fillOutlined(ctx, night ? '#FFD27A' : '#FF6B8A', night ? '#C77A20' : '#A62E4E', 2.5);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [x, y, r] of [[-20, -84, 6], [10, -96, 5], [24, -78, 4]]) { ctx.beginPath(); circ(ctx, x, y, r); ctx.fill(); }
  ctx.restore();
}
function drawPlant(ctx) {
  const p = World.spots.plant, s = World.S * World.depthScale(p.y) / 140;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(60,30,80,0.18)'; ctx.beginPath(); ell(ctx, 0, 2, 30, 8); ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.translate(0, -40); ctx.rotate(-1.1 + i * 0.55 + Math.sin(t * 1.2 + i) * 0.05);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(10, -20, 10, -50, 0, -62); ctx.bezierCurveTo(-10, -50, -10, -20, 0, 0);
    fillOutlined(ctx, i % 2 ? '#6FD36F' : '#8BE38B', '#2F7A3A', 2); ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(-26, -42); ctx.lineTo(26, -42); ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.closePath();
  fillOutlined(ctx, '#FF9A5A', '#B2541E', 2.5);
  ctx.fillStyle = '#FFD166'; ctx.fillRect(-23, -32, 46, 6);
  ctx.restore();
}
function drawStars(ctx, k) {
  if (k <= 0) return;
  const t = performance.now() / 1000, W = World.W;
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const x = ((Math.sin(i * 91.3) * 0.5 + 0.5) * W + t * 6) % W, y = (Math.cos(i * 37.1) * 0.5 + 0.5) * World.floorTop * 0.95;
    ctx.globalAlpha = k * (0.5 + 0.5 * Math.sin(t * 2 + i));
    ctx.fillStyle = i % 3 ? '#FFF7C2' : '#BFE9FF';
    ctx.beginPath(); starPath(ctx, x, y, 5, 2, 4); ctx.fill();
  }
  ctx.restore();
}

// ---------------- toys ----------------
class Ball {
  constructor(x, y) { this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.rot = 0; this.spin = 0; this.alive = true; this.grab = null; }
  get r() { return 0.13 * World.S * World.depthScale(this.y); }
  update(dt) {
    if (this.grab) return;
    const S = World.S;
    this.vz -= S * 12 * dt; this.z += this.vz * dt;
    if (this.z < 0) { this.z = 0; if (this.vz < -S * 0.8) { this.vz = -this.vz * 0.55; Snd.sfx.pop(0.6); } else this.vz = 0; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const f = this.z > 0 ? 0.3 : 1.6;
    this.vx *= 1 - f * dt; this.vy *= 1 - f * dt * 1.4;
    const p = World.clampFloor(this.x, this.y);
    if (p.x !== this.x) { this.vx = -this.vx * 0.7; Snd.sfx.pop(0.5); }
    if (p.y !== this.y) this.vy = -this.vy * 0.6;
    this.x = p.x; this.y = p.y;
    this.rot += (this.vx / Math.max(8, this.r)) * dt;
  }
  get moving() { return Math.abs(this.vx) + Math.abs(this.vy) + Math.abs(this.vz) > 25; }
  draw(ctx) {
    const r = this.r;
    ctx.fillStyle = 'rgba(60,30,80,0.2)';
    ctx.beginPath(); ell(ctx, this.x, this.y, r * clamp(1 - this.z / 300, 0.4, 1), r * 0.3); ctx.fill();
    drawBall(ctx, this.x, this.y - r - this.z, r, this.rot);
  }
  hit(x, y) { return dist(x, y, this.x, this.y - this.r - this.z) < this.r * 1.7; }
}

class Food {
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.z = 0; this.vz = 0; this.held = true; this.floorY = y; this.alive = true; this.t = 0; }
  update(dt) {
    this.t += dt;
    if (!this.held && this.z > 0) { this.vz -= World.S * 12 * dt; this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; this.vz = 0; Snd.sfx.plop(); } }
  }
  draw(ctx) {
    const s = World.S / 140 * 1.15;
    if (!this.held) { ctx.fillStyle = 'rgba(60,30,80,0.2)'; ctx.beginPath(); ell(ctx, this.x, this.floorY, 16 * s, 5 * s); ctx.fill(); }
    ctx.save(); ctx.translate(this.x, (this.held ? this.y : this.floorY - this.z) - (this.held ? 0 : 14 * s)); ctx.scale(s, s);
    if (this.held) ctx.rotate(Math.sin(this.t * 6) * 0.1);
    drawFood(ctx, this.kind);
    ctx.restore();
  }
}
function drawFood(ctx, kind) {
  if (kind === 'cookie') drawCookie(ctx, 0, 0, 1.2);
  else if (kind === 'candy') {
    ctx.beginPath(); rrect(ctx, -9, -16, 18, 30, 6); ctx.fillStyle = '#FF7FB8'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#B23A72'; ctx.stroke();
    ctx.fillStyle = '#B23A72'; ctx.fillRect(-4, -20, 8, 5);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 16px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', 0, 0);
  } else {
    ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(12, -14); ctx.lineTo(9, 16); ctx.lineTo(-9, 16); ctx.closePath();
    ctx.fillStyle = '#E8F7FF'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4A7FA8'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(11, -4); ctx.lineTo(9, 16); ctx.lineTo(-9, 16); ctx.closePath(); ctx.fillStyle = '#5FC8FF'; ctx.fill();
    ctx.strokeStyle = '#FF7FB8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(8, -24); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); circ(ctx, -4, 4, 2.5); ctx.fill();
  }
}
const FOODS = {
  cookie: { name: 'Гайка-печенька', food: 26, fun: 2, energy: 0 },
  candy: { name: 'Батарейка-конфета', food: 12, fun: 8, energy: 10 },
  oil: { name: 'Масляный коктейль', food: 18, fun: 3, energy: 6 },
};

// ---------------- the room scene ----------------
const Room = {
  robot: null, ball: null, foods: [], gesture: null, knock: { taps: [], last: 0, x: 0, y: 0 },
  petAcc: 0, purrT: 0, heartAcc: 0, tapLog: [], scrub: 0, sponge: null, showerT: 0,
  enter() {
    World.bgDirty = true;
    const r = this.robot;
    if (this.greetOnEnter) {
      this.greetOnEnter = false;
      r.play(B.greet(r), 2, 'greet');
      if (Game.away > 20) setTimeout(() => { UI.toast(`Пока тебя не было, ${Game.s.name} нашёл 5 винтиков!`, 'bolt'); Game.addBolts(5, r.x, r.y - r.px); }, 1800);
      setTimeout(() => Game.hint(), 2500);
    }
  },
  switchRobot(def) {
    const old = this.robot, x = old.x, y = old.y;
    FX.burst('spark', x, y - old.px * 0.7, 14, { min: 80, max: 220, p: { life: 0.8, col: '#FFFFFF' } });
    FX.burst('dust', x, y - old.px * 0.4, 8, { min: 40, max: 120, p: { life: 0.7, col: 'rgba(255,255,255,0.7)' } });
    Snd.sfx.whoosh(); Snd.sfx.sparkle();
    this.setRobot(def, true);
    const r = this.robot; r.x = x; r.y = y; r.sq.v -= 6;
    r.play(B.hello(r), 2, 'hello');
  },
  setRobot(def, keepPos) {
    const old = this.robot;
    const x = keepPos && old ? old.x : World.cx, y = keepPos && old ? old.y : lerp(World.floorTop, World.floorBottom, 0.62);
    this.robot = new Robot(def, World, x, y);
    this.robot.hat = Game.s.hat;
    this.robot.dirt = clamp(1 - Game.s.needs.clean / 70, 0, 1);
  },
  ensureToys() { if (!this.ball) this.ball = new Ball(World.W * 0.75, lerp(World.floorTop, World.floorBottom, 0.75)); },

  // ---------- gestures ----------
  down(x, y, id) {
    const r = this.robot;
    if (World.washing) { this.gesture = { type: 'scrub', x, y, id }; this.sponge = { x, y }; return; }
    if (this.ball && this.ball.hit(x, y)) {
      this.ball.grab = { x, y, t: performance.now(), hist: [[x, y, performance.now()]] };
      this.gesture = { type: 'ball', id }; return;
    }
    const hit = r.hitTest(x, y);
    if (hit && r.mode === 'sleep') { this.wake(true); this.gesture = { type: 'none' }; return; }
    if (hit) this.gesture = { type: hit, x0: x, y0: y, x, y, t0: performance.now(), moved: 0, id, petting: false };
    else this.gesture = { type: 'glass', x0: x, y0: y, t0: performance.now(), moved: 0, id };
  },
  move(x, y) {
    const g = this.gesture, r = this.robot;
    if (!g) return;
    if (g.type === 'scrub') { this.doScrub(x, y); return; }
    if (g.type === 'ball') { const b = this.ball; b.grab.x = x; b.grab.y = y; b.grab.hist.push([x, y, performance.now()]); if (b.grab.hist.length > 6) b.grab.hist.shift(); b.x = x; const fl = World.clampFloor(x, Math.max(y + b.r, World.floorTop + 10)); b.y = fl.y; b.z = Math.max(0, fl.y - y - b.r); return; }
    if (g.type === 'held') { r.hold.x = x; r.hold.y = y; return; }
    const d = Math.hypot(x - g.x, y - g.y);
    g.moved += d;
    const fromStart = Math.hypot(x - g.x0, y - g.y0);
    if (g.type === 'head') {
      if (fromStart > 10) g.petting = true;
      if (g.petting) this.pet(x, y, d);
      if (g.petting && !r.hitTest(x, y) && fromStart > r.px * 1.5) g.type = 'none';
    } else if (g.type === 'body' && fromStart > 12) {
      this.pickUp(x, y);
    } else if (g.type === 'glass') {
      // nothing
    }
    g.x = x; g.y = y;
  },
  up(x, y) {
    const g = this.gesture, r = this.robot;
    this.gesture = null;
    if (!g) return;
    const quick = performance.now() - (g.t0 || 0) < 350 && (g.moved || 0) < 14;
    if (g.type === 'scrub') { this.sponge = null; return; }
    if (g.type === 'ball') { this.throwBall(); return; }
    if (g.type === 'held') { this.release(); return; }
    if (g.type === 'head') { if (quick) this.tapRobot('head'); else if (g.petting) this.petEnd(); return; }
    if (g.type === 'body') { if (quick) this.tapRobot('body'); return; }
    if (g.type === 'glass' && quick) this.knockGlass(x, y);
  },
  tick(dt) {
    // long press on head picks the robot up
    const g = this.gesture;
    if (g && (g.type === 'head') && !g.petting && performance.now() - g.t0 > 420 && g.moved < 10) this.pickUp(g.x, g.y);
  },

  pet(x, y, d) {
    const r = this.robot;
    if (r.mode === 'sleep' || r.busy && r.coPri >= 3) return;
    if (r.busy && r.coPri < 3) r.stop();
    const h = r.headWorld();
    r.face('happy', 0.4);
    r.crouchT = 0.28;
    r.headTarget.rot = clamp((x - h.x) / r.px * -0.5, -0.3, 0.3);
    r.lookAt(x, y, 0.3);
    this.petAcc += d; this.heartAcc += d;
    this.purrT -= 1 / 60;
    if (this.purrT <= 0) { this.purrT = 1.15; Snd.purr(r.def.voice, 1.1); }
    if (this.heartAcc > 70) { this.heartAcc = 0; FX.add({ kind: 'heart', x: x + rand(-10, 10), y: y - 20, vy: -70, vx: rand(-20, 20), life: 1, s: rand(0.8, 1.2) }); }
    if (this.petAcc > 260) { this.petAcc = 0; Game.friend(1, 'pet'); Game.need('fun', 4); }
  },
  petEnd() {
    const r = this.robot;
    r.crouchT = 0; r.headTarget.rot = 0;
    if (r.mode !== 'sleep') { r.face('love', 1.2); r.say('love'); }
    Game.hint('pet');
  },
  tapRobot(part) {
    const r = this.robot, now = performance.now();
    this.tapLog = this.tapLog.filter((t) => now - t < 2200); this.tapLog.push(now);
    if (r.coPri >= 3) return;
    if (this.tapLog.length >= 5 && r.mode === 'stand' && r.grounded) { this.tapLog = []; r.stop(); r.play(chance(0.6) ? B.fall(r) : B.plop(r), 2, 'fall'); Game.friend(1, 'tap'); return; }
    if (r.busy && r.coPri >= 2) return;
    r.stop();
    if (part === 'body') { r.play(B.giggle(r), 2, 'tickle'); Game.need('fun', 3); }
    else r.play(pick([B.surprised(r), B.question(r), B.happyHop(r, 1), B.giggle(r, 0.7), B[TRAITS[r.def.trait]](r)]), 2, 'tap');
    Game.friend(1, 'tap');
    Game.hint('tap');
  },
  pickUp(x, y) {
    const r = this.robot;
    if (r.mode === 'sleep') return;
    r.stop(); r.mode = 'stand'; r.held = true; r.hold = { x, y };
    this.gesture = { type: 'held' };
    r.face('surprised', 0.6); r.say('surprise'); r.flap = 1;
    setTimeout(() => { if (r.held) { r.face('happy', 99); r.say('giggle'); } }, 600);
    Game.hint('lift');
  },
  release() {
    const r = this.robot;
    r.held = false; r.flap = 0; r.expr = null;
    r.vz = 0; r.vx = (r.vx || 0) * 0.5; r.vy = 0;
    r.onLand = (k) => {
      r.onLand = null;
      if (k > 1.1 && chance(0.5)) r.play(B.plop(r), 2, 'plop');
      else if (k > 0.5) r.play(B.happyHop(r, 1), 2, 'land');
    };
    if (r.z < 4) { r.z = 0; r.onLand(0.6); }
  },
  knockGlass(x, y) {
    const k = this.knock, now = performance.now() / 1000, r = this.robot;
    Snd.sfx.knock();
    FX.add({ kind: 'ripple', x, y, life: 0.55, layer: 1 });
    if (r.mode === 'sleep') { r.face('closed', 9999); r.say('grumpy', { vol: 0.5 }); return; }
    if (now - k.last > 1.4) k.taps = [];
    k.taps.push(now); k.last = now; k.x = x; k.y = y;
    if (k.taps.length === 1 && r.coPri < 2) { r.lookAt(x, y, 2); r.face('look', 0.6); }
  },
  throwBall() {
    const b = this.ball, h = b.grab.hist, now = performance.now();
    b.grab = null;
    const a = h[0], z = h[h.length - 1], dt = Math.max(16, now - a[2]) / 1000;
    let vx = (z[0] - a[0]) / dt, vy = (z[1] - a[1]) / dt;
    const sp = Math.hypot(vx, vy);
    if (sp < 60) { // a tap: give it a little kick
      vx = rand(-1, 1) * World.S * 1.5; vy = rand(-0.5, 0.5) * World.S; b.vz = World.S * 2.2; Snd.sfx.kick();
    } else { b.vz = Math.max(0, -vy) * 0.6 + World.S * 0.8; vy *= 0.25; }
    b.vx = clamp(vx, -World.S * 5, World.S * 5); b.vy = clamp(vy, -World.S * 2, World.S * 2);
    Game.need('fun', 2);
    const r = this.robot;
    if (r.mode === 'stand' && r.coPri < 2) { r.stop(); r.play(B.kick(r, b), 1, 'kick'); }
  },
  // ---------- food ----------
  startFood(kind, x, y) {
    const f = new Food(kind, x, y); this.foods.push(f); this.dragFood = f;
    const r = this.robot;
    if (r.mode === 'sleep') this.wake(true);
    Snd.sfx.open();
  },
  moveFood(x, y) {
    const f = this.dragFood; if (!f) return;
    f.x = x; f.y = y - 30;
    const r = this.robot, h = r.headWorld();
    const d = dist(f.x, f.y, h.x, h.y + r.px * 0.3);
    if (r.coPri < 3 && r.mode !== 'down') {
      r.lookAt(f.x, f.y, 0.4);
      if (d < r.px * 1.4) { r.billHold = 0.6; r.face('star', 0.3); if (!f.wanted) { f.wanted = true; r.say('wow'); } }
      else r.billHold = 0;
    }
    if (d < r.px * 0.5 && r.coPri < 3) this.feed(f);
  },
  dropFood() {
    const f = this.dragFood; this.dragFood = null;
    if (!f || !f.alive) return;
    const r = this.robot; r.billHold = 0;
    f.held = false;
    const fl = World.clampFloor(f.x, Math.max(f.y + 40, World.floorTop + 30));
    f.floorY = fl.y; f.x = fl.x; f.z = Math.max(0, fl.y - f.y); f.vz = 0;
    // the robot fetches it
    if (r.mode !== 'down') { r.stop(); r.play((function* () { yield* waitUntil(() => f.z <= 0, 2); yield* walk(r, f.x, f.floorY + 4, 1.3, 4); if (f.alive) Room.feed(f); })(), 1, 'fetch'); }
  },
  feed(f) {
    f.alive = false; if (this.dragFood === f) this.dragFood = null;
    const r = this.robot, F = FOODS[f.kind];
    r.stop(); r.play(B.eat(r, f.kind), 3, 'eat');
    Game.need('food', F.food); Game.need('fun', F.fun); Game.need('energy', F.energy);
    Game.friend(2, 'feed'); Game.stat('feeds');
    Game.hint('feed');
  },
  // ---------- wash ----------
  startWash() {
    const r = this.robot;
    if (r.mode === 'sleep') this.wake(true);
    r.stop(); r.mode = 'stand'; World.washing = true; this.scrub = 0;
    r.face('surprised', 0.6); r.say('question');
  },
  doScrub(x, y) {
    const r = this.robot;
    if (!World.washing) { this.sponge = null; return; }
    this.sponge = { x, y };
    const hit = r.hitTest(x, y);
    if (!hit) return;
    this.scrub += 0.012;
    if (chance(0.5)) Snd.sfx.scrub();
    const h = r.headWorld(), px = r.px;
    if (r.foam.length < 40 && chance(0.6)) {
      const lx = (x - h.x) / (r.def.head.w * px), ly = (y - h.y) / (r.def.head.h * px);
      r.foam.push({ x: clamp(lx, -0.55, 0.55) + rand(-0.06, 0.06), y: clamp(ly, -0.6, 0.6) + rand(-0.06, 0.06), r: rand(0.03, 0.06), life: 6 });
    }
    r.dirt = Math.max(0, r.dirt - 0.01);
    r.face(chance(0.5) ? 'squint' : 'giggle', 0.4);
    if (chance(0.04)) r.say('giggle', { vol: 0.6 });
    if (chance(0.15)) FX.add({ kind: 'bubble', x: x + rand(-20, 20), y: y + rand(-20, 20), vy: -rand(30, 70), life: 1.3, r: rand(4, 9) });
    UI.$('washM').style.width = Math.round(clamp(this.scrub, 0, 1) * 100) + '%';
    if (this.scrub >= 1) this.rinse();
  },
  rinse() {
    World.washing = false; this.sponge = null; this.showerT = 1.0; this.scrub = 0;
    const r = this.robot;
    Snd.sfx.splash();
    r.play((function* () { r.face('closed', 1); yield* wait(0.9); yield* B.shakeOff(r); })(), 3, 'shake');
    Game.need('clean', 100); Game.stat('washes'); Game.friend(2, 'wash');
    UI.setWash(false);
  },
  cancelWash() { World.washing = false; this.sponge = null; if (this.robot.foam.length) this.rinse(); else UI.setWash(false); },
  // ---------- sleep ----------
  goSleep() {
    const r = this.robot;
    if (r.mode === 'sleep') { this.wake(false); return; }
    r.stop(); r.mode = 'stand'; r.play(B.sleep(r), 3, 'sleep');
    Game.stat('sleeps');
  },
  wake(early) {
    const r = this.robot;
    if (!r.sleeping && r.coName !== 'sleep') return;
    r.wokeEarly = early && Game.s.needs.energy < 60;
    r.sleeping = false; r.expr = null;
    Snd.sfx.lightOn();
  },

  // ---------- frame ----------
  update(dt) {
    const r = this.robot;
    this.tick(dt);
    r.battery = Game.s.needs.energy / 100;
    if (!World.washing) r.dirt = clamp(1 - Game.s.needs.clean / 70, 0, 1) * (r.foam.length ? 0.3 : 1);
    r.update(dt);
    if (this.ball) {
      this.ball.update(dt);
      // the robot notices a rolling ball
      if (this.ball.moving && !r.busy && r.mode === 'stand' && !r.held && chance(dt * 1.2)) r.play(B.kick(r, this.ball), 1, 'kick');
    }
    for (const f of this.foods) f.update(dt);
    this.foods = this.foods.filter((f) => f.alive);
    // knock reply
    const k = this.knock, now = performance.now() / 1000;
    if (k.taps.length && now - k.last > 0.75) {
      const taps = k.taps; k.taps = [];
      const iv = []; for (let i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
      if (r.mode !== 'sleep' && r.coPri < 3) { r.stop(); if (r.mode === 'sit') r.mode = 'stand'; r.play(B.knockReply(r, iv.slice(0, 5), { x: k.x, y: k.y }), 2, 'knock'); }
      Game.hint('knock');
    }
    // night follows sleep; keep the sleep button in sync
    const sleeping = r.mode === 'sleep';
    const asleep = r.coName === 'sleep';
    if (asleep !== this.wasAsleep) { this.wasAsleep = asleep; UI.sleepBtn(); }
    World.night = damp(World.night, sleeping ? 1 : 0, 2.5, dt);
    if (this.showerT > 0) {
      this.showerT -= dt;
      const h = r.headWorld();
      for (let i = 0; i < 3; i++) FX.add({ kind: 'drop', x: h.x + rand(-1, 1) * r.px * 0.6, y: h.y - r.px * rand(0.6, 1.2), vy: rand(300, 450), g: 600, life: 0.5 });
    }
    // idle life
    if (!r.busy && !r.held && r.mode === 'stand' && r.grounded && !this.party && !World.washing) {
      r.idleT -= dt;
      if (r.idleT <= 0) { r.idleT = rand(2.2, 5); this.idle(); }
    } else if (!r.busy && r.mode === 'sit') { r.mode = 'stand'; }
  },
  idle() {
    const r = this.robot, n = Game.s.needs, own = Game.s.owned;
    const low = Game.lowestNeed();
    if (low && low.v < 30 && chance(0.5)) { r.play(B.think(r, low.k === 'fun' ? 'fun' : low.k), 1, 'think'); return; }
    if (n.energy < 12) { r.play(B.sleep(r), 3, 'sleep'); return; }
    if (n.energy < 30 && chance(0.3)) { r.play(B.yawn(r), 1, 'yawn'); return; }
    const opts = [
      [3, () => { const p = World.clampFloor(rand(World.W * 0.15, World.W * 0.85), rand(World.floorTop + 40, World.floorBottom - 10)); r.play(walk(r, p.x, p.y, rand(0.6, 1)), 0, 'wander'); }],
      [2, () => r.play(B[TRAITS[r.def.trait]](r), 1, 'trait')],
      [1, () => r.play(B.stumble(r), 1, 'stumble')],
      [1.2, () => r.play(B.question(r), 0, 'q')],
      [0.8, () => r.play(B.greet(r), 1, 'greet')],
      [1, () => { const b = this.ball; if (b) r.play(B.kick(r, b), 1, 'kick'); }],
    ];
    if (own.rug) opts.push([1.5, () => r.play((function* () { const p = World.spots.rug; yield* walk(r, p.x, p.y + 4, 1); yield* B.dance(r, 8); Game.need('fun', 3); })(), 1, 'rug')]);
    if (own.plant) opts.push([0.8, () => r.play((function* () { const p = World.spots.plant; yield* walk(r, p.x + World.S * 0.5, p.y, 1); r.lookAt(p.x, p.y - 40, 2); yield* B.question(r); r.face('love', 1); r.say('love'); yield* wait(0.8); })(), 1, 'plant')]);
    if (r.hat === 'propeller') opts.push([1, () => r.play(B.fly(r), 1, 'fly')]);
    let sum = opts.reduce((a, o) => a + o[0], 0), pr = rand(sum);
    for (const [w, fn] of opts) { pr -= w; if (pr <= 0) { fn(); return; } }
  },
  draw(ctx) {
    const W = World.W, H = World.H, r = this.robot, own = Game.s.owned;
    if (World.bgDirty || !World.bg) { World.bg = renderRoomBg(own); World.bgDirty = false; }
    ctx.drawImage(World.bg, 0, 0, W, H);
    const charging = r.mode === 'sleep';
    if (own.rug) drawRug(ctx);
    drawDockBack(ctx, charging);
    // depth-sorted floor objects
    const objs = [];
    objs.push({ y: World.dock.y + (r.mode === 'sleep' ? 1 : -1), d: () => drawDockFront(ctx, charging) });
    objs.push({ y: r.y, d: () => { if (World.night > 0.05) { ctx.save(); try { ctx.filter = `brightness(${1 - World.night * 0.4})`; } catch (e) { /* */ } r.draw(ctx); ctx.restore(); } else r.draw(ctx); } });
    if (this.ball) objs.push({ y: this.ball.y, d: () => this.ball.draw(ctx) });
    for (const f of this.foods) if (!f.held) objs.push({ y: f.floorY, d: () => f.draw(ctx) });
    if (own.lamp) objs.push({ y: World.spots.lamp.y, d: () => drawLamp(ctx, World.night > 0.3) });
    if (own.plant) objs.push({ y: World.spots.plant.y, d: () => drawPlant(ctx) });
    objs.sort((a, b) => a.y - b.y).forEach((o) => o.d());
    if (this.party) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const t = performance.now() / 1000;
      for (let i = 0; i < 4; i++) {
        const x = World.W * (0.5 + 0.35 * Math.sin(t * 1.3 + i * 1.7)), y = lerp(World.floorTop, World.floorBottom, 0.5 + 0.4 * Math.cos(t * 1.1 + i * 2.1));
        const col = ['#FF5C8A', '#4FC3FF', '#FFD84A', '#7BE07A'][i], g = ctx.createRadialGradient(x, y, 0, x, y, 100);
        g.addColorStop(0, rgba(col, 0.38)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - 100, y - 100, 200, 200);
      }
      ctx.restore();
    }
    FX.draw(ctx, 0);
    // night
    if (World.night > 0.01) {
      ctx.fillStyle = `rgba(16,12,48,${0.55 * World.night})`; ctx.fillRect(0, 0, W, H);
      if (own.stars) drawStars(ctx, World.night);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const glow = (x, y, rad, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
      glow(World.dock.x, World.dock.y - World.S * 0.5, World.S * 1.2, '#6BFF8E', 0.18 * World.night);
      if (own.lamp) glow(World.spots.lamp.x, World.spots.lamp.y - World.S * 0.6, World.S * 1.6, '#FFB347', 0.32 * World.night);
      ctx.restore();
    }
    for (const f of this.foods) if (f.held) f.draw(ctx);
    if (this.sponge) drawSponge(ctx, this.sponge.x, this.sponge.y);
  },
};

function drawSponge(ctx, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25 + Math.sin(performance.now() / 80) * 0.08);
  ctx.beginPath(); rrect(ctx, -26, -18, 52, 36, 10); fillOutlined(ctx, '#FFE066', '#B8941E', 2.5);
  ctx.beginPath(); rrect(ctx, -26, 6, 52, 12, 6); ctx.fillStyle = '#5FD38A'; ctx.fill();
  ctx.fillStyle = 'rgba(184,148,30,0.5)';
  for (const [a, b] of [[-12, -8], [4, -10], [14, -2], [-4, 0]]) { ctx.beginPath(); circ(ctx, a, b, 2.5); ctx.fill(); }
  ctx.restore();
}
