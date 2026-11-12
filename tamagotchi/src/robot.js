'use strict';
// Robot "brain": procedural walk with planted feet, springs for every joint, scripted reactions as coroutines.

class Robot {
  constructor(def, world, x, y) {
    this.def = def; this.world = world;
    this.x = x; this.y = y; this.z = 0; this.vz = 0;
    this.vx = 0; this.vy = 0; this.target = null; this.speedMul = 1;
    this.scaleMul = 1;
    this.turn = S2(0); this.tilt = S2(0); this.crouch = S2(0); this.sit = S2(0);
    this.roll = S2(0); this.pivot = [0, 0]; this.sq = S2(0); this.spinA = 0;
    this.hx = S2(0); this.hy = S2(0); this.hrot = S2(0); this.neck = S2(0);
    this.ant = S2(0); this.wing = S2(0); this.bill = S2(0); this.blush = S2(0);
    this.poseW = S2(0); this.poseFeet = null;
    this.look = { x: 0, y: 0, tx: 0, ty: 0, at: null, until: 0, sacc: 0 };
    this.expr = null; this.exprUntil = 0; this.baseExpr = 'normal';
    this.blinkT = rand(1, 3); this.blinkK = 0;
    this.feet = [-1, 1].map((s) => ({ s, x: x + s * GEO.spread * this.px, y, lift: 0, swing: false, t: 0, dur: 0.18, sx: 0, sy: 0, tx: 0, ty: 0, rot: 0 }));
    this.co = null; this.coPri = 0; this.coName = '';
    this.held = false; this.hold = null;
    this.talk = []; this.billHold = 0;
    this.t = rand(10); this.idleT = 1.5;
    this.mode = 'stand'; // stand | sit | down | sleep
    this.dirt = 0; this.foam = []; this.hat = null; this.prop = 0; this.flying = 0;
    this.think = null; this.thinkUntil = 0;
    this.headTarget = { rot: 0, x: 0, y: 0 };
    this.wingTarget = 0; this.flap = 0; this.zap = 0; this.glow = 0; this.beat = 0;
    this.lastHead = null; this.tapTimes = [];
    this.battery = 0.8;
    this.P = defaultPose();
  }
  get px() { return this.world.S * this.world.depthScale(this.y) * this.scaleMul; }
  get grounded() { return this.z <= 0.01 && this.vz === 0 && !this.held; }
  get busy() { return !!this.co; }

  // ---------- control ----------
  play(gen, pri = 1, name = '') {
    if (this.co && pri < this.coPri) return false;
    this.co = gen; this.coPri = pri; this.coName = name;
    this.co.next();
    return true;
  }
  stop() { this.co = null; this.coPri = 0; this.coName = ''; this.target = null; this.billHold = 0; this.headTarget = { rot: 0, x: 0, y: 0 }; this.wingTarget = 0; this.flap = 0; }
  say(kind, o) {
    const sched = Snd.voice(this.def.voice, kind, o);
    for (const n of sched) this.talk.push({ t0: this.t + n.t, t1: this.t + n.t + n.d });
    return sched.length ? sched[sched.length - 1].t + sched[sched.length - 1].d : 0;
  }
  face(e, dur = 1.2) { this.expr = e; this.exprUntil = this.t + dur; }
  lookAt(x, y, dur = 1.5) { this.look.at = { x, y }; this.look.until = this.t + dur; }
  walkTo(x, y, speed = 1) { const p = this.world.clampFloor(x, y); this.target = { x: p.x, y: p.y }; this.speedMul = speed; }
  thinkOf(icon, dur = 3) { this.think = icon; this.thinkUntil = this.t + dur; }
  hop(power = 1) { if (this.z <= 0.01 && !this.held) { this.vz = power * this.world.S * 3.2; this.sq.v -= 3; Snd.sfx.hop(); } }
  headWorld() {
    const px = this.px, hh = this.def.head.h;
    const hipY = GEO.hipY + this.crouch.x * 0.1 + this.sit.x * 0.17;
    const ly = hipY + GEO.neckBase - GEO.neckLen - this.neck.x * 0.07 + this.hy.x - hh / 2;
    return { x: this.x + this.hx.x * px, y: this.y - this.z + ly * px, r: this.def.head.w * 0.5 * px };
  }
  hitTest(x, y) {
    const h = this.headWorld(), px = this.px;
    if (Math.abs(this.roll.x) > 0.6) { // lying: one generous circle
      return dist(x, y, this.x + Math.sin(this.roll.x) * 0.6 * px, this.y - 0.3 * px) < 0.75 * px ? 'body' : null;
    }
    const dx = (x - h.x) / (this.def.head.w * 0.56 * px), dy = (y - h.y) / (this.def.head.h * 0.62 * px);
    if (dx * dx + dy * dy < 1) return 'head';
    if (Math.abs(x - this.x) < 0.3 * px && y < this.y - this.z + 0.06 * px && y > h.y) return 'body';
    return null;
  }

  // ---------- per-frame ----------
  update(dt) {
    this.t += dt;
    const S = this.world.S, px = this.px;
    if (this.co) {
      const r = this.co.next(dt);
      if (r.done) { this.co = null; this.coPri = 0; this.coName = ''; }
    }

    // --- locomotion ---
    let moving = false;
    if (this.held) {
      const h = this.hold;
      const prevX = this.x;
      // the finger holds the head; the body hangs below it
      const hangY = h.y + (0.95 + this.def.head.h * 0.5) * px * 0.9;
      this.x = damp(this.x, h.x, 22, dt);
      const fl = this.world.clampFloor(this.x, Math.max(hangY, this.world.floorTop + 5));
      this.y = fl.y;
      this.z = Math.max(0, this.y - hangY);
      this.vz = 0;
      const vx = (this.x - prevX) / Math.max(dt, 1e-3);
      this.pivot = [0, -1.0];
      spring(this.roll, clamp(-vx * 0.0016, -0.7, 0.7), 60, 6, dt);
      this.vx = vx; this.vy = 0;
    } else if (this.z > 0 || this.vz > 0) {
      this.vz -= S * 14 * dt * (this.flying > 0 ? 0.08 : 1) * (this.def.trait === 'float' && this.lowGrav ? 0.35 : 1);
      this.z += this.vz * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      const fl = this.world.clampFloor(this.x, this.y); this.x = fl.x; this.y = fl.y;
      if (this.z <= 0) this.land(-this.vz);
    } else if (this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
      const maxV = 1.25 * S * this.world.depthScale(this.y) * this.speedMul * (this.mode === 'sleep' ? 0.6 : 1);
      if (d < 4) { this.target = null; this.vx = damp(this.vx, 0, 12, dt); this.vy = damp(this.vy, 0, 12, dt); }
      else {
        const sp = Math.min(maxV, d * 3.2);
        this.vx = damp(this.vx, (dx / d) * sp, 7, dt);
        this.vy = damp(this.vy, (dy / d) * sp * 0.8, 7, dt);
        moving = true;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      const fl = this.world.clampFloor(this.x, this.y); this.x = fl.x; this.y = fl.y;
    } else {
      this.vx = damp(this.vx, 0, 10, dt); this.vy = damp(this.vy, 0, 10, dt);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (Math.abs(this.vx) + Math.abs(this.vy) > 5) moving = true;
    }
    if (!this.held && this.mode !== 'down') spring(this.roll, 0, 90, 9, dt);

    // --- feet ---
    const planted = !this.held && this.z <= 0.01 && this.mode === 'stand' && Math.abs(this.roll.x) < 0.35 && !this.poseFeet;
    spring(this.poseW, planted ? 0 : 1, 140, 18, dt);
    this.poseW.x = clamp(this.poseW.x, 0, 1);
    let swingSide = 0;
    if (planted) {
      const speed = Math.hypot(this.vx, this.vy), sp01 = clamp(speed / (1.25 * S), 0, 1);
      for (const f of this.feet) {
        if (f.swing) {
          f.t += dt / f.dur;
          const k = Math.min(1, f.t);
          f.x = lerp(f.sx, f.tx, easeInOut(k)); f.y = lerp(f.sy, f.ty, easeInOut(k));
          f.lift = Math.sin(Math.PI * k) * (moving ? 0.075 : 0.045) * px;
          f.rot = Math.sin(Math.PI * k) * -0.25 * f.s;
          swingSide = f.s;
          if (k >= 1) { f.swing = false; f.lift = 0; f.rot = 0; this.crouch.v += moving ? 0.7 : 0.4; Snd.sfx.step(moving ? 0.7 : 0.4); }
        }
      }
      if (!this.feet[0].swing && !this.feet[1].swing) {
        let best = null, bd = 0;
        for (const f of this.feet) {
          const hx = this.x + f.s * GEO.spread * px, hy = this.y;
          const d = Math.hypot(f.x - hx, (f.y - hy) * 1.4);
          if (d > bd) { bd = d; best = f; }
        }
        if (best && bd > (moving ? 0.03 : 0.035) * px) {
          const f = best;
          f.swing = true; f.t = 0; f.dur = moving ? lerp(0.2, 0.14, sp01) : 0.17;
          f.sx = f.x; f.sy = f.y;
          f.tx = this.x + f.s * GEO.spread * px + this.vx * f.dur * 1.1;
          f.ty = this.y + this.vy * f.dur * 1.1;
        }
      }
    } else {
      for (const f of this.feet) { f.swing = false; f.lift = 0; f.x = this.x + f.s * GEO.spread * px; f.y = this.y; }
    }

    // --- body springs ---
    const sitT = this.mode === 'sit' || this.mode === 'sleep' ? 1 : 0;
    spring(this.sit, sitT, 70, 11, dt);
    const tiltT = (swingSide ? -swingSide * 0.08 * (moving ? 1 : 0.6) : 0) + Math.sin(this.t * 1.4) * 0.012 + (this.tiltBias || 0);
    spring(this.tilt, tiltT, 120, 12, dt);
    spring(this.crouch, this.crouchT || 0, 160, 11, dt);
    spring(this.sq, 0, 220, 14, dt);
    const turnT = moving && Math.abs(this.vx) > 8 ? clamp(this.vx / (0.9 * S), -1, 1) : clamp(this.look.x * 0.55, -0.6, 0.6);
    spring(this.turn, this.turnOverride !== undefined ? this.turnOverride : turnT, 60, 11, dt);

    // head follows with lag
    const hw = this.headWorld();
    if (this.lastHead) {
      const dvx = (hw.x - this.lastHead.x) / px, dvy = (hw.y - this.lastHead.y) / px;
      this.hx.v -= dvx * 18; this.hy.v -= dvy * 14;
      this.ant.v -= dvx * 70 + this.hrot.v * dt * 30;
    }
    this.lastHead = hw;
    const ht = this.headTarget;
    spring(this.hx, ht.x, 170, 10, dt);
    spring(this.hy, ht.y + Math.sin(this.t * 2.2 - 0.6) * 0.006, 170, 10, dt);
    spring(this.hrot, ht.rot + this.turn.x * 0.04, 120, 10, dt);
    spring(this.neck, this.neckT || 0, 90, 12, dt);
    spring(this.ant, -(this.tilt.x + this.hrot.x) * 0.8, 110, 4.5, dt);
    this.ant.x = clamp(this.ant.x, -1, 1);
    const flapT = this.flap ? Math.sin(this.t * 26) * 0.55 * this.flap + 0.3 * this.flap : this.wingTarget;
    spring(this.wing, flapT, 300, 14, dt);

    // --- face ---
    this.updateFace(dt);

    // talk -> bill
    let talking = false;
    this.talk = this.talk.filter((n) => n.t1 > this.t);
    for (const n of this.talk) if (this.t >= n.t0 && this.t < n.t1) talking = true;
    spring(this.bill, Math.max(talking ? 0.55 : 0, this.billHold), 520, 26, dt);
    this.bill.x = clamp(this.bill.x, 0, 1.1);

    // propeller / flying
    if (this.hat === 'propeller') this.prop += dt * (this.flying > 0 ? 40 : 3);
    if (this.flying > 0) this.flying -= dt;
    this.zap = Math.max(0, this.zap - dt * 2);
    if (this.think && this.t > this.thinkUntil) this.think = null;
    if (this.foam.length && !this.world.washing) {
      for (const b of this.foam) b.life -= dt;
      this.foam = this.foam.filter((b) => b.life > 0);
    }
  }

  updateFace(dt) {
    const L = this.look;
    if (L.at && this.t < L.until) {
      const h = this.headWorld(), px = this.px;
      L.tx = clamp((L.at.x - h.x) / (px * 1.6), -1, 1);
      L.ty = clamp((L.at.y - h.y) / (px * 1.6), -1, 1);
    } else {
      L.at = null;
      L.sacc -= dt;
      if (L.sacc <= 0) {
        L.sacc = rand(0.8, 2.6);
        if (chance(0.45)) { L.tx = rand(-0.15, 0.15); L.ty = rand(-0.05, 0.2); } // look at the player
        else { L.tx = rand(-0.9, 0.9); L.ty = rand(-0.6, 0.5); }
      }
    }
    L.x = damp(L.x, L.tx, 16, dt); L.y = damp(L.y, L.ty, 16, dt);
    // blink
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkK = 0.001; this.blinkT = chance(0.2) ? 0.25 : rand(2, 5); }
    if (this.blinkK > 0) { this.blinkK += dt / 0.14; if (this.blinkK >= 1) this.blinkK = 0; }
    if (this.expr && this.t > this.exprUntil) this.expr = null;
    const e = this.expr || this.baseExpr;
    spring(this.blush, e === 'happy' || e === 'love' || e === 'giggle' || e === 'squint' ? 1 : 0, 40, 10, dt);
  }

  land(speed) {
    const S = this.world.S;
    this.z = 0; this.vz = 0;
    this.vx *= 0.3; this.vy *= 0.3;
    const k = clamp(speed / (S * 3.2), 0, 3);
    this.sq.v += 2.5 * k; this.crouch.v += 2.2 * k;
    for (const f of this.feet) { f.x = this.x + f.s * GEO.spread * this.px + rand(-6, 6); f.y = this.y + rand(-3, 3); }
    if (k > 0.3) { Snd.sfx.step(1); FX.burst('dust', this.x, this.y, 4, { min: 30, max: 70, p: { life: 0.5, a: 0.6 } }); }
    if (k > 1.6) Snd.sfx.thud();
    if (this.onLand) this.onLand(k);
  }

  pose() {
    const P = this.P, px = this.px;
    P.x = this.x; P.y = this.y; P.px = px; P.z = this.z / px; P.t = this.t;
    P.roll = this.roll.x; P.pivotX = this.pivot[0]; P.pivotY = this.pivot[1];
    P.spin = this.spinA ? Math.cos(this.spinA) : 1;
    if (Math.abs(P.spin) < 0.08) P.spin = 0.08 * sign(P.spin);
    P.tilt = this.tilt.x; P.crouch = clamp(this.crouch.x, -0.4, 1.3); P.sit = clamp(this.sit.x, 0, 1.1);
    const q = clamp(this.sq.x, -0.4, 0.5);
    P.sqx = 1 + q * 0.5; P.sqy = 1 - q * 0.6;
    P.breath = Math.sin(this.t * 2.2);
    P.headX = this.hx.x; P.headY = this.hy.x; P.headRot = this.hrot.x; P.turn = clamp(this.turn.x, -1, 1); P.neck = this.neck.x;
    P.lookX = this.look.x; P.lookY = this.look.y;
    P.expr = this.expr || this.baseExpr;
    P.blink = this.blinkK > 0 ? Math.sin(Math.PI * this.blinkK) : 0;
    if (P.expr === 'closed' || P.expr === 'happy') P.blink = 0;
    P.bill = this.bill.x; P.blush = clamp(this.blush.x, 0, 1);
    P.wing = this.wing.x; P.ant = this.ant.x; P.prop = this.prop; P.beat = this.beat; P.zap = this.zap; P.glow = this.glow;
    P.battery = this.battery; P.dirt = this.dirt; P.foam = this.foam.length ? this.foam : null; P.hat = this.hat;
    // feet: blend planted world positions with posed ones (sit / held / lying)
    const w = clamp(this.poseW.x, 0, 1);
    const pf = this.poseFeet || this.defaultPoseFeet();
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i], o = P.feet[i], p = pf[i];
      const lx = (f.x - this.x) / px, ly = (f.y - this.y) / px, ll = f.lift / px;
      o.x = lerp(lx, p.x, w); o.y = lerp(ly, p.y, w); o.lift = lerp(ll, p.lift || 0, w); o.rot = lerp(f.rot, p.rot || 0, w);
    }
    return P;
  }
  defaultPoseFeet() {
    const t = this.t;
    if (this.held) {
      const k = Math.sin(t * 13) * 0.035;
      return [{ x: -0.1, y: 0.07 + k, rot: 0.2 }, { x: 0.1, y: 0.07 - k, rot: -0.2 }];
    }
    if (this.mode === 'down') {
      const k = this.kick ? Math.sin(t * 16) * 0.05 : 0;
      return [{ x: -0.14, y: -0.02 + k, rot: 0.3 }, { x: 0.14, y: -0.02 - k, rot: -0.3 }];
    }
    if (this.mode === 'sit' || this.mode === 'sleep') {
      const k = this.kick ? Math.sin(t * 9) * 0.03 : 0;
      return [{ x: -0.2, y: 0.05, lift: Math.max(0, k), rot: -0.35 }, { x: 0.2, y: 0.05, lift: Math.max(0, -k), rot: 0.35 }];
    }
    if (this.z > 0) {
      return [{ x: -0.11, y: 0.03, rot: 0.15 }, { x: 0.11, y: 0.03, rot: -0.15 }];
    }
    return [{ x: -GEO.spread, y: 0 }, { x: GEO.spread, y: 0 }];
  }

  draw(ctx) {
    drawRobot(ctx, this.def, this.pose());
    if (this.think) this.drawThought(ctx);
  }
  drawThought(ctx) {
    const h = this.headWorld(), px = this.px;
    const k = clamp((this.thinkUntil - this.t) * 3, 0, 1) * clamp((this.t - (this.thinkUntil - 3)) * 5, 0, 1);
    const bx = h.x + 0.55 * px, by = h.y - 0.62 * px + Math.sin(this.t * 3) * 3;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(255,255,255,0.93)'; ctx.strokeStyle = 'rgba(80,60,120,0.35)'; ctx.lineWidth = 2;
    for (const [x, y, r] of [[h.x + 0.3 * px, h.y - 0.36 * px, 4], [h.x + 0.4 * px, h.y - 0.46 * px, 7]]) { ctx.beginPath(); circ(ctx, x, y, r); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); circ(ctx, bx, by, 0.26 * px); ctx.fill(); ctx.stroke();
    ctx.translate(bx, by); ctx.scale(px / 140, px / 140);
    drawNeedIcon(ctx, this.think, 1.5);
    ctx.restore();
  }
}

// pictograms used in thought bubbles and UI-in-canvas
function drawNeedIcon(ctx, icon, s = 1) {
  ctx.save(); ctx.scale(s, s);
  switch (icon) {
    case 'food': drawCookie(ctx, 0, 0, 1); break;
    case 'energy':
      ctx.beginPath(); rrect(ctx, -10, -16, 20, 30, 5); ctx.fillStyle = '#5B6B8A'; ctx.fill();
      ctx.fillRect(-5, -20, 10, 5);
      ctx.beginPath(); rrect(ctx, -6, 4, 12, 7, 2); ctx.fillStyle = '#FF5D5D'; ctx.fill(); break;
    case 'clean': for (const [x, y, r] of [[-7, 4, 8], [6, -2, 10], [2, 10, 6]]) { ctx.save(); ctx.translate(x, y); FX.icon(ctx, 'bubble', { r }, 0); ctx.restore(); } break;
    case 'fun': drawBall(ctx, 0, 0, 13, 0); break;
    case 'love': FX.icon(ctx, 'heart'); break;
    case 'music': FX.icon(ctx, 'note'); break;
    case 'z': FX.icon(ctx, 'z'); break;
    case '?': ctx.fillStyle = '#7B61FF'; ctx.font = '900 30px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 2); break;
  }
  ctx.restore();
}
function drawCookie(ctx, x, y, s) {
  // a bolt-shaped cookie: hex nut biscuit with sprinkles
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); hexPath(ctx, 0, 0, 15, Math.PI / 6);
  ctx.fillStyle = '#E8A05A'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#A0602A'; ctx.stroke();
  ctx.beginPath(); circ(ctx, 0, 0, 5.5); ctx.fillStyle = '#FFE6C2'; ctx.fill();
  ctx.fillStyle = '#FF6B9A'; ctx.fillRect(-9, -7, 3, 3); ctx.fillStyle = '#5FD3FF'; ctx.fillRect(6, -6, 3, 3); ctx.fillStyle = '#7BE07A'; ctx.fillRect(4, 7, 3, 3);
  ctx.restore();
}
function drawBall(ctx, x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); circ(ctx, 0, 0, r); ctx.fillStyle = '#FF6B6B'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#FFD84A'; ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.5);
  ctx.fillStyle = '#4FC3FF'; ctx.beginPath(); circ(ctx, 0, 0, r * 0.28); ctx.fill();
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.strokeStyle = '#B83A4A'; ctx.beginPath(); circ(ctx, 0, 0, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); circ(ctx, -r * 0.35, -r * 0.4, r * 0.2); ctx.fill();
  ctx.restore();
}
