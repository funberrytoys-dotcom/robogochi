'use strict';
// Scripted reactions. Each is a generator: `yield` returns dt.
function* walk(r, x, y, speed = 1, max = 8) { r.walkTo(x, y, speed); yield* waitUntil(() => !r.target, max); }
function resetHead(r) { r.headTarget = { rot: 0, x: 0, y: 0 }; r.neckT = 0; r.crouchT = 0; r.tiltBias = 0; r.billHold = 0; r.flap = 0; r.turnOverride = undefined; }

const B = {
  *hello(r) {
    r.face('happy', 1.4); r.flap = 1; r.say('hello');
    r.crouchT = 0.6; yield* wait(0.1); r.crouchT = 0; r.hop(0.7);
    yield* waitUntil(() => r.grounded, 2); r.flap = 0;
    yield* wait(0.3);
  },
  *happyHop(r, n = 2) {
    r.face('happy', n * 0.5 + 0.6); r.say('happy');
    for (let i = 0; i < n; i++) {
      r.crouchT = 0.7; yield* wait(0.08); r.crouchT = 0; r.hop(0.75); r.flap = 1;
      yield* waitUntil(() => r.grounded, 2); r.flap = 0; yield* wait(0.04);
    }
  },
  *spin(r) {
    r.face('happy', 1.2); Snd.sfx.servo(); r.say('wow');
    r.crouchT = 0.5; yield* wait(0.1); r.crouchT = 0; r.hop(0.7);
    let a = 0;
    while (a < TAU) { a += (yield) * 15; r.spinA = Math.min(a, TAU); }
    r.spinA = 0;
    yield* waitUntil(() => r.grounded, 2);
    r.tiltBias = 0.15; yield* wait(0.12); r.tiltBias = -0.1; yield* wait(0.12); r.tiltBias = 0;
  },
  *question(r) {
    r.face('look', 1); r.headTarget.rot = pick([-0.28, 0.28]); r.say('question');
    yield* wait(0.9); resetHead(r);
  },
  *giggle(r, t = 1.1) {
    r.face('giggle', t + 0.3); r.say('giggle'); r.flap = 0.6;
    let k = 0;
    while (k < t) { const dt = yield; k += dt; r.tiltBias = Math.sin(k * 30) * 0.08; r.headTarget.x = Math.sin(k * 30 + 1) * 0.03; }
    resetHead(r);
  },
  *surprised(r) {
    r.face('surprised', 0.8); r.say('surprise'); r.sq.v -= 3; r.neckT = 1;
    yield* wait(0.5); r.neckT = 0; r.face('happy', 0.8); r.say('hum'); yield* wait(0.5);
  },
  *stumble(r) {
    const dir = pick([-1, 1]);
    r.face('surprised', 1.1); r.say('surprise'); r.flap = 1;
    r.tiltBias = dir * 0.35; r.vx = dir * r.world.S * 1.3;
    yield* wait(0.25);
    r.tiltBias = -dir * 0.18; r.vx = -dir * r.world.S * 0.35;
    yield* wait(0.22);
    resetHead(r); r.face('happy', 0.9); r.say('hum'); yield* wait(0.7);
  },
  *fall(r, dir) {
    dir = dir || (r.x < r.world.cx ? 1 : -1);
    r.target = null; r.face('surprised', 2); r.say('ouch'); r.flap = 1;
    for (let i = 0; i < 2; i++) { r.tiltBias = dir * 0.28; yield* wait(0.11); r.tiltBias = -dir * 0.14; yield* wait(0.09); }
    r.tiltBias = 0; r.mode = 'down'; r.pivot = [dir * GEO.spread, 0];
    const rest = dir * 1.1;
    let a = r.roll.x, v = 0;
    while (Math.abs(a) < Math.abs(rest)) { const dt = yield; v += dir * 20 * dt; a += v * dt; r.roll.x = a; r.roll.v = 0; }
    r.roll.x = rest; r.roll.v = -dir * 3;
    Snd.sfx.thud(); World.shake(6);
    const h = r.headWorld();
    FX.burst('dust', r.x + dir * r.px * 0.9, r.y - 4, 7, { min: 40, max: 110, p: { life: 0.7 } });
    r.flap = 0; r.kick = 1; r.face('dizzy', 1.7);
    for (let i = 0; i < 3; i++) FX.add({ kind: 'star', x: r.x + dir * r.px * 0.85 + rand(-20, 20), y: r.y - r.px * 0.35, vy: -50, vx: rand(-40, 40), life: 1.2, s: 0.8, vr: 4 });
    let t = 1.5;
    while (t > 0) { const dt = yield; t -= dt; spring(r.roll, rest, 120, 8, dt); }
    r.kick = 0; r.say('grumpy'); r.face('look', 0.8);
    t = 0;
    while (r.mode === 'down' && t < 2) { const dt = yield; t += dt; spring(r.roll, 0, 30, 4, dt); if (Math.abs(r.roll.x) < 0.3) r.mode = 'stand'; }
    r.mode = 'stand';
    for (const f of r.feet) { f.x = r.x + f.s * GEO.spread * r.px; f.y = r.y; }
    yield* wait(0.35);
    for (let i = 0; i < 4; i++) { r.headTarget.x = (i % 2 ? 1 : -1) * 0.05; yield* wait(0.07); }
    resetHead(r); r.pivot = [0, 0];
    r.face('happy', 1.2); r.say('happy');
    yield* wait(0.6);
  },
  *plop(r) {
    r.face('surprised', 0.5); r.say('ouch'); r.mode = 'sit';
    yield* wait(0.22); Snd.sfx.plop(); r.sq.v += 3; r.face('dizzy', 1); r.kick = 1;
    yield* wait(1.1); r.kick = 0; r.face('giggle', 1); r.say('giggle');
    yield* wait(0.7); r.mode = 'stand'; r.hop(0.4); yield* waitUntil(() => r.grounded, 2);
  },
  *sitIdle(r) {
    r.mode = 'sit'; Snd.sfx.plop(); r.face('happy', 1.2); r.say('hum'); r.kick = 1;
    yield* wait(rand(2.2, 3.5)); r.kick = 0; r.face('sleepy', 1.4); yield* wait(1.2);
    r.mode = 'stand'; r.crouchT = 0.5; yield* wait(0.25); r.crouchT = 0;
  },
  *dig(r) {
    r.say('question'); r.crouchT = 0.7; r.headTarget.y = 0.1; r.headTarget.rot = 0.08;
    yield* wait(0.3);
    for (let i = 0; i < 4; i++) {
      r.billHold = 0.6; r.headTarget.y = 0.17; Snd.sfx.knock();
      FX.burst('crumb', r.x + rand(-12, 12), r.y - 6, 3, { dir: -Math.PI / 2, spread: 0.9, min: 60, max: 130, p: { g: 700, life: 0.6, col: '#C9A9E0', floor: r.y } });
      yield* wait(0.13); r.billHold = 0; r.headTarget.y = 0.08; yield* wait(0.11);
    }
    resetHead(r);
    if (chance(0.55)) { r.face('star', 1.3); r.say('wow'); Game.dropBolt(r.x + rand(-20, 20), r.y - 20); }
    else { r.face('look', 1); r.say('hum'); }
    yield* wait(0.8);
  },
  *nod(r) {
    r.face('look', 1.2);
    for (let i = 0; i < 2; i++) { r.headTarget.y = 0.07; r.headTarget.rot = 0.06; Snd.sfx.servo(); yield* wait(0.12); r.headTarget.y = -0.02; r.headTarget.rot = 0; yield* wait(0.14); }
    r.say('question'); r.headTarget.rot = 0.25; yield* wait(0.8); resetHead(r);
  },
  *wobble(r) {
    r.face('happy', 1.5); Snd.sfx.bubble();
    for (let i = 0; i < 6; i++) { r.sq.v += (i % 2 ? -1 : 1) * 4; r.tiltBias = (i % 2 ? -1 : 1) * 0.05; yield* wait(0.12); }
    r.tiltBias = 0; r.say('hum'); yield* wait(0.5);
  },
  *glow(r) {
    r.face('happy', 2.2); r.say('hum');
    let t = 0;
    while (t < 2) { const dt = yield; t += dt; r.glow = Math.sin(Math.min(1, t / 2) * Math.PI); if (chance(dt * 6)) FX.add({ kind: 'spark', x: r.x + rand(-40, 40), y: r.headWorld().y + rand(-30, 30), vy: -30, life: 0.8, col: '#FFE9A8', s: 0.6 }); }
    r.glow = 0;
  },
  *bubbles(r) {
    r.face('look', 2.5);
    const h = r.headWorld();
    for (let i = 0; i < 5; i++) {
      const b = FX.add({ kind: 'bubble', x: h.x + r.px * 0.42, y: h.y - r.px * 0.3, vy: -rand(40, 70), vx: rand(-15, 15), life: 2.2, r: rand(5, 11) });
      Snd.sfx.bubble(); r.lookAt(b.x, b.y - 80, 1.5);
      yield* wait(0.3);
    }
    yield* wait(0.8); r.face('happy', 1); r.say('hum'); yield* wait(0.5);
  },
  *dance(r, beats = 8) {
    r.face('happy', beats * 0.5); r.say('hum');
    for (let i = 0; i < beats; i++) {
      const s = i % 2 ? 1 : -1;
      r.tiltBias = s * 0.12; r.headTarget.rot = s * 0.18; r.flap = 0.7; r.crouchT = 0.5; r.beat = 1;
      yield* wait(0.13); r.crouchT = 0; r.beat = 0;
      if (i % 4 === 3) { r.hop(0.5); }
      yield* wait(0.14);
    }
    resetHead(r);
  },
  *pose(r) {
    r.face('star', 1.8); r.say('wow');
    r.poseFeet = [{ x: -0.1, y: 0 }, { x: 0.17, y: -0.02, lift: 0.13, rot: -0.6 }]; r.tiltBias = -0.12; r.flap = 0.4;
    const h = r.headWorld();
    for (let i = 0; i < 4; i++) { FX.add({ kind: 'spark', x: h.x + rand(-40, 40), y: h.y + rand(-30, 10), life: 0.6, s: 1.2, vr: 3 }); Snd.sfx.sparkle(); yield* wait(0.3); }
    r.poseFeet = null; resetHead(r); yield* wait(0.3);
  },
  *grow(r) {
    r.face('closed', 1.2); r.say('hum'); r.crouchT = 0.6;
    yield* wait(0.5); r.crouchT = -0.2; r.ant.v += 8; r.neckT = 1;
    for (let i = 0; i < 6; i++) FX.add({ kind: 'spark', x: r.headWorld().x + rand(-30, 30), y: r.headWorld().y - r.px * 0.45, vy: -40, life: 1, col: '#C9FF9E' });
    Snd.sfx.sparkle(); r.face('love', 1.2); yield* wait(1); resetHead(r);
  },
  *float(r) {
    r.face('happy', 2); r.say('wow'); r.lowGrav = true; r.flap = 1;
    r.crouchT = 0.6; yield* wait(0.12); r.crouchT = 0; r.hop(1.1);
    yield* waitUntil(() => r.grounded, 4); r.lowGrav = false; r.flap = 0;
  },
  *dash(r) {
    const tx = r.x < r.world.cx ? r.world.W * 0.8 : r.world.W * 0.2;
    r.face('grumpy', 0.4); r.crouchT = 0.6; yield* wait(0.3); r.crouchT = 0; r.say('wow');
    r.walkTo(tx, r.y, 2.6);
    while (r.target) { yield; if (chance(0.5)) FX.add({ kind: 'spark', x: r.x - sign(r.vx) * 20, y: r.y - r.px * 0.3, vx: -r.vx * 0.2, life: 0.4, col: '#FFC145', s: 0.6 }); }
    r.tiltBias = -sign(r.vx || 1) * 0.2; FX.burst('dust', r.x, r.y, 6, { min: 30, max: 90 }); Snd.sfx.whoosh();
    yield* wait(0.3); r.tiltBias = 0; r.face('star', 1); yield* wait(0.6);
  },
  *orbit(r) {
    r.face('look', 2.6);
    const h = r.headWorld();
    let a = 0;
    while (a < TAU * 1.5) {
      const dt = yield; a += dt * 4;
      const x = h.x + Math.cos(a) * r.px * 0.9, y = h.y - r.px * 0.2 + Math.sin(a) * r.px * 0.35;
      r.lookAt(x, y, 0.2);
      if (chance(dt * 30)) FX.add({ kind: 'spark', x, y, life: 0.4, col: '#9FE8FF', s: 0.5 });
    }
    r.face('happy', 1); r.say('hum'); yield* wait(0.4);
  },
  *zapIt(r) {
    r.zap = 1; Snd.sfx.zap(); r.face('surprised', 0.8); r.hop(0.6);
    yield* waitUntil(() => r.grounded, 2);
    r.face('sad', 1.2); r.say('no'); yield* wait(1.2);
  },
  *buzz(r) {
    r.face('happy', 1.6); r.say('giggle');
    for (let i = 0; i < 3; i++) { r.hop(0.45); Snd.sfx.boing(); r.ant.v += 10; yield* waitUntil(() => r.grounded, 2); yield* wait(0.05); }
  },
  *greet(r) {
    const w = r.world;
    r.face('happy', 3); r.say('hello');
    yield* walk(r, clamp(r.x, w.W * 0.3, w.W * 0.7), w.floorBottom - 12, 1.3, 4);
    r.flap = 1; r.say('happy'); r.hop(0.6);
    yield* waitUntil(() => r.grounded, 2); r.flap = 0;
  },
  *yawn(r) {
    r.face('sleepy', 2); r.billHold = 1; r.neckT = 0.8; r.say('yawn');
    yield* wait(1); r.billHold = 0; r.neckT = 0; yield* wait(0.6);
  },
  *eat(r, kind) {
    r.target = null; r.turnOverride = 0; r.face('surprised', 0.3); r.billHold = 1;
    yield* wait(0.22);
    const h = r.headWorld();
    for (let i = 0; i < 3; i++) {
      r.billHold = 0.12; Snd.sfx.munch(); r.face('squint', 0.5); r.headTarget.y = 0.03;
      FX.burst('crumb', h.x, h.y + r.px * 0.35, 3, { min: 50, max: 120, p: { g: 700, life: 0.7, col: kind === 'candy' ? '#FF7FB8' : kind === 'oil' ? '#7FD3FF' : '#E8A05A', floor: r.y } });
      yield* wait(0.15); r.billHold = 0.55; r.headTarget.y = 0; yield* wait(0.12);
    }
    resetHead(r); r.face('love', 1.3); r.say('yummy');
    FX.add({ kind: 'heart', x: h.x, y: h.y - r.px * 0.4, vy: -60, life: 1.2 });
    yield* wait(0.8);
    if (chance(0.35)) { Snd.sfx.burp(); r.billHold = 0.5; r.face('surprised', 0.4); yield* wait(0.3); r.billHold = 0; r.face('giggle', 0.9); r.say('giggle'); yield* wait(0.8); }
  },
  *shakeOff(r) {
    r.face('closed', 1.2); Snd.sfx.shake();
    const h = r.headWorld();
    for (let i = 0; i < 12; i++) {
      r.headTarget.x = (i % 2 ? 1 : -1) * 0.08; r.tiltBias = (i % 2 ? 1 : -1) * 0.12;
      FX.add({ kind: 'drop', x: h.x + rand(-1, 1) * r.px * 0.5, y: h.y + rand(-0.3, 0.6) * r.px, vx: (i % 2 ? 1 : -1) * rand(120, 260), vy: rand(-200, -60), g: 900, life: 0.8 });
      if (r.foam.length) r.foam.splice(0, Math.ceil(r.foam.length / 3));
      yield* wait(0.055);
    }
    resetHead(r); r.foam = []; r.dirt = 0;
    for (let i = 0; i < 6; i++) FX.add({ kind: 'spark', x: h.x + rand(-1, 1) * r.px * 0.6, y: h.y + rand(-0.5, 0.8) * r.px, life: 0.9, s: rand(0.8, 1.4), vr: 3 });
    Snd.sfx.sparkle(); r.face('star', 1.3); r.say('wow');
    yield* wait(0.9);
  },
  *sleep(r) {
    const w = r.world;
    r.face('sleepy', 30);
    yield* walk(r, w.dock.x, w.dock.y + 2, 0.75, 6);
    r.crouchT = 0.6; yield* wait(0.15); r.crouchT = 0; r.hop(0.45);
    yield* waitUntil(() => r.grounded, 2);
    r.target = null; r.x = w.dock.x; r.y = w.dock.y + 2;
    r.mode = 'sleep'; Snd.sfx.plop();
    r.billHold = 1; r.say('yawn'); yield* wait(0.9); r.billHold = 0;
    r.sleeping = true; r.face('closed', 9999);
    let zt = 0, st = 1.5;
    while (r.sleeping) {
      const dt = yield; zt -= dt; st -= dt;
      r.headTarget.y = 0.05 + Math.sin(r.t * 1.3) * 0.015; r.headTarget.rot = 0.14;
      if (zt <= 0) { zt = 1.1; const h = r.headWorld(); FX.add({ kind: 'z', x: h.x + r.px * 0.35, y: h.y - r.px * 0.3, vx: 18, vy: -32, life: 2.2, grow: 0.8, s: 0.7 }); }
      if (st <= 0) { st = 3.2; Snd.sfx.snore(); }
    }
    // woken up
    resetHead(r); r.face('sleepy', 1.4); r.billHold = 1; r.say('yawn'); r.neckT = 1; r.flap = 0.5;
    yield* wait(0.9); r.billHold = 0; r.neckT = 0; r.flap = 0;
    r.mode = 'stand'; r.face('happy', 1.2); r.say(r.wokeEarly ? 'grumpy' : 'hello'); r.hop(0.5);
    yield* waitUntil(() => r.grounded, 2);
    yield* walk(r, w.cx, lerp(w.floorTop, w.floorBottom, 0.62), 1, 4);
  },
  *knockReply(r, intervals, pt) {
    r.lookAt(pt.x, pt.y, 5); r.face('look', 0.7); r.headTarget.rot = 0.22; r.say('question');
    yield* wait(0.45); resetHead(r);
    yield* walk(r, clamp(lerp(r.x, pt.x, 0.7), r.world.W * 0.25, r.world.W * 0.75), r.world.floorBottom - 10, 1.4, 3);
    r.lookAt(pt.x, pt.y, 4);
    yield* wait(0.15);
    for (let i = 0; i <= intervals.length; i++) {
      r.headTarget.y = 0.09; r.headTarget.rot = 0.05; r.billHold = 0.5; r.say('beep', { pitch: 1 + (i % 4) * 0.12 }); Snd.sfx.knock();
      const h = r.headWorld(); FX.add({ kind: 'ripple', x: h.x, y: h.y + r.px * 0.3, life: 0.5, s: 0.6, layer: 1 });
      yield* wait(0.07); r.headTarget.y = 0; r.headTarget.rot = 0; r.billHold = 0;
      if (i < intervals.length) yield* wait(Math.max(0.06, intervals[i] - 0.07));
    }
    yield* wait(0.3); r.face('happy', 1.3); r.say('happy'); r.flap = 1;
    FX.add({ kind: 'heart', x: r.headWorld().x, y: r.headWorld().y - r.px * 0.4, vy: -60, life: 1.2 });
    yield* wait(0.6); r.flap = 0;
    Game.friend(2, 'knock');
  },
  *kick(r, ball) {
    r.face('star', 1.5); r.say('wow');
    let tries = 0;
    while (tries++ < 6 && ball.alive) {
      const side = ball.x > r.x ? -1 : 1;
      r.walkTo(ball.x + side * r.px * 0.18, ball.y + 4, 1.6);
      let t = 0;
      while (r.target && t < 3) { t += yield; r.target = r.world.clampFloor(ball.x + side * r.px * 0.18, ball.y + 4); r.lookAt(ball.x, ball.y - ball.z, 0.3); if (dist(r.x, r.y, ball.x, ball.y) < r.px * 0.3) break; }
      if (dist(r.x, r.y, ball.x, ball.y) < r.px * 0.42 && ball.z < r.px * 0.3) {
        r.tiltBias = side * 0.15; r.crouchT = 0.4;
        yield* wait(0.08);
        const ang = rand(-Math.PI * 0.85, -Math.PI * 0.15) + (side > 0 ? 0 : 0);
        const toward = r.world.cx - ball.x;
        ball.vx = (sign(toward) * rand(0.6, 1.4) - side * 0.6) * r.world.S * 2.2;
        ball.vy = rand(-1, 1) * r.world.S * 1.2; ball.vz = r.world.S * rand(2.4, 3.4); ball.spin = ball.vx * 0.02;
        Snd.sfx.kick(); r.say('happy'); r.face('happy', 1); r.tiltBias = -side * 0.1; r.crouchT = 0;
        Game.stat('kicks'); Game.need('fun', 6); Game.friend(1, 'ball');
        void ang;
        yield* wait(0.3); r.tiltBias = 0;
        return;
      }
    }
    resetHead(r);
  },
  *celebrate(r) {
    Snd.sfx.fanfare(); r.face('star', 2.4); r.say('wow');
    const h = r.headWorld();
    for (let i = 0; i < 30; i++) FX.add({ kind: 'confetti', x: h.x + rand(-60, 60), y: h.y - rand(20, 80), vx: rand(-160, 160), vy: rand(-320, -80), g: 500, life: 1.8, col: pick(['#FF5C8A', '#FFD84A', '#4FC3FF', '#7BE07A', '#B266FF']), vr: rand(-10, 10) });
    yield* B.spin(r);
    yield* B.happyHop(r, 2);
  },
  *tryHat(r) {
    r.face('surprised', 0.6); r.say('surprise'); r.neckT = 1;
    yield* wait(0.5); r.neckT = 0; r.face('love', 1.4); r.say('love');
    yield* B.happyHop(r, 2);
  },
  *fly(r) {
    r.face('star', 4); r.say('wow'); r.flying = 3.2; r.vz = r.world.S * 1.6;
    let t = 0;
    while (t < 3) {
      const dt = yield; t += dt;
      r.vz = damp(r.vz, (r.z < r.world.S * 0.9 ? 1 : -0.2) * r.world.S * 0.8, 3, dt);
      r.vx = Math.sin(t * 1.7) * r.world.S * 0.9;
      r.flap = 1;
      if (chance(dt * 8)) FX.add({ kind: 'spark', x: r.x + rand(-20, 20), y: r.y - r.z - r.px * 1.4, life: 0.5, s: 0.5 });
    }
    r.flap = 0; r.flying = 0;
    yield* waitUntil(() => r.grounded, 4);
    r.face('happy', 1); r.say('happy');
  },
  *think(r, icon) {
    r.thinkOf(icon, 3); r.face(icon === 'energy' ? 'sleepy' : 'sad', 1.5); r.say(icon === 'energy' ? 'yawn' : 'sad');
    r.headTarget.rot = 0.18; yield* wait(1.4); resetHead(r); yield* wait(0.6);
  },
};

const TRAITS = { hop: 'happyHop', sit: 'sitIdle', dig: 'dig', nod: 'nod', spin: 'spin', wobble: 'wobble', glow: 'glow', bubbles: 'bubbles', dance: 'dance', pose: 'pose', grow: 'grow', float: 'float', dash: 'dash', orbit: 'orbit', zap: 'zapIt', buzz: 'buzz' };
