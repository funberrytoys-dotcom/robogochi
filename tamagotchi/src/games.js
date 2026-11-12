'use strict';
// Mini-games: «Лови винтики» (catch) and «Пи-пи-повтори» (Simon), plus a dance party in the room.

function miniWorld(top, bottom, S) {
  return {
    W: World.W, H: World.H, cx: World.W / 2, S, floorTop: top, floorBottom: bottom, washing: false,
    depthScale() { return 1; },
    clampFloor(x, y) { return { x: clamp(x, this.W * 0.12, this.W * 0.88), y: clamp(y, this.floorTop, this.floorBottom) }; },
    shake(a) { World.shake(a); },
  };
}

const Catch = {
  name: 'catch', dur: 40,
  enter() {
    this.t = 0; this.score = 0; this.items = []; this.spawnT = 0.6; this.combo = 0; this.done = false; this.boost = 0;
    this.w = miniWorld(World.H - 150, World.H - 130, World.S * 0.85);
    this.robot = new Robot(Game.def, this.w, World.cx, World.H - 140);
    this.robot.hat = Game.s.hat; this.robot.battery = Game.s.needs.energy / 100;
    this.robot.play(B.hello(this.robot), 2);
    Snd.Music.start(120);
    this.setScore();
  },
  leave() { Snd.Music.stop(); },
  setScore() { UI.$('gScore').querySelector('b').textContent = this.score; },
  down(x) { if (!this.done) this.robot.walkTo(x, this.w.floorBottom - 10, this.boost > 0 ? 3.4 : 2.6); },
  move(x) { this.down(x); },
  up() {},
  spawn() {
    const r = Math.random();
    const kind = r < 0.7 ? 'bolt' : r < 0.8 ? 'gold' : r < 0.88 ? 'battery' : r < 0.95 ? 'heart' : 'oil';
    const k = this.t / this.dur;
    this.items.push({ kind, x: rand(World.W * 0.12, World.W * 0.88), y: 90, vy: this.w.S * lerp(1.4, 2.3, k) * rand(0.9, 1.1), rot: rand(TAU), vr: rand(-3, 3), sway: rand(TAU), alive: true });
  },
  update(dt) {
    const r = this.robot;
    if (!this.done) {
      this.t += dt;
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawn(); this.spawnT = lerp(0.62, 0.36, this.t / this.dur) * rand(0.8, 1.2); }
      UI.$('gTime').style.width = Math.max(0, (1 - this.t / this.dur) * 100) + '%';
      if (this.t >= this.dur) this.finish();
    }
    this.boost = Math.max(0, this.boost - dt);
    r.update(dt);
    const h = r.headWorld(), hr = r.def.head.w * 0.55 * r.px;
    for (const it of this.items) {
      it.y += it.vy * dt; it.x += Math.sin(this.t * 3 + it.sway) * 20 * dt; it.rot += it.vr * dt;
      if (!this.done && dist(it.x, it.y, h.x, h.y - r.px * 0.1) < hr + 14) { it.alive = false; this.caught(it, h); }
      if (it.y > this.w.floorBottom + 10) { it.alive = false; this.combo = 0; FX.burst('dust', it.x, this.w.floorBottom + 5, 3, { min: 20, max: 60, p: { life: 0.4 } }); }
    }
    this.items = this.items.filter((i) => i.alive);
  },
  caught(it, h) {
    const r = this.robot;
    this.combo++;
    r.billHold = 0.7; setTimeout(() => (r.billHold = 0), 120);
    r.sq.v += 2;
    let add = 1;
    if (it.kind === 'gold') { add = 5; r.face('star', 0.8); r.say('wow'); Snd.sfx.sparkle(); }
    else if (it.kind === 'battery') { add = 0; Game.need('energy', 6); r.face('happy', 0.6); FX.text(it.x, it.y - 20, '+энергия', '#6BFF8E', 16); Snd.sfx.ding(); }
    else if (it.kind === 'heart') { add = 0; Game.friend(1); r.face('love', 0.8); r.say('love'); FX.add({ kind: 'heart', x: it.x, y: it.y, vy: -80, life: 1 }); }
    else if (it.kind === 'oil') { add = 0; this.boost = 4; r.face('star', 1); r.say('wow'); FX.text(it.x, it.y - 20, 'Скорость!', '#7FD3FF', 18); Snd.sfx.whoosh(); }
    else { r.face('happy', 0.4); if (this.combo % 5 === 0) r.say('happy'); }
    if (add) {
      this.score += add; this.setScore();
      Snd.sfx.coin(1 + Math.min(this.combo, 10) * 0.04);
      FX.text(it.x, it.y - 20, '+' + add, it.kind === 'gold' ? '#FFD34D' : '#FFFFFF', it.kind === 'gold' ? 26 : 20);
    }
    FX.burst('spark', it.x, it.y, 5, { min: 60, max: 160, p: { life: 0.5, col: it.kind === 'gold' ? '#FFD34D' : '#FFFFFF' } });
  },
  finish() {
    this.done = true; this.items.forEach((i) => (i.vy *= 0.5));
    const r = this.robot, s = Game.s, n = this.score;
    Snd.Music.stop();
    s.bolts += n; s.stats.boltsTotal += n;
    Game.stat('catchGames'); Game.need('fun', 25); Game.friend(3); Game.save();
    r.stop(); r.target = null; r.play(B.celebrate(r), 3);
    const stars = n >= 40 ? 3 : n >= 22 ? 2 : 1;
    Games.result(`Поймано: ${n}`, stars, `+${n} винтиков в копилку`, () => Games.start('catch'));
  },
  draw(ctx) {
    const W = World.W, H = World.H;
    if (World.bgDirty || !World.bg) { World.bg = renderRoomBg(Game.s.owned); World.bgDirty = false; }
    ctx.drawImage(World.bg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(24,12,60,0.45)'; ctx.fillRect(0, 0, W, H);
    // a glowing "conveyor" the robot runs on
    const fy = this.w.floorBottom + 4;
    const g = ctx.createLinearGradient(0, fy - 30, 0, H); g.addColorStop(0, 'rgba(255,190,140,0)'); g.addColorStop(0.3, '#F2C4A6'); g.addColorStop(1, '#E2A07E');
    ctx.fillStyle = g; ctx.fillRect(0, fy - 30, W, H - fy + 30);
    ctx.strokeStyle = 'rgba(255,240,226,0.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const x = ((i * 50 - this.t * 60) % (W + 50) + W + 50) % (W + 50) - 25; ctx.beginPath(); ctx.moveTo(x, fy + 10); ctx.lineTo(x + 20, H); ctx.stroke(); }
    for (const it of this.items) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.shadowColor = it.kind === 'gold' ? '#FFD34D' : 'rgba(255,255,255,0.7)'; ctx.shadowBlur = 12 * DPR;
      if (it.kind === 'bolt') FX.boltIcon(ctx, 0, 0, 1.5);
      else if (it.kind === 'gold') FX.boltIcon(ctx, 0, 0, 1.8, true);
      else if (it.kind === 'battery') { ctx.rotate(-it.rot); drawNeedIcon(ctx, 'energy', 1.1); }
      else if (it.kind === 'heart') { ctx.rotate(-it.rot); FX.icon(ctx, 'heart'); }
      else { ctx.rotate(-it.rot); drawFood(ctx, 'oil'); }
      ctx.restore();
    }
    if (this.boost > 0) { ctx.fillStyle = `rgba(127,211,255,${0.25 * Math.min(1, this.boost)})`; ctx.beginPath(); ell(ctx, this.robot.x, this.robot.y, 60, 14); ctx.fill(); }
    this.robot.draw(ctx);
    FX.draw(ctx, 0);
    if (this.t < 2.2 && !this.done) caption(ctx, 'Води пальцем и лови винтики!', H * 0.3, clamp((2.2 - this.t) * 2, 0, 1));
  },
};

const PADS = [
  { col: '#FF5C5C', shape: 'circle', f: 523.25 },
  { col: '#FFD84A', shape: 'star', f: 659.25 },
  { col: '#6BE07A', shape: 'tri', f: 783.99 },
  { col: '#4FC3FF', shape: 'square', f: 1046.5 },
];
const Simon = {
  name: 'simon',
  enter() {
    this.round = 0; this.won = 0; this.miss = 0; this.seq = []; this.inp = 0; this.state = 'intro'; this.stT = 1.2; this.lit = -1; this.litT = 0; this.done = false; this.t = 0;
    const top = World.H * 0.47;
    this.w = miniWorld(top, top + 4, World.S * 0.95);
    this.robot = new Robot(Game.def, this.w, World.cx, top);
    this.robot.hat = Game.s.hat; this.robot.battery = Game.s.needs.energy / 100;
    this.robot.play(B.hello(this.robot), 2);
    const W = World.W, H = World.H, gap = 12, pw = Math.min((W - 48 - gap) / 2, (H * 0.4 - gap) / 2), x0 = W / 2 - pw - gap / 2, y0 = top + 30;
    this.rects = PADS.map((p, i) => ({ x: x0 + (i % 2) * (pw + gap), y: y0 + Math.floor(i / 2) * (pw * 0.78 + gap), w: pw, h: pw * 0.78 }));
    this.score = 0; UI.$('gScore').querySelector('b').textContent = '0';
    UI.$('gTime').style.width = '0%';
  },
  leave() {},
  nextRound() {
    this.round++;
    if (this.seq.length === 0) this.seq = [randi(0, 3), randi(0, 3)];
    else this.seq.push(randi(0, 3));
    this.state = 'show'; this.showI = 0; this.stT = 0.7; this.inp = 0;
    UI.$('gTime').style.width = Math.min(100, ((this.round - 1) / 5) * 100) + '%';
  },
  light(i, who) {
    this.lit = i; this.litT = 0.32;
    Snd.sfx.tap(PADS[i].f);
    const r = this.robot, R = this.rects[i];
    r.lookAt(R.x + R.w / 2, R.y + R.h / 2, 0.6);
    if (who === 'robot') { r.billHold = 0.7; setTimeout(() => (r.billHold = 0), 160); r.headTarget.y = 0.05; setTimeout(() => (r.headTarget.y = 0), 160); }
    else { r.headTarget.rot = (i % 2 ? 1 : -1) * 0.15; setTimeout(() => (r.headTarget.rot = 0), 200); }
  },
  down(x, y) {
    if (this.state !== 'input' || this.done) return;
    const i = this.rects.findIndex((R) => x > R.x && x < R.x + R.w && y > R.y && y < R.y + R.h);
    if (i < 0) return;
    this.light(i, 'kid');
    const r = this.robot;
    if (i === this.seq[this.inp]) {
      this.inp++;
      if (this.inp >= this.seq.length) {
        this.won++; this.score += 4; UI.$('gScore').querySelector('b').textContent = this.score;
        Game.stat('melodies');
        this.state = 'good'; this.stT = 1.4;
        r.stop(); r.play(B.happyHop(r, 2), 2);
        FX.burst('star', World.cx, World.H * 0.3, 8, { min: 80, max: 200, p: { life: 0.9 } });
      }
    } else {
      this.miss++;
      this.state = 'oops'; this.stT = 1.5;
      Snd.sfx.error(); r.stop(); r.play(B.question(r), 2);
    }
  },
  move() {}, up() {},
  update(dt) {
    this.t += dt;
    this.robot.update(dt);
    if (this.litT > 0) { this.litT -= dt; if (this.litT <= 0) this.lit = -1; }
    if (this.done) return;
    this.stT -= dt;
    if (this.state === 'intro' && this.stT <= 0) this.nextRound();
    else if (this.state === 'show' && this.stT <= 0) {
      if (this.showI < this.seq.length) { this.light(this.seq[this.showI++], 'robot'); this.stT = Math.max(0.42, 0.62 - this.round * 0.03); }
      else { this.state = 'input'; this.inp = 0; this.robot.face('happy', 1); this.robot.say('question'); }
    } else if (this.state === 'good' && this.stT <= 0) {
      if (this.won >= 5) this.finish(); else this.nextRound();
    } else if (this.state === 'oops' && this.stT <= 0) {
      if (this.miss >= 3) this.finish(); else { this.state = 'show'; this.showI = 0; this.stT = 0.5; }
    }
  },
  finish() {
    this.done = true;
    const n = this.score + 2, s = Game.s;
    s.bolts += n; s.stats.boltsTotal += n; Game.need('fun', 20); Game.friend(3); Game.save();
    const r = this.robot; r.stop(); r.play(B.celebrate(r), 3);
    const stars = this.won >= 5 ? 3 : this.won >= 3 ? 2 : 1;
    Games.result(this.won >= 5 ? 'Все мелодии!' : `Мелодий: ${this.won}`, stars, `+${n} винтиков в копилку`, () => Games.start('simon'));
  },
  draw(ctx) {
    const W = World.W, H = World.H;
    if (World.bgDirty || !World.bg) { World.bg = renderRoomBg(Game.s.owned); World.bgDirty = false; }
    ctx.drawImage(World.bg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(24,12,60,0.5)'; ctx.fillRect(0, 0, W, H);
    // little stage
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ell(ctx, World.cx, this.w.floorTop + 2, World.S * 0.7, World.S * 0.12); ctx.fill();
    this.robot.draw(ctx);
    this.rects.forEach((R, i) => {
      const p = PADS[i], on = this.lit === i;
      ctx.save();
      if (on) { ctx.shadowColor = p.col; ctx.shadowBlur = 30 * DPR; }
      ctx.beginPath(); rrect(ctx, R.x, R.y, R.w, R.h, 24);
      ctx.fillStyle = on ? lighten(p.col, 0.35) : rgba(p.col, 0.55); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = on ? '#FFFFFF' : rgba('#FFFFFF', 0.4); ctx.stroke();
      ctx.restore();
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2, s = Math.min(R.w, R.h) * (on ? 0.3 : 0.26);
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
      if (p.shape === 'circle') circ(ctx, cx, cy, s);
      else if (p.shape === 'star') starPath(ctx, cx, cy, s * 1.2, s * 0.5);
      else if (p.shape === 'tri') { ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 1.1, cy + s * 0.8); ctx.lineTo(cx - s * 1.1, cy + s * 0.8); ctx.closePath(); }
      else rrect(ctx, cx - s * 0.9, cy - s * 0.9, s * 1.8, s * 1.8, 6);
      ctx.fill();
    });
    FX.draw(ctx, 0);
    const msg = this.state === 'show' || this.state === 'intro' ? 'Слушай…' : this.state === 'input' ? 'Твоя очередь!' : this.state === 'good' ? 'Ура!' : 'Ой! Ещё раз…';
    if (!this.done) caption(ctx, msg, World.topUI * 0.78, 1);
  },
};

function caption(ctx, text, y, a) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '900 20px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 32;
  ctx.fillStyle = 'rgba(30,18,66,0.55)'; ctx.beginPath(); rrect(ctx, World.W / 2 - w / 2, y - 19, w, 38, 19); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.fillText(text, World.W / 2, y + 1);
  ctx.restore();
}

const Games = {
  start(kind) {
    UI.$('result').hidden = true;
    if (Room.robot.mode === 'sleep') { Room.robot.sleeping = false; Room.robot.stop(); Room.robot.mode = 'stand'; }
    Game.setScene(kind === 'catch' ? Catch : Simon);
  },
  exit() { Snd.Music.stop(); UI.$('result').hidden = true; Game.setScene(Room); Room.robot.play(B.hello(Room.robot), 2); },
  result(title, stars, sub, again) {
    const p = UI.$('result');
    p.hidden = false;
    p.innerHTML = `<h2>${title}</h2><div class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('')}</div><p>${sub}</p><div style="display:flex;gap:10px"><button class="big-btn" id="rAgain">Ещё раз</button><button class="pill ghost" id="rHome" style="padding:12px 18px;font-size:16px">Домой</button></div>`;
    UI.$('rAgain').onclick = () => { Snd.sfx.click(); again(); };
    UI.$('rHome').onclick = () => { Snd.sfx.click(); Games.exit(); };
    Snd.sfx.fanfare();
  },
  danceParty() {
    const r = Room.robot;
    if (r.mode === 'sleep') Room.wake(true);
    r.stop(); r.mode = 'stand';
    Room.party = 1;
    let beats = 0;
    const moves = [
      () => { r.tiltBias = 0.14; r.headTarget.rot = 0.2; r.crouchT = 0.5; },
      () => { r.tiltBias = -0.14; r.headTarget.rot = -0.2; r.crouchT = 0.5; },
      () => { r.hop(0.5); r.flap = 1; },
      () => { r.crouchT = 0.8; r.neckT = 1; r.billHold = 0.6; },
    ];
    Snd.Music.start(116, () => {
      if (Game.scene !== Room) { Snd.Music.stop(); Room.party = 0; return; }
      beats++;
      r.beat = 1; setTimeout(() => { r.beat = 0; r.crouchT = 0; r.billHold = 0; r.flap = 0; r.neckT = 0; }, 160);
      (beats % 8 === 0 ? () => r.play(B.spin(r), 1, 'spin') : moves[beats % 4])();
      r.face(beats % 6 < 3 ? 'happy' : 'star', 0.6);
      const h = r.headWorld();
      FX.add({ kind: 'note', x: h.x + rand(-60, 60), y: h.y - 40, vy: -60, vx: rand(-20, 20), life: 1.2, col: pick(['#FFE36B', '#FF8AD8', '#7FD3FF', '#7BE07A']) });
      if (beats >= 40) {
        Snd.Music.stop(); Room.party = 0; r.tiltBias = 0; r.headTarget.rot = 0;
        Game.stat('dances'); Game.need('fun', 25); Game.friend(3);
        r.play(B.celebrate(r), 3);
      }
    });
    UI.toast('Танцуем! Тыкай в робота в такт', 'dance');
  },
};
window.Games = Games;
