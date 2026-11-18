'use strict';
// Game state, scenes, loop, input.
const stage = document.getElementById('stage');
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const LOGO = new Image();
LOGO.src = window.LOGO_SRC || '';

const DECAY = { food: 1.1, energy: 0.8, clean: 0.5, fun: 1.4 }; // per minute
const today = () => new Date().toISOString().slice(0, 10);

const Game = {
  s: null, scene: null, t: 0, saveT: 0,
  fresh() {
    return {
      v: 2, robot: 'pik', name: 'Пик', started: false,
      needs: { food: 58, energy: 78, clean: 62, fun: 50 },
      bolts: 30, xp: 0, level: 1,
      stats: { catchGames: 0, boltsTotal: 0, washes: 0, dances: 0, sleeps: 0, kicks: 0, melodies: 0, days: 1, feeds: 0, level: 1 },
      owned: {}, hats: {}, hat: null,
      unlocked: { pik: true, plusha: true, shursh: true },
      demoAll: false, sound: true, last: Date.now(), day: today(), hints: {},
    };
  },
  load() {
    const s = Store.load();
    this.s = Object.assign(this.fresh(), s || {});
    for (const k of ['needs', 'stats']) this.s[k] = Object.assign(this.fresh()[k], (s || {})[k] || {});
    // time away: needs drift, but never to zero; a little gift waits
    const away = clamp((Date.now() - this.s.last) / 60000, 0, 600);
    this.away = away;
    this.s.v = 2;
    if (s && away > 1) {
      for (const k in DECAY) this.s.needs[k] = Math.max(Math.min(this.s.needs[k], 22), this.s.needs[k] - DECAY[k] * away * 0.5);
    }
    if (this.s.day !== today()) { this.s.stats.days += 1; this.s.day = today(); }
    Snd.on = this.s.sound;
  },
  save() { if (this.resetting) return; this.s.last = Date.now(); Store.save(this.s); },
  get def() { return ROBOT_BY_ID[this.s.robot] || ROBOTS[0]; },
  need(k, d) { const n = this.s.needs; n[k] = clamp(n[k] + d, 0, 100); UI.needs(); },
  lowestNeed() { let best = null; for (const k in this.s.needs) if (!best || this.s.needs[k] < best.v) best = { k, v: this.s.needs[k] }; return best; },
  stat(k, n = 1) {
    const before = this.s.stats[k] || 0;
    this.s.stats[k] = before + n;
    const stamp = Passport.stamps.find(([key, goal]) => key === k && before < goal && before + n >= goal);
    if (stamp) UI.toast('Новая марка «' + stamp[2] + '»', stamp[4]);
    this.checkUnlocks();
  },
  friend(n, context) {
    if (['pet', 'ball', 'feed', 'wash'].includes(context)) SpeechLab.react(context);
    const s = this.s; s.xp += n;
    const need = 10 + s.level * 6;
    if (s.xp >= need) {
      s.xp -= need; s.level++; s.stats.level = s.level;
      UI.toast(`Дружба: уровень ${s.level}!`, 'heart');
      this.addBolts(10, World.cx, World.H * 0.4);
      if (this.scene === Room && Room.robot) { Room.robot.stop(); Room.robot.play(B.celebrate(Room.robot), 3, 'celebrate'); }
      this.checkUnlocks();
    }
    UI.friend();
  },
  addBolts(n, x, y) {
    // Credit the save immediately. Flying bolts are feedback and may be interrupted.
    this.s.bolts += n; this.s.stats.boltsTotal += n;
    UI.bolts(true); this.checkUnlocks(); this.save();
    const tgt = UI.boltTarget();
    const k = Math.min(n, 10);
    for (let i = 0; i < k; i++) {
      setTimeout(() => {
        const p = FX.add({ kind: 'fly', x: x + rand(-20, 20), y: y + rand(-20, 20), life: 0.7, s: 1.4, layer: 1 });
        const sx = p.x, sy = p.y, cx = (sx + tgt.x) / 2 + rand(-60, 60), cy = Math.min(sy, tgt.y) - 80;
        p.update = true;
        const t0 = performance.now();
        const step = () => {
          const k2 = clamp((performance.now() - t0) / 700, 0, 1), e = easeIn(k2);
          p.x = lerp(lerp(sx, cx, e), lerp(cx, tgt.x, e), e); p.y = lerp(lerp(sy, cy, e), lerp(cy, tgt.y, e), e);
          if (k2 < 1) requestAnimationFrame(step); else Snd.sfx.coin(1 + rand(0.1));
        };
        requestAnimationFrame(step);
      }, i * 70);
    }
  },
  dropBolt(x, y) {
    FX.add({ kind: 'bolt', x, y, vy: -260, vx: rand(-60, 60), g: 900, life: 0.6, floor: y + 30, s: 1.3, vr: 8 });
    setTimeout(() => this.addBolts(1, x, y), 500);
  },
  canUse(def) { return def.access === 'start' || this.s.unlocked[def.id] || this.s.demoAll; },
  checkUnlocks() {
    for (const d of ROBOTS) {
      if (d.access !== 'earn' || this.s.unlocked[d.id] || !d.goal) continue;
      if ((this.s.stats[d.goal.stat] || 0) >= d.goal.n) {
        this.s.unlocked[d.id] = true;
        UI.toast(`Новый друг открыт: ${d.name}!`, 'robots');
        Snd.sfx.fanfare();
        UI.badge('robots', true);
      }
    }
  },
  hint(done) {
    const order = ['pet', 'speech', 'feed', 'knock', 'tap', 'lift'];
    if (done) this.s.hints[done] = true;
    const next = order.find((k) => !this.s.hints[k]);
    UI.hint(next);
  },
  setScene(sc, ...a) { SpeechLab.stop(); if (this.scene && this.scene.leave) this.scene.leave(); this.scene = sc; if (sc.enter) sc.enter(...a); UI.scene(sc.name); },
  update(dt) {
    const s = this.s;
    if (this.scene === Room && s.started) {
      const m = dt / 60, sleeping = Room.robot && Room.robot.mode === 'sleep';
      s.needs.food = Math.max(0, s.needs.food - DECAY.food * m);
      s.needs.clean = Math.max(0, s.needs.clean - DECAY.clean * m);
      s.needs.fun = Math.max(0, s.needs.fun - DECAY.fun * m * (sleeping ? 0.2 : 1));
      s.needs.energy = clamp(s.needs.energy + (sleeping ? 14 : -DECAY.energy) * m, 0, 100);
      if (sleeping && s.needs.energy >= 99.5) Room.wake(false);
      this.saveT += dt;
      if (this.saveT > 4) { this.saveT = 0; this.save(); UI.needs(); }
    }
  },
};
Room.name = 'room';

// ---------------- boot: the studio logo on the robot's own face ----------------
const Boot = {
  name: 'boot', t: 0, robot: null, started: false,
  enter() {
    this.t = 0; this.started = false;
    this.robot = new Robot(Game.def, World, World.cx, World.H * 0.62);
    this.robot.hat = Game.s.hat;
  },
  down() {
    if (this.started) { if (this.t > 1.2) this.t = Math.max(this.t, 4.4); return; }
    this.started = true; this.t = 0; Snd.init(); Snd.on = Game.s.sound;
    Snd.sfx.lightOn();
  },
  move() {}, up() {},
  update(dt) {
    const r = this.robot;
    if (!this.started) { r.t += dt; return; }
    this.t += dt;
    const t = this.t;
    r.update(dt);
    if (t < 2.6) { r.expr = 'closed'; r.exprUntil = r.t + 1; }
    if (!this.chirp && t > 2.6) { this.chirp = true; r.expr = null; r.face('happy', 1.5); r.say('hello'); r.flap = 1; setTimeout(() => (r.flap = 0), 700); }
    if (!this.snd2 && t > 0.5) { this.snd2 = true; Snd.sfx.sparkle(); }
    if (t > 5.2) {
      if (Game.s.started) { Room.greetOnEnter = true; Game.setScene(Room); }
      else Game.setScene(Choose);
    }
  },
  draw(ctx) {
    const W = World.W, H = World.H, t = this.t, r = this.robot;
    if (World.bgDirty || !World.bg) { World.bg = renderRoomBg(Game.s.owned); World.bgDirty = false; }
    const reveal = clamp((t - 3.2) / 1.4, 0, 1), e = easeInOut(reveal);
    ctx.fillStyle = '#0D0A1E'; ctx.fillRect(0, 0, W, H);
    if (reveal > 0) { ctx.globalAlpha = e; ctx.drawImage(World.bg, 0, 0, W, H); ctx.globalAlpha = 1; }
    // camera: start on the face, pull back to the room
    const P = r.pose();
    const big = Math.min(W * 1.15, H * 0.5) / r.def.head.w;
    const normal = World.S * World.depthScale(World.H * 0.62);
    P.px = lerp(big, normal, e);
    const headCY = (GEO.hipY + GEO.neckBase - GEO.neckLen - r.def.head.h / 2) * P.px;
    P.x = W / 2; P.y = lerp(H * 0.45 - headCY, lerp(World.floorTop, World.floorBottom, 0.62), e);
    P.screen = LOGO.complete && LOGO.naturalWidth ? LOGO : null;
    P.screenK = this.started ? clamp(1 - (t - 2.0) / 0.5, 0, 1) * clamp(t / 0.35, 0, 1) : 0;
    P.alpha = this.started ? clamp(t / 0.25, 0, 1) : 0.0;
    P.shadow = reveal > 0.5;
    if (this.started) drawRobot(ctx, r.def, P);
    // captions
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!this.started) {
      const k = 0.6 + Math.sin(performance.now() / 400) * 0.4;
      ctx.fillStyle = `rgba(120,240,230,${0.25 + k * 0.25})`;
      ctx.beginPath(); ell(ctx, W / 2, H * 0.45, 70, 16); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '900 26px Nunito, system-ui, sans-serif';
      ctx.fillText('Кто-то живёт', W / 2, H * 0.3); ctx.fillText('в твоём телефоне…', W / 2, H * 0.3 + 34);
      ctx.globalAlpha = 0.65 + k * 0.35; ctx.font = '800 18px Nunito, system-ui, sans-serif';
      ctx.fillText('Коснись экрана, чтобы разбудить', W / 2, H * 0.62);
      ctx.globalAlpha = 1;
    } else if (t > 0.4 && t < 3.3) {
      const a = clamp((t - 0.4) / 0.4, 0, 1) * clamp((3.3 - t) / 0.4, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = '#FFFFFF'; ctx.font = '900 22px Nunito, system-ui, sans-serif';
      ctx.fillText('Toysberry Game Studio', W / 2, H * 0.13);
      ctx.font = '700 15px Nunito, system-ui, sans-serif'; ctx.fillStyle = '#BFAEF5';
      ctx.fillText('представляет', W / 2, H * 0.13 + 26);
      ctx.globalAlpha = 1;
    }
    if (reveal > 0.6) {
      ctx.globalAlpha = clamp((reveal - 0.6) / 0.4, 0, 1);
      drawTitle(ctx, W / 2, World.topUI * 0.9);
      ctx.globalAlpha = 1;
    }
  },
};
function drawTitle(ctx, x, y) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 40px Nunito, system-ui, sans-serif';
  ctx.lineWidth = 8; ctx.strokeStyle = '#3B2A80'; ctx.strokeText('Робогочи', x, y);
  const g = ctx.createLinearGradient(0, y - 20, 0, y + 20); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#BDF7EF');
  ctx.fillStyle = g; ctx.fillText('Робогочи', x, y);
  ctx.restore();
}

// ---------------- choose your baby robot ----------------
const Choose = {
  name: 'choose', bots: [], sel: -1, phase: 'pick', t: 0,
  enter() {
    this.t = 0; this.sel = -1; this.phase = 'pick';
    const y = lerp(World.floorTop, World.floorBottom, 0.55);
    this.bots = ['pik', 'plusha', 'shursh'].map((id, i) => {
      const r = new Robot(ROBOT_BY_ID[id], World, World.W * (0.2 + i * 0.3), y + (i === 1 ? 20 : 0));
      r.scaleMul = 0.62; r.idleT = rand(0.5, 2);
      return r;
    });
    UI.choose(null);
  },
  down(x, y) {
    if (this.phase !== 'pick') return;
    const i = this.bots.findIndex((r) => r.hitTest(x, y));
    if (i < 0) return;
    this.select(i);
  },
  select(i) {
    this.sel = i;
    const r = this.bots[i];
    r.stop(); r.play(B.hello(r), 2);
    this.bots.forEach((b, j) => { b.lookAt(r.x, r.y - 60, 1.5); if (j !== i && !b.busy) b.face('look', 1); });
    UI.choose(r.def);
  },
  confirm() {
    const r = this.bots[this.sel];
    Game.s.robot = r.def.id; Game.s.name = r.def.name;
    this.phase = 'name';
    this.bots.forEach((b, j) => {
      if (j === this.sel) return;
      b.stop(); b.play((function* () { b.face('happy', 2); b.say('hello'); b.flap = 1; yield* wait(0.5); b.flap = 0; yield* walk(b, World.W * 0.52, World.floorTop + 18, 1.2, 5); b.gone = true; })(), 3);
    });
    r.stop(); r.play((function* () { yield* walk(r, World.cx, lerp(World.floorTop, World.floorBottom, 0.62), 1, 4); yield* B.happyHop(r, 1); })(), 3);
    UI.nameStep();
  },
  finish(name) {
    Game.s.name = (name || '').trim().slice(0, 12) || Game.def.name;
    Game.s.started = true; Game.s.unlocked[Game.s.robot] = true;
    Game.save();
    const r = this.bots[this.sel];
    Room.setRobot(Game.def);
    Game.setScene(Room);
    Room.robot.x = r.x; Room.robot.y = r.y;
    Room.robot.play(B.happyHop(Room.robot, 2), 2);
    setTimeout(() => Game.hint(), 1500);
  },
  move() {}, up() {},
  update(dt) {
    this.t += dt;
    for (const r of this.bots) {
      if (r.gone) continue;
      r.update(dt);
      if (this.phase === 'pick' && !r.busy) { r.idleT -= dt; if (r.idleT <= 0) { r.idleT = rand(2, 4); r.play(pick([B.question(r), B[TRAITS[r.def.trait]](r), B.happyHop(r, 1)]), 0); } }
      if (r.gone === undefined && this.phase === 'name' && r !== this.bots[this.sel] && r.y < World.floorTop + 30) r.gone = true;
    }
  },
  draw(ctx) {
    if (World.bgDirty || !World.bg) { World.bg = renderRoomBg(Game.s.owned); World.bgDirty = false; }
    ctx.drawImage(World.bg, 0, 0, World.W, World.H);
    drawDockBack(ctx, false); drawDockFront(ctx, false);
    const list = this.bots.filter((r) => !r.gone).sort((a, b) => a.y - b.y);
    for (const r of list) {
      if (this.phase === 'pick' && this.bots[this.sel] === r) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ell(ctx, r.x, r.y, r.px * 0.5, r.px * 0.12); ctx.fill();
      }
      r.draw(ctx);
    }
    FX.draw(ctx, 0);
    drawTitle(ctx, World.W / 2, World.topUI * 0.55);
  },
};

// ---------------- input ----------------
const Input = { id: null };
function localXY(e) { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
cv.addEventListener('pointerdown', (e) => {
  if (!UI.$('sheet').hidden) { UI.closeSheet(); return; }
  Snd.init();
  const p = localXY(e);
  Input.id = e.pointerId;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  if (Game.scene && Game.scene.down) Game.scene.down(p.x, p.y, e.pointerId);
  e.preventDefault();
});
window.addEventListener('pointermove', (e) => {
  const p = localXY(e);
  if (Room.dragFood) { Room.moveFood(p.x, p.y); return; }
  if (Input.id === e.pointerId && Game.scene && Game.scene.move) Game.scene.move(p.x, p.y);
});
const endPointer = (e) => {
  const p = localXY(e);
  if (Room.dragFood) { Room.dropFood(); return; }
  if (Input.id === e.pointerId) { Input.id = null; if (Game.scene && Game.scene.up) Game.scene.up(p.x, p.y); }
};
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
document.addEventListener('visibilitychange', () => { if (document.hidden && Game.s) { SpeechLab.stop(); Game.save(); } });
window.addEventListener('pagehide', () => { if (Game.s) Game.save(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && window.__rgBack) window.__rgBack();
});

// ---------------- resize & loop ----------------
function resize() {
  const wrap = stage.parentElement;
  const vw = wrap.clientWidth || window.innerWidth, vh = wrap.clientHeight || window.innerHeight;
  let w = vw, h = vh;
  if (w / h > 0.62) w = Math.round(h * 0.5625);
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const top = UI.topHeight(), bot = UI.bottomHeight();
  World.layout(w, h, top, bot);
  if (Room.robot) { const p = World.clampFloor(Room.robot.x, Room.robot.y); Room.robot.x = p.x; Room.robot.y = p.y; }
}
window.addEventListener('resize', resize);

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  Game.t += dt;
  const sc = Game.scene;
  if (sc && sc.update) sc.update(dt);
  Game.update(dt);
  FX.update(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (World.shakeAmt > 0.2) { ctx.translate(rand(-1, 1) * World.shakeAmt, rand(-1, 1) * World.shakeAmt); World.shakeAmt *= 0.86; } else World.shakeAmt = 0;
  if (sc && sc.draw) sc.draw(ctx);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // DOM scenes paint their own surface. Repeated reflections on an uncleared
  // backing canvas would become opaque during the parcel's fade into the room.
  if (sc !== Parcel && sc !== Workshop) {
    FX.draw(ctx, 1);
    drawGlass(ctx);
  }
  requestAnimationFrame(frame);
}
// glass of the phone: soft reflection and rounded inner frame
function drawGlass(ctx) {
  const W = World.W, H = World.H;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(0.36, 'rgba(255,255,255,0.05)'); g.addColorStop(0.42, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(20,12,40,0.35)';
  ctx.beginPath(); rrect(ctx, -2, -2, W + 4, H + 4, 34); ctx.stroke();
  ctx.restore();
}

function boot() {
  Game.load();
  UI.init();
  resize();
  Room.setRobot(Game.def);
  Room.ensureToys();
  Room.greetOnEnter = Game.s.started;
  Game.setScene(Game.s.started ? Room : Parcel);
  window.__rg = { Game, Room, World, B, Boot, Choose, Parcel, SpeechLab, Workshop, Games: window.Games };
  // Android shell hooks: Back closes a sheet / leaves a mini-game first; leaving the app saves and mutes
  window.__rgBack = () => {
    if (Game.scene === Workshop) { Workshop.exit(); return 'stay'; }
    if (Game.scene === Parcel && Game.s.started) { Game.setScene(Room); return 'stay'; }
    if (!UI.$('sheet').hidden) { UI.closeSheet(); return 'stay'; }
    if (!UI.$('tray').hidden) { UI.$('tray').hidden = true; return 'stay'; }
    if (Game.scene && (Game.scene.name === 'catch' || Game.scene.name === 'simon')) { Games.exit(); return 'stay'; }
    Game.save(); return 'exit';
  };
  window.__rgAppPause = () => { SpeechLab.stop(); Game.save(); Snd.Music.stop(); };
  window.__rgAppResume = () => { Snd.init(); };
  requestAnimationFrame(frame);
}
