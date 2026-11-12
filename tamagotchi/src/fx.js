'use strict';
// Particles & little pictograms
const FX = {
  list: [],
  add(p) {
    const o = Object.assign({ t: 0, life: 1, vx: 0, vy: 0, g: 0, rot: 0, vr: 0, s: 1, a: 1, drag: 0 }, p);
    this.list.push(o);
    return o;
  },
  burst(kind, x, y, n = 6, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.dir !== undefined ? o.dir + rand(-o.spread || -0.6, o.spread || 0.6) : rand(TAU);
      const sp = rand(o.min || 60, o.max || 180);
      this.add(Object.assign({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.6, 1.1), rot: rand(TAU), vr: rand(-6, 6), s: rand(0.7, 1.2) }, o.p || {}));
    }
  },
  text(x, y, str, col = '#FFFFFF', size = 22) { this.add({ kind: 'text', x, y, vy: -60, life: 1.1, str, col, size, drag: 1.5 }); },
  update(dt) {
    for (const p of this.list) {
      p.t += dt;
      p.vy += p.g * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.floor !== undefined && p.y > p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5; }
      if (p.kind === 'fly' && p.t >= p.life && p.done) { p.done(); p.done = null; }
    }
    this.list = this.list.filter((p) => p.t < p.life);
  },
  draw(ctx, layer = 0) {
    for (const p of this.list) {
      if ((p.layer || 0) !== layer) continue;
      const k = p.t / p.life, fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.save();
      ctx.globalAlpha = p.a * fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.s * (p.grow ? 1 + k * p.grow : 1) * (p.pop ? Math.min(1, p.t * 8) : 1);
      ctx.scale(s, s);
      FX.icon(ctx, p.kind, p, k);
      ctx.restore();
    }
  },
  icon(ctx, kind, p = {}, k = 0) {
    switch (kind) {
      case 'heart':
        ctx.fillStyle = p.col || '#FF5C8A'; ctx.beginPath(); heartPath(ctx, 0, 0, 11); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); circ(ctx, -4, -4, 2.5); ctx.fill(); break;
      case 'star':
        ctx.fillStyle = p.col || '#FFD84A'; ctx.beginPath(); starPath(ctx, 0, 0, 10, 4.5); ctx.fill(); break;
      case 'spark':
        ctx.fillStyle = p.col || '#FFFFFF'; ctx.beginPath(); starPath(ctx, 0, 0, 8, 2, 4); ctx.fill(); break;
      case 'z':
        ctx.fillStyle = p.col || '#CFE6FF'; ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('z', 0, 0); break;
      case 'note':
        ctx.fillStyle = p.col || '#FFE36B';
        ctx.beginPath(); ell(ctx, -3, 6, 6, 4.5, -0.4); ctx.fill(); ctx.fillRect(1.5, -12, 3, 18);
        ctx.beginPath(); ctx.moveTo(4.5, -12); ctx.quadraticCurveTo(13, -9, 10, -1); ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); break;
      case 'bubble':
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(200,235,255,0.25)';
        ctx.beginPath(); circ(ctx, 0, 0, p.r || 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); circ(ctx, -(p.r || 8) * 0.35, -(p.r || 8) * 0.35, (p.r || 8) * 0.22); ctx.fill(); break;
      case 'crumb':
        ctx.fillStyle = p.col || '#C98A4B'; ctx.fillRect(-3, -3, 6, 6); break;
      case 'dust':
        ctx.fillStyle = p.col || 'rgba(170,150,190,0.55)'; ctx.beginPath(); circ(ctx, 0, 0, 7 + k * 10); ctx.fill(); break;
      case 'drop':
        ctx.fillStyle = p.col || '#8FD8FF'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(5, 2, 0, 5); ctx.quadraticCurveTo(-5, 2, 0, -6); ctx.fill(); break;
      case 'ripple':
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath(); circ(ctx, 0, 0, 10 + k * 46); ctx.stroke(); break;
      case 'confetti':
        ctx.fillStyle = p.col || '#FF5C8A'; ctx.fillRect(-4, -2.5, 8, 5); break;
      case 'text':
        ctx.font = `900 ${p.size || 22}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,20,70,0.55)'; ctx.strokeText(p.str, 0, 0);
        ctx.fillStyle = p.col || '#fff'; ctx.fillText(p.str, 0, 0); break;
      case 'bolt': case 'fly':
        FX.boltIcon(ctx, 0, 0, 1); break;
      case 'ring':
        ctx.strokeStyle = p.col || '#FFE36B'; ctx.lineWidth = 4 * (1 - k); ctx.beginPath(); circ(ctx, 0, 0, 8 + k * 40); ctx.stroke(); break;
    }
  },
  // currency: a little screw ("винтик")
  boltIcon(ctx, x, y, s, gold = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.5);
    const c1 = gold ? '#FFD34D' : '#D9E1EC', c2 = gold ? '#B88400' : '#5E6880';
    ctx.fillStyle = c2; ctx.fillRect(-3.2, -1, 6.4, 14);
    ctx.strokeStyle = c1; ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-3.6, 2 + i * 3); ctx.lineTo(3.6, 0.5 + i * 3); ctx.stroke(); }
    ctx.beginPath(); hexPath(ctx, 0, -4, 8.5, Math.PI / 6);
    ctx.fillStyle = c1; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = c2; ctx.stroke();
    ctx.strokeStyle = c2; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); circ(ctx, -3, -7, 1.6); ctx.fill();
    ctx.restore();
  },
};
