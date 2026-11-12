'use strict';
// Procedural 2D rig of a baby robot. Local units: 1 = robot "size" S (head is ~1 wide).
// Origin = ground point between the feet, y grows downward (canvas).

let DPR = 1;

const HEAD_SHAPES = {
  dome: {
    // Microduck-style cap: big rounded top, flat bottom with soft corners
    path(ctx, w, h) {
      const r = h * 0.2, top = -h / 2, bot = h / 2;
      ctx.moveTo(-w / 2, bot - r);
      ctx.lineTo(-w / 2, top + h * 0.52);
      ctx.bezierCurveTo(-w / 2, top + h * 0.02, -w * 0.3, top, 0, top);
      ctx.bezierCurveTo(w * 0.3, top, w / 2, top + h * 0.02, w / 2, top + h * 0.52);
      ctx.lineTo(w / 2, bot - r);
      ctx.quadraticCurveTo(w / 2, bot, w / 2 - r, bot);
      ctx.lineTo(-w / 2 + r, bot);
      ctx.quadraticCurveTo(-w / 2, bot, -w / 2, bot - r);
      ctx.closePath();
    },
    visor: [0, 0.1, 0.72, 0.5], top: -0.5,
  },
  round: { path(ctx, w, h) { ell(ctx, 0, 0, w / 2, h / 2); }, visor: [0, 0.05, 0.7, 0.52], top: -0.5 },
  box: { path(ctx, w, h) { rrect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.32); }, visor: [0, 0.03, 0.76, 0.58], top: -0.5 },
  drop: {
    path(ctx, w, h) {
      const tip = -h / 2 - h * 0.16;
      ctx.moveTo(0, tip);
      ctx.bezierCurveTo(w * 0.14, -h * 0.4, w / 2, -h * 0.12, w / 2, h * 0.12);
      ctx.bezierCurveTo(w / 2, h * 0.42, w * 0.27, h / 2, 0, h / 2);
      ctx.bezierCurveTo(-w * 0.27, h / 2, -w / 2, h * 0.42, -w / 2, h * 0.12);
      ctx.bezierCurveTo(-w / 2, -h * 0.12, -w * 0.14, -h * 0.4, 0, tip);
      ctx.closePath();
    },
    visor: [0, 0.16, 0.66, 0.44], top: -0.66,
  },
  gem: {
    path(ctx, w, h) {
      const p = [[-0.3, -0.5], [0.3, -0.5], [0.5, -0.1], [0.42, 0.36], [0.2, 0.5], [-0.2, 0.5], [-0.42, 0.36], [-0.5, -0.1]];
      p.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
      ctx.closePath();
    },
    visor: [0, 0.06, 0.66, 0.46], top: -0.5,
  },
  pot: {
    path(ctx, w, h) {
      rrect(ctx, -w / 2, -h / 2, w, h * 0.28, h * 0.1);
      const t = -h / 2 + h * 0.2, b = h / 2, r = h * 0.16;
      ctx.moveTo(-w * 0.45, t);
      ctx.lineTo(w * 0.45, t);
      ctx.lineTo(w * 0.38, b - r);
      ctx.quadraticCurveTo(w * 0.37, b, w * 0.38 - r, b);
      ctx.lineTo(-w * 0.38 + r, b);
      ctx.quadraticCurveTo(-w * 0.37, b, -w * 0.38, b - r);
      ctx.closePath();
    },
    visor: [0, 0.16, 0.6, 0.44], top: -0.5,
  },
  cloud: {
    path(ctx, w, h) {
      rrect(ctx, -w / 2, -h * 0.12, w, h * 0.62, h * 0.3);
      circ(ctx, -w * 0.27, -h * 0.08, h * 0.3);
      circ(ctx, w * 0.02, -h * 0.2, h * 0.36);
      circ(ctx, w * 0.29, -h * 0.05, h * 0.27);
    },
    visor: [0, 0.16, 0.7, 0.42], top: -0.5,
  },
};

const GEO = {
  footW: 0.23, footH: 0.1, spread: 0.13, hipX: 0.085, hipY: -0.31, l1: 0.145, l2: 0.145,
  bodyRX: 0.205, bodyRY: 0.172, bodyCY: -0.11, neckBase: -0.24, neckLen: 0.1,
};

function defaultPose() {
  return {
    x: 0, y: 0, px: 140, z: 0, alpha: 1, t: 0,
    roll: 0, pivotX: 0, pivotY: 0, spin: 1,
    tilt: 0, crouch: 0, sit: 0, sqx: 1, sqy: 1, breath: 0,
    headX: 0, headY: 0, headRot: 0, turn: 0, neck: 0,
    lookX: 0, lookY: 0, expr: 'normal', blink: 0, bill: 0, blush: 0,
    wing: 0, ant: 0, prop: 0, beat: 0,
    feet: [{ x: -GEO.spread, y: 0, lift: 0, rot: 0 }, { x: GEO.spread, y: 0, lift: 0, rot: 0 }],
    battery: 0.8, dirt: 0, foam: null, hat: null, shadow: true, glow: 0, zap: 0,
  };
}

function legIK(hx, hy, ax, ay, l1, l2, outward) {
  let dx = ax - hx, dy = ay - hy;
  let d = Math.hypot(dx, dy) || 1e-4;
  const maxd = (l1 + l2) * 0.995;
  if (d > maxd) { ax = hx + (dx / d) * maxd; ay = hy + (dy / d) * maxd; dx = ax - hx; dy = ay - hy; d = maxd; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = hx + (dx / d) * a, my = hy + (dy / d) * a;
  let px = -dy / d, py = dx / d;
  if (px * outward < 0) { px = -px; py = -py; }
  return { kx: mx + px * h, ky: my + py * h, ax, ay };
}

function shadeFill(ctx, col, y0, y1, amt = 1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighten(col, 0.28 * amt));
  g.addColorStop(0.45, col);
  g.addColorStop(1, darken(col, 0.22 * amt));
  return g;
}

// ===================== main entry =====================
function drawRobot(ctx, def, P) {
  const c = def.col;
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.scale(P.px, P.px);
  ctx.globalAlpha = P.alpha;
  const lw = 0.016;

  // ground shadow (not lifted)
  if (P.shadow) {
    const zf = clamp(1 - P.z * 0.9, 0.35, 1);
    ctx.fillStyle = 'rgba(40,20,60,0.22)';
    ctx.beginPath();
    ell(ctx, P.roll * 0.35, 0.01, 0.34 * zf * (1 + Math.abs(P.roll) * 0.6), 0.07 * zf);
    ctx.fill();
  }

  ctx.translate(0, -P.z);
  // whole-body roll (falls, dangling) around a pivot
  if (P.roll) {
    ctx.translate(P.pivotX, P.pivotY);
    ctx.rotate(P.roll);
    ctx.translate(-P.pivotX, -P.pivotY);
  }
  if (P.spin !== 1) ctx.scale(P.spin, 1);

  const hipY = GEO.hipY + P.crouch * 0.1 + P.sit * 0.17;
  const ct = Math.cos(P.tilt), st = Math.sin(P.tilt);
  const toLocal = (bx, by) => [bx * ct - by * st, hipY + bx * st + by * ct]; // body frame -> local

  // ---------- wings (behind body) ----------
  const bodyFrame = () => { ctx.translate(0, hipY); ctx.rotate(P.tilt); ctx.scale(P.sqx, P.sqy); };
  ctx.save();
  bodyFrame();
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 0.165, GEO.bodyCY - 0.03);
    ctx.rotate(s * (0.35 + P.wing));
    ctx.beginPath();
    ell(ctx, s * 0.05, 0.03, 0.06, 0.095);
    fillOutlined(ctx, shadeFill(ctx, c.shell2, -0.06, 0.12), darken(c.shell2, 0.5), lw);
    ctx.restore();
  }
  ctx.restore();

  // ---------- legs & feet ----------
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1;
    const f = P.feet[i];
    const [hx, hy] = toLocal(s * GEO.hipX * P.sqx, 0);
    const ax = f.x, ay = f.y - f.lift - 0.06;
    const k = legIK(hx, hy, ax, ay, GEO.l1, GEO.l2, s);
    ctx.lineCap = 'round';
    ctx.strokeStyle = darken(c.limb, 0.5);
    ctx.lineWidth = 0.075 + lw * 2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(k.kx, k.ky); ctx.lineTo(k.ax, k.ay); ctx.stroke();
    ctx.strokeStyle = c.limb;
    ctx.lineWidth = 0.075;
    ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(hx - s * 0.012, hy); ctx.lineTo(k.kx - s * 0.015, k.ky); ctx.lineTo(k.ax - s * 0.012, k.ay); ctx.stroke();
    // knee
    ctx.beginPath(); circ(ctx, k.kx, k.ky, 0.042);
    fillOutlined(ctx, lighten(c.limb, 0.25), darken(c.limb, 0.5), lw);
    // foot (soft shoe, toes slightly out like a duckling)
    ctx.save();
    ctx.translate(k.ax, k.ay + 0.06 - 0.05);
    ctx.rotate(s * 0.1 + f.rot);
    const fw = GEO.footW, fh = GEO.footH;
    ctx.beginPath(); rrect(ctx, -fw / 2, -fh / 2, fw, fh, fh * 0.48);
    fillOutlined(ctx, shadeFill(ctx, c.foot, -fh / 2, fh / 2), darken(c.foot, 0.5), lw);
    ctx.save(); ctx.clip();
    ctx.fillStyle = darken(c.foot, 0.3);
    ctx.fillRect(-fw / 2, fh * 0.2, fw, fh);
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.beginPath(); ell(ctx, -fw * 0.12, -fh * 0.22, fw * 0.24, fh * 0.14); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ---------- body ----------
  ctx.save();
  bodyFrame();
  const br = GEO.bodyRX, bry = GEO.bodyRY * (1 + P.breath * 0.03), bcy = GEO.bodyCY;
  ctx.beginPath();
  // egg: a bit wider at the bottom
  ctx.moveTo(0, bcy - bry);
  ctx.bezierCurveTo(br * 0.75, bcy - bry, br, bcy - bry * 0.2, br, bcy + bry * 0.25);
  ctx.bezierCurveTo(br, bcy + bry * 0.85, br * 0.5, bcy + bry, 0, bcy + bry);
  ctx.bezierCurveTo(-br * 0.5, bcy + bry, -br, bcy + bry * 0.85, -br, bcy + bry * 0.25);
  ctx.bezierCurveTo(-br, bcy - bry * 0.2, -br * 0.75, bcy - bry, 0, bcy - bry);
  ctx.closePath();
  const bodyCol = def.deco === 'chrome' ? c.body : c.body;
  fillOutlined(ctx, shadeFill(ctx, bodyCol, bcy - bry, bcy + bry), darken(bodyCol, 0.5), lw);
  ctx.save();
  ctx.clip();
  if (def.deco === 'hazard') {
    ctx.fillStyle = c.shell2;
    for (let i = -6; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 0.07, bcy + 0.06); ctx.lineTo(i * 0.07 + 0.035, bcy + 0.06);
      ctx.lineTo(i * 0.07 + 0.085, bcy + 0.2); ctx.lineTo(i * 0.07 + 0.05, bcy + 0.2); ctx.closePath(); ctx.fill();
    }
  }
  if (def.deco === 'bee') {
    ctx.fillStyle = c.shell2;
    ctx.fillRect(-0.3, bcy + 0.02, 0.6, 0.045);
    ctx.fillRect(-0.3, bcy + 0.1, 0.6, 0.045);
  }
  ctx.fillStyle = rgba('#ffffff', 0.35);
  ctx.beginPath(); ell(ctx, -br * 0.42, bcy - bry * 0.45, br * 0.3, bry * 0.22, -0.4); ctx.fill();
  ctx.restore();
  // belly panel with battery bars (diegetic energy meter)
  const tx = P.turn * 0.035;
  ctx.beginPath(); rrect(ctx, tx - 0.085, bcy - 0.035, 0.17, 0.1, 0.035);
  ctx.fillStyle = rgba(darken(c.visor, 0.1), 0.92); ctx.fill();
  ctx.lineWidth = lw * 0.8; ctx.strokeStyle = rgba('#ffffff', 0.25); ctx.stroke();
  const bars = Math.max(0, Math.ceil(P.battery * 3 - 0.001));
  const bcol = P.battery > 0.5 ? '#6BFF8E' : P.battery > 0.22 ? '#FFD54A' : '#FF5D5D';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); rrect(ctx, tx - 0.06 + i * 0.043, bcy - 0.012, 0.032, 0.054, 0.01);
    if (i < bars) { ctx.shadowColor = bcol; ctx.shadowBlur = 0.04 * P.px * DPR; ctx.fillStyle = bcol; }
    else { ctx.shadowBlur = 0; ctx.fillStyle = rgba('#ffffff', 0.08); }
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ---------- neck ----------
  const neckTop = GEO.neckBase - GEO.neckLen - P.neck * 0.07;
  const hcx = P.headX + P.turn * 0.01, hBottom = neckTop + P.headY;
  ctx.lineCap = 'round';
  ctx.strokeStyle = darken(c.limb, 0.5); ctx.lineWidth = 0.07 + lw * 2;
  ctx.beginPath(); ctx.moveTo(0, GEO.neckBase + 0.02); ctx.lineTo(hcx, hBottom + 0.02); ctx.stroke();
  ctx.strokeStyle = c.limb; ctx.lineWidth = 0.07; ctx.stroke();
  for (const f of [0.35, 0.7]) {
    ctx.beginPath(); ell(ctx, lerp(0, hcx, f), lerp(GEO.neckBase, hBottom, f), 0.048, 0.018);
    fillOutlined(ctx, lighten(c.limb, 0.3), darken(c.limb, 0.5), lw * 0.7);
  }

  // ---------- head ----------
  const hw = def.head.w, hh = def.head.h;
  ctx.translate(hcx, hBottom - hh / 2);
  ctx.rotate(P.headRot);
  drawHead(ctx, def, P, hw, hh, lw);
  ctx.restore();
  ctx.restore();
}

// ===================== head =====================
function drawHead(ctx, def, P, w, h, lw) {
  const c = def.col, sh = HEAD_SHAPES[def.head.shape], t = P.t;
  const turn = P.turn;
  const topY = sh.top * h;
  const ax = turn * 0.04;

  // --- back layer ---
  if (def.deco === 'saturn') drawRing(ctx, def, w, h, lw, true);
  if (def.topper === 'bunny') {
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * w * 0.2 + ax, topY + h * 0.12);
      ctx.rotate(s * 0.28 + P.ant * 1.3 + s * Math.sin(t * 2.1) * 0.03);
      ctx.beginPath(); ell(ctx, 0, -0.13, 0.075, 0.17);
      fillOutlined(ctx, shadeFill(ctx, c.shell2, -0.3, 0.02), darken(c.shell2, 0.5), lw);
      ctx.beginPath(); ell(ctx, 0, -0.12, 0.038, 0.12); ctx.fillStyle = lighten(c.cheek, 0.25); ctx.fill();
      ctx.restore();
    }
  }
  if (def.topper === 'flame') drawFlame(ctx, ax - w * 0.08, topY + 0.04, t, P);
  if (def.deco === 'bee') {
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * w * 0.3, topY + h * 0.18);
      ctx.rotate(s * (0.5 + Math.sin(t * 40) * 0.25));
      ctx.beginPath(); ell(ctx, s * 0.1, -0.08, 0.13, 0.08, s * 0.3);
      ctx.fillStyle = 'rgba(230,248,255,0.55)'; ctx.fill();
      ctx.lineWidth = lw * 0.8; ctx.strokeStyle = 'rgba(80,110,140,0.6)'; ctx.stroke();
      ctx.restore();
    }
  }

  // --- shell ---
  ctx.beginPath(); sh.path(ctx, w, h);
  const glass = def.deco === 'glass';
  let fill;
  if (def.deco === 'chrome') {
    fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fill.addColorStop(0, '#FFFFFF'); fill.addColorStop(0.3, '#B9C6D8'); fill.addColorStop(0.48, '#F4F8FF');
    fill.addColorStop(0.62, '#8E9CB3'); fill.addColorStop(1, '#E6EEF8');
  } else if (def.deco === 'facets') {
    fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fill.addColorStop(0, '#FFE3F6'); fill.addColorStop(0.35, '#D6CCFF'); fill.addColorStop(0.65, '#C8F0FF'); fill.addColorStop(1, '#FFF4C9');
  } else fill = shadeFill(ctx, c.shell, -h / 2, h / 2);
  if (glass) {
    ctx.save(); ctx.globalAlpha *= 0.62;
    fillOutlined(ctx, fill, darken(c.shell, 0.45), lw);
    ctx.restore();
  } else fillOutlined(ctx, fill, darken(def.deco === 'chrome' ? '#8E9CB3' : c.shell, 0.5), lw);

  // --- surface deco & shading inside the head ---
  ctx.save();
  ctx.beginPath(); sh.path(ctx, w, h); ctx.clip();
  drawHeadDeco(ctx, def, P, w, h, lw);
  // soft top-left light & bottom occlusion
  ctx.fillStyle = rgba('#ffffff', glass ? 0.45 : 0.3);
  ctx.beginPath(); ell(ctx, -w * 0.2, -h * 0.3, w * 0.24, h * 0.12, -0.25); ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.75);
  ctx.beginPath(); ell(ctx, -w * 0.28, -h * 0.33, w * 0.06, h * 0.035, -0.4); ctx.fill();

  // --- visor screen ---
  const [vcx, vcy, vwf, vhf] = sh.visor;
  const vw = w * vwf * (1 - Math.abs(turn) * 0.08), vh = h * vhf;
  const vx = vcx * w + turn * w * 0.13, vy = vcy * h;
  const lit = def.deco === 'lantern';
  ctx.beginPath(); rrect(ctx, vx - vw / 2, vy - vh / 2, vw, vh, vh * 0.42);
  let vg = ctx.createLinearGradient(0, vy - vh / 2, 0, vy + vh / 2);
  if (lit) {
    const k = 0.75 + P.glow * 0.25 + Math.sin(t * 3) * 0.04;
    vg.addColorStop(0, mix('#FFF0B8', '#FFFFFF', 0.1 * k)); vg.addColorStop(1, mix('#FFB347', '#FF8A2B', 0.3));
  } else { vg.addColorStop(0, lighten(c.visor, 0.12)); vg.addColorStop(1, darken(c.visor, 0.25)); }
  ctx.fillStyle = vg; ctx.fill();
  ctx.lineWidth = lw * 1.2; ctx.strokeStyle = lit ? darken(c.shell, 0.4) : rgba('#000000', 0.35); ctx.stroke();
  ctx.save();
  ctx.clip();
  const sk = P.screenK || 0;
  if (sk > 0 && P.screen) {
    ctx.save(); ctx.globalAlpha *= sk;
    const ih = vh * 0.92, iw = (ih * P.screen.width) / P.screen.height;
    ctx.drawImage(P.screen, vx - iw / 2, vy - ih / 2, iw, ih);
    ctx.restore();
  }
  if (sk < 1) { ctx.save(); ctx.globalAlpha *= 1 - sk; drawFace(ctx, def, P, vx, vy, vw, vh, lit); ctx.restore(); }
  // glass reflection on the screen
  ctx.fillStyle = rgba('#ffffff', 0.09);
  ctx.beginPath();
  ctx.moveTo(vx - vw * 0.5, vy - vh * 0.5); ctx.lineTo(vx - vw * 0.12, vy - vh * 0.5);
  ctx.lineTo(vx - vw * 0.42, vy + vh * 0.5); ctx.lineTo(vx - vw * 0.62, vy + vh * 0.5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();

  // --- bill (duck beak, Microduck DNA) ---
  if (def.bill) drawBill(ctx, def, P, w, h, lw);

  // --- front layer: toppers, ring, glass domes, hats, dirt ---
  if (def.deco === 'saturn') drawRing(ctx, def, w, h, lw, false);
  if (def.deco === 'fishbowl' || def.deco === 'helmet') drawGlassDome(ctx, def, w, h, lw);
  drawTopper(ctx, def, P, w, h, lw, ax, topY);
  if (P.hat) drawHat(ctx, P.hat, P, w, h, lw, ax, topY);
  if (P.dirt > 0.02) drawDirt(ctx, def, P, w, h);
  if (P.foam) for (const b of P.foam) {
    ctx.beginPath(); circ(ctx, b.x * w, b.y * h, b.r);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
    ctx.lineWidth = 0.006; ctx.strokeStyle = 'rgba(150,190,230,0.8)'; ctx.stroke();
    ctx.fillStyle = 'rgba(190,225,255,0.7)';
    ctx.beginPath(); circ(ctx, b.x * w + b.r * 0.3, b.y * h + b.r * 0.3, b.r * 0.35); ctx.fill();
  }
  if (P.zap > 0) {
    ctx.strokeStyle = rgba('#FFF27A', P.zap); ctx.lineWidth = 0.02; ctx.shadowColor = '#FFE14A'; ctx.shadowBlur = 0.1 * P.px * DPR;
    for (let i = 0; i < 4; i++) {
      const a = rand(TAU), r0 = w * 0.55;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.7);
      ctx.lineTo(Math.cos(a) * (r0 + 0.08) + rand(-0.04, 0.04), Math.sin(a) * (r0 + 0.08) * 0.7);
      ctx.lineTo(Math.cos(a) * (r0 + 0.16), Math.sin(a) * (r0 + 0.16) * 0.7); ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
}

function drawHeadDeco(ctx, def, P, w, h, lw) {
  const c = def.col, t = P.t;
  switch (def.deco) {
    case 'rivets': {
      ctx.fillStyle = darken(c.shell, 0.25);
      const pts = def.head.shape === 'box'
        ? [[-0.42, -0.36], [0.42, -0.36], [-0.42, 0.36], [0.42, 0.36]]
        : [[-0.44, 0.0], [0.44, 0.0], [-0.3, -0.36], [0.3, -0.36], [0, -0.45]];
      for (const [x, y] of pts) {
        ctx.beginPath(); circ(ctx, x * w, y * h, 0.022); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.55); ctx.beginPath(); circ(ctx, x * w - 0.006, y * h - 0.007, 0.008); ctx.fill();
        ctx.fillStyle = darken(c.shell, 0.25);
      }
      break;
    }
    case 'glass': {
      // bubbles inside the drop
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.25 + i * 0.37) % 1;
        const x = Math.sin(i * 12.9 + t * 1.3) * w * 0.3, y = h * 0.4 - ph * h * 1.0;
        ctx.beginPath(); circ(ctx, x, y, 0.012 + (i % 3) * 0.008);
        ctx.strokeStyle = rgba('#ffffff', 0.8 * (1 - ph)); ctx.lineWidth = 0.006; ctx.stroke();
      }
      break;
    }
    case 'band': {
      ctx.fillStyle = c.shell2;
      ctx.fillRect(-w, -h * 0.34, w * 2, h * 0.11);
      ctx.fillStyle = rgba('#ffffff', 0.45);
      for (let i = -5; i <= 5; i++) { ctx.beginPath(); circ(ctx, i * 0.09 + ((t * 0.2) % 0.09), -h * 0.285, 0.014); ctx.fill(); }
      break;
    }
    case 'lantern': {
      ctx.fillStyle = darken(c.shell, 0.25);
      ctx.fillRect(-w, -h * 0.5, w * 2, h * 0.12);
      ctx.fillRect(-w, h * 0.38, w * 2, h * 0.12);
      break;
    }
    case 'tape': {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); rrect(ctx, -w * 0.3 + i * w * 0.155, -h * 0.5 + 0.005, w * 0.12, h * 0.1, 0.02);
        ctx.fillStyle = i === 1 ? '#FF5E7E' : c.shell2; ctx.fill();
      }
      break;
    }
    case 'stars': {
      for (let i = 0; i < 9; i++) {
        const x = Math.sin(i * 7.7) * w * 0.42, y = -h * 0.42 + Math.abs(Math.cos(i * 3.1)) * h * 0.35;
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 2);
        ctx.fillStyle = rgba('#FFE7A0', tw);
        ctx.beginPath(); starPath(ctx, x, y, 0.022 * tw + 0.008, 0.009, 4); ctx.fill();
      }
      break;
    }
    case 'disco': {
      const n = 9, sz = w / n;
      for (let ix = -n; ix <= n; ix++) for (let iy = -n; iy <= n; iy++) {
        const x = ix * sz, y = iy * sz * 0.9;
        const k = (Math.sin(ix * 12.3 + iy * 7.1) + 1) / 2;
        const tw = Math.max(0, Math.sin(t * 4 + ix * 1.7 + iy * 2.3));
        ctx.fillStyle = mix(mix('#9AA6C8', '#FFFFFF', k), '#FF9AD5', tw * tw * 0.6);
        ctx.fillRect(x - sz / 2 + 0.004, y - sz * 0.45 + 0.004, sz - 0.008, sz * 0.9 - 0.008);
      }
      break;
    }
    case 'facets': {
      ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 0.008;
      ctx.beginPath();
      ctx.moveTo(-0.3 * w, -0.5 * h); ctx.lineTo(-0.15 * w, -0.25 * h); ctx.lineTo(0.15 * w, -0.25 * h); ctx.lineTo(0.3 * w, -0.5 * h);
      ctx.moveTo(-0.15 * w, -0.25 * h); ctx.lineTo(-0.5 * w, -0.1 * h);
      ctx.moveTo(0.15 * w, -0.25 * h); ctx.lineTo(0.5 * w, -0.1 * h);
      ctx.stroke();
      const sx = ((t * 0.3) % 2) - 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(sx * w, -h); ctx.lineTo(sx * w + 0.06, -h); ctx.lineTo(sx * w - 0.2, h); ctx.lineTo(sx * w - 0.26, h); ctx.fill();
      break;
    }
    case 'bee': {
      ctx.strokeStyle = c.shell2; ctx.lineWidth = h * 0.1;
      for (const k of [0.62, 0.92]) { ctx.beginPath(); ctx.ellipse(0, h * 0.35, w * 0.6 * k + 0.1, h * 0.95 * k, 0, Math.PI, TAU); ctx.stroke(); }
      break;
    }
    case 'chrome': {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.moveTo(w * 0.1, -h); ctx.lineTo(w * 0.2, -h); ctx.lineTo(w * 0.05, h); ctx.lineTo(-w * 0.05, h); ctx.fill();
      break;
    }
    case 'helmet': {
      ctx.fillStyle = c.shell2;
      ctx.fillRect(-w, h * 0.36, w * 2, h * 0.2);
      break;
    }
    case 'fishbowl': {
      ctx.fillStyle = c.shell2;
      ctx.fillRect(-w, h * 0.38, w * 2, h * 0.16);
      break;
    }
  }
  if (def.head.shape === 'pot') {
    ctx.fillStyle = '#6B4A35';
    ctx.beginPath(); ell(ctx, 0, -h * 0.44, w * 0.42, h * 0.06); ctx.fill();
  }
  if (def.head.shape === 'gem') {
    ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.lineWidth = 0.006;
  }
}

function drawFace(ctx, def, P, vx, vy, vw, vh, lit) {
  const c = def.col;
  const eyeCol = lit ? '#5A3410' : c.eye;
  const glow = lit ? 0 : 0.06 * P.px * DPR;
  const lx = P.lookX * vw * 0.11, ly = P.lookY * vh * 0.13;
  const expr = P.expr;
  ctx.fillStyle = eyeCol; ctx.strokeStyle = eyeCol;
  ctx.shadowColor = eyeCol; ctx.shadowBlur = glow;
  if (def.eyes === 'mono') {
    drawEye(ctx, expr, vx + lx * 0.8, vy - vh * 0.02 + ly, vw * 0.2, vh * 0.66, 1, P, eyeCol, true);
  } else {
    const ex = vw * 0.22, ew = vw * 0.135, eh = vh * 0.48;
    drawEye(ctx, expr, vx - ex + lx, vy - vh * 0.04 + ly, ew, eh, -1, P, eyeCol, false);
    drawEye(ctx, expr, vx + ex + lx, vy - vh * 0.04 + ly, ew, eh, 1, P, eyeCol, false);
  }
  // screen mouth for robots without a bill
  if (!def.bill) {
    const mx = vx + lx * 0.5, my = vy + vh * 0.3 + ly * 0.3;
    ctx.lineCap = 'round'; ctx.lineWidth = vh * 0.07;
    ctx.beginPath();
    if (P.bill > 0.12 || expr === 'surprised') {
      const o = Math.max(P.bill, expr === 'surprised' ? 0.35 : 0);
      ell(ctx, mx, my, vw * (0.04 + o * 0.03), vh * (0.03 + o * 0.11)); ctx.fill();
    } else if (expr === 'sad' || expr === 'grumpy') {
      ctx.arc(mx, my + vh * 0.1, vw * 0.07, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    } else if (expr === 'happy' || expr === 'love' || expr === 'star') {
      ctx.moveTo(mx - vw * 0.08, my - vh * 0.02); ctx.quadraticCurveTo(mx, my + vh * 0.16, mx + vw * 0.08, my - vh * 0.02); ctx.closePath(); ctx.fill();
    } else if (expr === 'closed' || expr === 'sleepy') {
      ctx.moveTo(mx - vw * 0.025, my); ctx.lineTo(mx + vw * 0.025, my); ctx.stroke();
    } else {
      ctx.arc(mx, my - vh * 0.05, vw * 0.06, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  // blush
  if (P.blush > 0.02) {
    ctx.fillStyle = rgba(c.cheek, 0.55 * P.blush);
    for (const s of [-1, 1]) { ctx.beginPath(); ell(ctx, vx + s * vw * 0.36 + lx * 0.6, vy + vh * 0.22, vw * 0.075, vh * 0.08); ctx.fill(); }
  }
}

function drawEye(ctx, expr, cx, cy, ew, eh, side, P, col, mono) {
  const t = P.t;
  ctx.lineCap = 'round';
  const thick = Math.min(ew, eh) * (mono ? 0.32 : 0.55);
  switch (expr) {
    case 'happy': case 'giggle':
      ctx.lineWidth = thick; ctx.beginPath();
      ctx.arc(cx, cy + eh * 0.18, ew * 0.62, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); return;
    case 'closed':
      ctx.lineWidth = thick * 0.8; ctx.beginPath();
      ctx.arc(cx, cy - eh * 0.08, ew * 0.6, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); return;
    case 'squint':
      ctx.lineWidth = thick * 0.8; ctx.beginPath();
      ctx.moveTo(cx + side * ew * 0.55, cy - eh * 0.25); ctx.lineTo(cx - side * ew * 0.45, cy); ctx.lineTo(cx + side * ew * 0.55, cy + eh * 0.25); ctx.stroke(); return;
    case 'love': {
      const s = ew * 1.05 * (1 + Math.sin(t * 8) * 0.08);
      ctx.beginPath(); heartPath(ctx, cx, cy + s * 0.15, s); ctx.fill(); return;
    }
    case 'star': {
      ctx.beginPath(); starPath(ctx, cx, cy, ew * 1.05, ew * 0.45, 5, -Math.PI / 2 + Math.sin(t * 5) * 0.2); ctx.fill(); return;
    }
    case 'dizzy': {
      ctx.lineWidth = thick * 0.45; ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = i * 0.45 + t * 9 * side, r = (i / 28) * ew * 0.9;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); return;
    }
    case 'surprised': {
      ctx.beginPath(); circ(ctx, cx, cy, ew * 0.82); ctx.fill();
      ctx.save(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(10,14,30,0.85)'; ctx.beginPath(); circ(ctx, cx + side * ew * 0.08, cy + ew * 0.05, ew * 0.38); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); circ(ctx, cx - ew * 0.2, cy - ew * 0.25, ew * 0.16); ctx.fill();
      ctx.restore(); return;
    }
  }
  // lidded oval (normal / sleepy / sad / grumpy / blink)
  let i0 = -0.62, o0 = -0.62; // lid heights at inner/outer corner (fraction of eh from centre)
  if (expr === 'sleepy') { i0 = o0 = -0.05; }
  else if (expr === 'sad') { i0 = -0.62; o0 = -0.1; }
  else if (expr === 'grumpy') { i0 = -0.05; o0 = -0.58; }
  else if (expr === 'look') { i0 = o0 = -0.3; }
  const b = P.blink;
  i0 = lerp(i0, 0.5, b); o0 = lerp(o0, 0.5, b);
  if (b > 0.9 && expr !== 'sleepy') {
    ctx.beginPath(); rrect(ctx, cx - ew * 0.5, cy + eh * 0.28, ew, eh * 0.09, eh * 0.04); ctx.fill(); return;
  }
  const inner = cx - side * ew * 1.3, outer = cx + side * ew * 1.3;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(inner, cy + i0 * eh); ctx.lineTo(outer, cy + o0 * eh);
  ctx.lineTo(outer, cy + eh); ctx.lineTo(inner, cy + eh); ctx.closePath();
  ctx.clip();
  ctx.beginPath(); ell(ctx, cx, cy, ew / 2 * (mono ? 1.5 : 1), eh / 2); ctx.fill();
  if (mono) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10,12,24,0.75)'; ctx.beginPath(); circ(ctx, cx, cy, ew * 0.38); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); circ(ctx, cx, cy, ew * 0.2); ctx.fill();
  }
  // sparkle highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); circ(ctx, cx - ew * 0.16, cy - eh * 0.2, Math.min(ew, eh) * 0.16); ctx.fill();
  ctx.restore();
  ctx.fillStyle = col;
}

function drawBill(ctx, def, P, w, h, lw) {
  const c = def.col;
  const shift = P.turn * w * 0.11;
  const bw = w * 0.84 * (1 - Math.abs(P.turn) * 0.06), bh = h * 0.17;
  const by = h * 0.5 - bh * 0.5;
  const open = P.bill;
  // lower jaw drops down; dark mouth with a pink tongue shows in the gap
  const jawH = bh * 0.7, jawY = by + bh * 0.42 + open * h * 0.3;
  if (open > 0.03) {
    ctx.beginPath(); rrect(ctx, shift - bw * 0.33, by + bh * 0.5, bw * 0.66, jawY - by - bh * 0.5 + jawH * 0.6, bh * 0.5);
    ctx.fillStyle = '#2A1020'; ctx.fill();
    ctx.fillStyle = '#FF7FA0';
    ctx.beginPath(); ell(ctx, shift, jawY + jawH * 0.05, bw * 0.16, Math.min(bh * 0.3, open * h * 0.12 + 0.01)); ctx.fill();
  }
  ctx.beginPath(); rrect(ctx, shift - bw * 0.34, jawY, bw * 0.68, jawH, jawH * 0.5);
  fillOutlined(ctx, shadeFill(ctx, darken(c.shell2, 0.08), jawY, jawY + jawH), darken(c.shell2, 0.5), lw);
  // upper bill
  ctx.beginPath(); rrect(ctx, shift - bw / 2, by, bw, bh, bh * 0.46);
  fillOutlined(ctx, shadeFill(ctx, c.shell2, by, by + bh), darken(c.shell2, 0.5), lw);
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.beginPath(); rrect(ctx, shift - bw * 0.38, by + bh * 0.14, bw * 0.5, bh * 0.2, bh * 0.1); ctx.fill();
  ctx.fillStyle = darken(c.shell2, 0.45);
  for (const s of [-1, 1]) { ctx.beginPath(); ell(ctx, shift + s * bw * 0.1, by + bh * 0.52, bw * 0.022, bh * 0.1); ctx.fill(); }
}

function drawRing(ctx, def, w, h, lw, back) {
  ctx.save();
  ctx.rotate(-0.2);
  ctx.beginPath();
  ctx.ellipse(0, h * 0.06, w * 0.78, h * 0.17, 0, back ? Math.PI : 0, back ? TAU : Math.PI);
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.07 + lw * 2; ctx.strokeStyle = darken(def.col.shell2, 0.5); ctx.stroke();
  ctx.lineWidth = 0.07; ctx.strokeStyle = def.col.shell2; ctx.stroke();
  ctx.lineWidth = 0.018; ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.stroke();
  ctx.restore();
}

function drawGlassDome(ctx, def, w, h, lw) {
  ctx.beginPath();
  if (def.deco === 'fishbowl') ell(ctx, 0, -h * 0.02, w * 0.56, h * 0.56);
  else ell(ctx, 0, -h * 0.02, w * 0.54, h * 0.55);
  ctx.fillStyle = 'rgba(220,240,255,0.14)'; ctx.fill();
  ctx.lineWidth = 0.014; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke();
  ctx.lineWidth = 0.03; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(0, -h * 0.02, w * 0.46, h * 0.46, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
}

function drawFlame(ctx, x, y, t, P) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5 + P.ant * 0.6);
  const f = 1 + Math.sin(t * 17) * 0.08 + Math.sin(t * 29) * 0.05;
  const g = ctx.createLinearGradient(0, 0, 0, -0.32 * f);
  g.addColorStop(0, '#FF6A2B'); g.addColorStop(0.6, '#FFB938'); g.addColorStop(1, '#FFF3A0');
  ctx.shadowColor = '#FF9A2B'; ctx.shadowBlur = 0.12 * P.px * DPR;
  ctx.beginPath();
  ctx.moveTo(-0.09, 0);
  ctx.bezierCurveTo(-0.12, -0.12 * f, -0.02, -0.18 * f, 0.02 * Math.sin(t * 11), -0.34 * f);
  ctx.bezierCurveTo(0.05, -0.2 * f, 0.13, -0.12 * f, 0.09, 0);
  ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

function drawTopper(ctx, def, P, w, h, lw, ax, topY) {
  const c = def.col, t = P.t;
  const tp = def.topper;
  ctx.save();
  ctx.translate(ax, topY);
  const stem = (len, tipFn) => {
    const a = P.ant;
    const tx = Math.sin(a) * len, ty = -Math.cos(a) * len;
    ctx.lineCap = 'round';
    ctx.strokeStyle = darken(c.limb, 0.5); ctx.lineWidth = 0.03 + lw * 2;
    ctx.beginPath(); ctx.moveTo(0, 0.02); ctx.quadraticCurveTo(0, -len * 0.5, tx, ty); ctx.stroke();
    ctx.strokeStyle = c.limb; ctx.lineWidth = 0.03; ctx.stroke();
    ctx.beginPath(); rrect(ctx, -0.045, -0.02, 0.09, 0.04, 0.015); fillOutlined(ctx, c.limb, darken(c.limb, 0.5), lw * 0.7);
    tipFn(tx, ty);
  };
  switch (tp) {
    case 'antenna':
      stem(0.2, (x, y) => {
        ctx.beginPath(); circ(ctx, x, y, 0.052);
        fillOutlined(ctx, shadeFill(ctx, c.shell2, y - 0.05, y + 0.05), darken(c.shell2, 0.5), lw);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); circ(ctx, x - 0.016, y - 0.016, 0.015); ctx.fill();
      });
      break;
    case 'star':
      stem(0.2, (x, y) => {
        ctx.shadowColor = '#FFE36B'; ctx.shadowBlur = 0.08 * P.px * DPR;
        ctx.beginPath(); starPath(ctx, x, y, 0.07, 0.032, 5, -Math.PI / 2 + P.ant);
        ctx.fillStyle = '#FFE36B'; ctx.fill(); ctx.shadowBlur = 0;
      });
      break;
    case 'springs':
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * w * 0.2, h * 0.05);
        const a = P.ant * (1 + s * 0.3) + Math.sin(t * 3 + s) * 0.05;
        ctx.rotate(a + s * 0.15);
        ctx.strokeStyle = '#B97A3C'; ctx.lineWidth = 0.014;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const yy = -i * 0.0055, xx = Math.sin(i * 0.9) * 0.028;
          i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
        ctx.beginPath(); circ(ctx, 0, -0.24, 0.045);
        fillOutlined(ctx, shadeFill(ctx, c.shell2, -0.29, -0.2), darken(c.shell2, 0.6), lw);
        ctx.restore();
      }
      break;
    case 'beacon': {
      ctx.beginPath(); rrect(ctx, -0.075, -0.03, 0.15, 0.05, 0.02);
      fillOutlined(ctx, c.shell2, darken(c.shell2, 0.5), lw);
      const on = (Math.sin(t * 5) + 1) / 2;
      ctx.shadowColor = '#FF8A2B'; ctx.shadowBlur = 0.1 * on * P.px * DPR;
      ctx.beginPath(); ctx.arc(0, -0.03, 0.055, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = mix('#FF7A2B', '#FFE08A', on * 0.6); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); circ(ctx, -0.018, -0.055, 0.012); ctx.fill();
      break;
    }
    case 'bolt': {
      ctx.fillStyle = '#9AA4B5';
      ctx.fillRect(-0.022, -0.06, 0.044, 0.08);
      ctx.beginPath(); hexPath(ctx, 0, -0.08, 0.065, 0);
      fillOutlined(ctx, shadeFill(ctx, '#C9D1DE', -0.14, -0.02), '#4E566C', lw);
      ctx.strokeStyle = '#5E6880'; ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.moveTo(-0.035, -0.08); ctx.lineTo(0.035, -0.08); ctx.stroke();
      break;
    }
    case 'nut': {
      ctx.save(); ctx.translate(0, -0.05); ctx.rotate(P.ant * 2 + (P.spin !== 1 ? t * 4 : 0));
      ctx.beginPath(); hexPath(ctx, 0, 0, 0.075, 0);
      fillOutlined(ctx, shadeFill(ctx, c.shell2, -0.07, 0.07), darken(c.shell2, 0.5), lw);
      ctx.beginPath(); circ(ctx, 0, 0, 0.03); ctx.fillStyle = darken(c.shell2, 0.4); ctx.fill();
      ctx.restore();
      break;
    }
    case 'knob':
      stem(0.1, (x, y) => {
        ctx.beginPath(); circ(ctx, x, y, 0.05);
        fillOutlined(ctx, shadeFill(ctx, c.shell2, y - 0.05, y + 0.05), darken(c.shell2, 0.5), lw);
      });
      break;
    case 'handle': {
      ctx.save(); ctx.rotate(P.ant * 0.8);
      ctx.lineCap = 'round';
      ctx.strokeStyle = darken(c.shell, 0.45); ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.arc(0, 0.02, w * 0.24, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = lighten(c.shell, 0.15); ctx.lineWidth = 0.025; ctx.stroke();
      ctx.restore();
      break;
    }
    case 'bubbles': {
      ctx.save(); ctx.translate(w * 0.36, h * 0.12);
      ctx.rotate(0.2 + P.ant * 0.4);
      ctx.lineCap = 'round';
      ctx.strokeStyle = darken(c.shell2, 0.5); ctx.lineWidth = 0.055;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.2); ctx.quadraticCurveTo(0, -0.26, -0.05, -0.26); ctx.stroke();
      ctx.strokeStyle = c.shell2; ctx.lineWidth = 0.035; ctx.stroke();
      ctx.restore();
      break;
    }
    case 'speakers': {
      for (const s of [-1, 1]) {
        const r = 0.12 * (1 + P.beat * 0.12);
        ctx.save(); ctx.translate(s * (w * 0.5 + 0.02), -topY + 0.0);
        ctx.beginPath(); circ(ctx, 0, 0, r);
        fillOutlined(ctx, shadeFill(ctx, c.shell2, -r, r), darken(c.shell2, 0.5), lw);
        ctx.beginPath(); circ(ctx, 0, 0, r * 0.7); ctx.fillStyle = darken(c.limb, 0.2); ctx.fill();
        ctx.strokeStyle = rgba('#ffffff', 0.25); ctx.lineWidth = 0.008;
        for (const k of [0.25, 0.45]) { ctx.beginPath(); circ(ctx, 0, 0, r * k); ctx.stroke(); }
        ctx.restore();
      }
      break;
    }
    case 'sprout': {
      ctx.save(); ctx.translate(0, h * 0.05); ctx.rotate(P.ant * 0.9);
      ctx.strokeStyle = '#3F7A2A'; ctx.lineWidth = 0.022; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.02, -0.1, 0, -0.2); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(0, -0.18); ctx.rotate(s * (0.7 + Math.sin(t * 2 + s) * 0.08));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(s * 0.04, -0.08, s * 0.16, -0.08, s * 0.17, 0); ctx.bezierCurveTo(s * 0.12, 0.04, s * 0.04, 0.03, 0, 0);
        fillOutlined(ctx, shadeFill(ctx, c.shell2, -0.08, 0.03), '#2F5E1E', lw * 0.8);
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case 'lightning': {
      ctx.save(); ctx.translate(w * 0.12, -0.02); ctx.rotate(0.25 + P.ant * 0.5);
      ctx.shadowColor = '#FFE14A'; ctx.shadowBlur = (0.04 + P.zap * 0.1) * P.px * DPR;
      ctx.beginPath();
      ctx.moveTo(0.02, -0.26); ctx.lineTo(-0.08, -0.08); ctx.lineTo(-0.01, -0.08); ctx.lineTo(-0.05, 0.04); ctx.lineTo(0.08, -0.13); ctx.lineTo(0.01, -0.13); ctx.lineTo(0.06, -0.26); ctx.closePath();
      fillOutlined(ctx, '#FFD84A', '#B07A10', lw);
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

function drawHat(ctx, hat, P, w, h, lw, ax, topY) {
  ctx.save();
  ctx.translate(ax, topY + 0.03);
  ctx.rotate(P.ant * 0.25);
  switch (hat) {
    case 'bow': {
      ctx.translate(w * 0.24, 0.02); ctx.rotate(0.3);
      ctx.beginPath(); ell(ctx, -0.07, 0, 0.075, 0.05, -0.3); ell(ctx, 0.07, 0, 0.075, 0.05, 0.3);
      fillOutlined(ctx, '#FF5C9A', '#A02358', lw);
      ctx.beginPath(); circ(ctx, 0, 0, 0.032); fillOutlined(ctx, '#FF8DBA', '#A02358', lw);
      break;
    }
    case 'cap': {
      ctx.beginPath(); ctx.ellipse(0, 0.02, w * 0.32, 0.13, 0, Math.PI, TAU); ctx.closePath();
      fillOutlined(ctx, shadeFill(ctx, '#3F8CFF', -0.12, 0.02), '#1B3C7A', lw);
      ctx.beginPath(); ell(ctx, w * 0.06 + P.turn * 0.08, 0.035, w * 0.3, 0.035);
      fillOutlined(ctx, '#2C6FD8', '#1B3C7A', lw);
      ctx.beginPath(); circ(ctx, 0, -0.11, 0.02); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      break;
    }
    case 'party': {
      ctx.rotate(0.15);
      ctx.beginPath(); ctx.moveTo(-0.11, 0.03); ctx.lineTo(0, -0.3); ctx.lineTo(0.11, 0.03); ctx.closePath();
      fillOutlined(ctx, '#7B61FF', '#3A2A8C', lw);
      ctx.save(); ctx.clip(); ctx.strokeStyle = '#FFD84A'; ctx.lineWidth = 0.03;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-0.2, -0.04 - i * 0.08); ctx.lineTo(0.2, 0.02 - i * 0.08); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); circ(ctx, 0, -0.31, 0.04); fillOutlined(ctx, '#FF5C9A', '#A02358', lw);
      break;
    }
    case 'phones': {
      ctx.lineCap = 'round'; ctx.strokeStyle = '#2E2E44'; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.ellipse(0, -topY - h * 0.05, w * 0.52, h * 0.62, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.beginPath(); rrect(ctx, s * w * 0.5 - 0.06, -topY - h * 0.15, 0.12, 0.2, 0.05);
        fillOutlined(ctx, '#FF5C7A', '#7A1E33', lw);
      }
      break;
    }
    case 'propeller': {
      ctx.beginPath(); ctx.ellipse(0, 0.02, w * 0.22, 0.1, 0, Math.PI, TAU); ctx.closePath();
      ctx.save(); ctx.clip();
      const cols = ['#FF5C5C', '#FFD84A', '#4FC3FF', '#6BE07A'];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(-w * 0.22 + i * w * 0.11, -0.1, w * 0.11, 0.14); }
      ctx.restore();
      ctx.lineWidth = lw; ctx.strokeStyle = '#3A2A50'; ctx.beginPath(); ctx.ellipse(0, 0.02, w * 0.22, 0.1, 0, Math.PI, TAU); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#3A2A50'; ctx.fillRect(-0.01, -0.13, 0.02, 0.05);
      const k = Math.cos(P.prop);
      ctx.beginPath(); ell(ctx, 0, -0.135, Math.max(0.01, Math.abs(k) * 0.2), 0.025);
      ctx.fillStyle = '#FF5C5C'; ctx.fill();
      ctx.beginPath(); circ(ctx, 0, -0.135, 0.02); ctx.fillStyle = '#FFD84A'; ctx.fill();
      break;
    }
    case 'crown': {
      ctx.beginPath();
      ctx.moveTo(-0.13, 0.03); ctx.lineTo(-0.15, -0.1); ctx.lineTo(-0.07, -0.04); ctx.lineTo(0, -0.14);
      ctx.lineTo(0.07, -0.04); ctx.lineTo(0.15, -0.1); ctx.lineTo(0.13, 0.03); ctx.closePath();
      fillOutlined(ctx, shadeFill(ctx, '#FFC93C', -0.14, 0.03), '#9A6A00', lw);
      for (const [x, y, cc] of [[0, -0.02, '#FF4F8B'], [-0.08, 0, '#4FC3FF'], [0.08, 0, '#6BE07A']]) {
        ctx.beginPath(); circ(ctx, x, y, 0.018); ctx.fillStyle = cc; ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

function drawDirt(ctx, def, P, w, h) {
  const a = P.dirt;
  const spots = [[-0.28, -0.22, 0.07], [0.22, -0.3, 0.05], [0.33, 0.05, 0.06], [-0.36, 0.12, 0.045], [0.05, -0.38, 0.04]];
  for (const [x, y, r] of spots) {
    ctx.fillStyle = `rgba(110,80,50,${0.45 * a})`;
    ctx.beginPath(); ell(ctx, x * w, y * h, r * 1.3, r); ctx.fill();
    ctx.fillStyle = `rgba(90,60,40,${0.35 * a})`;
    ctx.beginPath(); circ(ctx, x * w + r * 0.6, y * h + r * 0.5, r * 0.35); ctx.fill();
  }
}
