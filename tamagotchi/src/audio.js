'use strict';
// All sounds are synthesized (no files): squeaky robot voices + toy SFX.
const Snd = (() => {
  let ac = null, out = null, noiseBuf = null, enabled = true;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.15;
    out = ac.createGain(); out.gain.value = 0.8;
    out.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => ac && enabled && ac.state === 'running';
  function osc(o) {
    if (!ok()) return;
    const { type = 'sine', f0 = 440, f1 = f0, dur = 0.1, vol = 0.2, at = 0, a = 0.006, vib = 0, vibF = 22, glide = 'exp', pan = 0 } = o;
    const t = ac.currentTime + at;
    const os = ac.createOscillator(); os.type = type;
    os.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) {
      if (glide === 'exp') os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      else os.frequency.linearRampToValueAtTime(Math.max(20, f1), t + dur);
    }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vib) {
      const l = ac.createOscillator(); l.frequency.value = vibF;
      const lg = ac.createGain(); lg.gain.value = vib * f0;
      l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    let node = g;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    os.connect(g); node.connect(out);
    os.start(t); os.stop(t + dur + 0.05);
  }
  function noise(o) {
    if (!ok()) return;
    const { dur = 0.1, vol = 0.2, at = 0, f = 1500, f1 = f, q = 1, type = 'bandpass', a = 0.004 } = o;
    const t = ac.currentTime + at;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f1 !== f) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // ---- robot voice: contour = list of [startMul, endMul, dur, gap] ----
  const V = {
    hello: [[1.0, 1.28, 0.07, 0.04], [1.5, 1.95, 0.12, 0]],
    happy: [[1.2, 1.5, 0.06, 0.02], [1.35, 1.7, 0.06, 0.02], [1.7, 2.25, 0.11, 0]],
    giggle: [[1.9, 1.6, 0.05, 0.025], [2.1, 1.7, 0.05, 0.025], [1.9, 1.6, 0.05, 0.025], [2.2, 1.8, 0.05, 0.025], [2.0, 1.6, 0.07, 0]],
    question: [[1.0, 1.0, 0.06, 0.03], [1.05, 1.9, 0.17, 0]],
    surprise: [[0.9, 2.6, 0.1, 0]],
    sad: [[1.3, 0.75, 0.38, 0]],
    love: [[1.2, 1.38, 0.16, 0.05], [1.0, 1.18, 0.24, 0]],
    ouch: [[2.3, 1.0, 0.12, 0.04], [1.2, 0.8, 0.1, 0]],
    grumpy: [[0.7, 0.55, 0.12, 0.03], [0.62, 0.45, 0.16, 0]],
    yummy: [[1.0, 1.3, 0.06, 0.02], [1.3, 1.0, 0.06, 0.02], [1.05, 1.7, 0.12, 0]],
    wow: [[1.0, 1.2, 0.06, 0.01], [1.25, 1.5, 0.06, 0.01], [1.5, 1.9, 0.06, 0.01], [2.0, 2.5, 0.14, 0]],
    yes: [[1.3, 1.6, 0.07, 0.03], [1.6, 1.6, 0.07, 0]],
    no: [[1.4, 1.1, 0.08, 0.04], [1.2, 0.9, 0.1, 0]],
    hum: [[1.0, 1.12, 0.14, 0.03], [1.12, 1.0, 0.14, 0.03], [1.33, 1.5, 0.2, 0]],
    yawn: [[0.85, 1.3, 0.3, 0], [1.3, 0.6, 0.5, 0]],
    beep: [[1.5, 1.5, 0.08, 0]],
  };
  // returns mouth-flap schedule [{t, d}] so the bill moves in sync
  function voice(vc, kind, opts = {}) {
    const contour = kind === 'babble' ? babble(opts.n || 4) : V[kind] || V.beep;
    const base = vc.base * (opts.pitch || 1), sp = 1 / (vc.speed || 1);
    const sched = [];
    let at = opts.at || 0;
    const wave = vc.wave === 'sawtooth' ? 'sawtooth' : vc.wave;
    const vol = (vc.wave === 'square' || vc.wave === 'sawtooth' ? 0.07 : 0.17) * (opts.vol || 1);
    for (const [m0, m1, d, gap] of contour) {
      const j = rand(0.96, 1.04), dd = d * sp;
      osc({ type: wave, f0: base * m0 * j, f1: base * m1 * j, dur: dd, vol, at, vib: kind === 'sad' || kind === 'love' ? 0.03 : 0.012, vibF: kind === 'sad' ? 7 : 24 });
      osc({ type: 'sine', f0: base * m0 * j * 2, f1: base * m1 * j * 2, dur: dd * 0.9, vol: vol * 0.18, at });
      sched.push({ t: at, d: dd });
      at += dd + gap * sp;
    }
    if (kind === 'yawn') noise({ dur: 0.7, vol: 0.05, f: 900, f1: 400, q: 0.8 });
    return sched;
  }
  function babble(n) {
    const c = [];
    for (let i = 0; i < n; i++) {
      const a = rand(0.9, 2.0), b = a * rand(0.7, 1.5);
      c.push([a, b, rand(0.04, 0.11), rand(0.01, 0.05)]);
    }
    return c;
  }
  function purr(vc, dur = 1.2) {
    if (!ok()) return;
    const t = ac.currentTime;
    const os = ac.createOscillator(); os.type = 'triangle'; os.frequency.value = 70 + vc.base * 0.03;
    const am = ac.createOscillator(); am.frequency.value = 22;
    const amg = ac.createGain(); amg.gain.value = 0.5;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const vca = ac.createGain(); vca.gain.value = 0.5;
    am.connect(amg); amg.connect(vca.gain);
    os.connect(vca); vca.connect(g); g.connect(out);
    os.start(t); am.start(t); os.stop(t + dur + 0.05); am.stop(t + dur + 0.05);
    osc({ type: 'sine', f0: vc.base * 0.9, f1: vc.base * 1.05, dur: dur * 0.6, vol: 0.04, at: 0.2, vib: 0.02, vibF: 6 });
  }

  const sfx = {
    step(v = 1) { noise({ dur: 0.04, vol: 0.05 * v, f: 2500, q: 2 }); osc({ f0: 190, f1: 120, dur: 0.05, vol: 0.06 * v }); },
    servo() { osc({ type: 'sawtooth', f0: 260, f1: 380, dur: 0.14, vol: 0.018 }); },
    boing() { osc({ f0: 180, f1: 620, dur: 0.28, vol: 0.14, vib: 0.18, vibF: 18, glide: 'lin' }); },
    hop() { osc({ f0: 300, f1: 900, dur: 0.12, vol: 0.1 }); },
    thud() { osc({ f0: 140, f1: 45, dur: 0.22, vol: 0.32 }); noise({ dur: 0.14, vol: 0.12, f: 400, type: 'lowpass' }); },
    plop() { osc({ f0: 300, f1: 90, dur: 0.16, vol: 0.2 }); },
    pop(p = 1) { osc({ f0: 900 * p, f1: 1800 * p, dur: 0.06, vol: 0.09 }); },
    bubble() { osc({ f0: rand(500, 900), f1: rand(1200, 2000), dur: 0.07, vol: 0.06 }); },
    coin(p = 1) { osc({ type: 'square', f0: 988 * p, dur: 0.07, vol: 0.05 }); osc({ type: 'square', f0: 1319 * p, dur: 0.16, vol: 0.05, at: 0.07 }); },
    sparkle() { [1568, 2093, 2637, 3136].forEach((f, i) => osc({ type: 'triangle', f0: f, dur: 0.14, vol: 0.05, at: i * 0.05 })); },
    ding() { osc({ type: 'triangle', f0: 1046, dur: 0.5, vol: 0.12 }); osc({ type: 'sine', f0: 2093, dur: 0.4, vol: 0.05 }); },
    fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => osc({ type: 'triangle', f0: f, dur: i === 5 ? 0.4 : 0.12, vol: 0.11, at: i * 0.1 })); },
    munch() { for (let i = 0; i < 3; i++) { noise({ dur: 0.06, vol: 0.14, f: 1800, q: 1.5, at: i * 0.13 }); osc({ f0: 240, f1: 160, dur: 0.05, vol: 0.08, at: i * 0.13 }); } },
    burp() { osc({ type: 'sawtooth', f0: 140, f1: 90, dur: 0.22, vol: 0.06, vib: 0.2, vibF: 30 }); },
    splash() { noise({ dur: 0.35, vol: 0.12, f: 3000, f1: 800, q: 0.6 }); },
    scrub() { noise({ dur: 0.08, vol: 0.05, f: rand(2500, 4000), q: 2 }); },
    shake() { for (let i = 0; i < 6; i++) noise({ dur: 0.05, vol: 0.06, f: 3500, q: 1, at: i * 0.06 }); },
    knock() { osc({ f0: 1900, f1: 1300, dur: 0.035, vol: 0.12 }); osc({ f0: 420, f1: 300, dur: 0.06, vol: 0.09 }); },
    whoosh() { noise({ dur: 0.3, vol: 0.08, f: 400, f1: 2500, q: 0.7 }); },
    zap() { osc({ type: 'sawtooth', f0: 1200, f1: 200, dur: 0.16, vol: 0.05, vib: 0.3, vibF: 60 }); },
    click() { osc({ f0: 1400, f1: 1100, dur: 0.035, vol: 0.06 }); },
    open() { osc({ f0: 500, f1: 900, dur: 0.08, vol: 0.06 }); },
    close() { osc({ f0: 800, f1: 450, dur: 0.08, vol: 0.06 }); },
    kick() { osc({ f0: 200, f1: 70, dur: 0.12, vol: 0.25 }); noise({ dur: 0.05, vol: 0.08, f: 1500 }); },
    snore() { noise({ dur: 0.9, vol: 0.035, f: 300, f1: 700, q: 1.2, a: 0.4 }); },
    tap(f) { osc({ type: 'triangle', f0: f, dur: 0.22, vol: 0.14 }); osc({ f0: f * 2, dur: 0.15, vol: 0.04 }); },
    error() { osc({ type: 'triangle', f0: 330, f1: 260, dur: 0.18, vol: 0.1 }); },
    buy() { this.coin(); this.sparkle(); },
    lightOff() { osc({ f0: 600, f1: 300, dur: 0.1, vol: 0.06 }); },
    lightOn() { osc({ f0: 300, f1: 700, dur: 0.1, vol: 0.06 }); },
  };

  // ---- tiny placeholder groove for dances & mini-games (owner makes the real music in Suno) ----
  const Music = {
    timer: null, step: 0, next: 0, bpm: 112, onBeat: null,
    start(bpm = 112, onBeat = null) {
      if (!ac) return;
      this.stop(); this.bpm = bpm; this.onBeat = onBeat; this.step = 0; this.next = ac.currentTime + 0.08;
      this.timer = setInterval(() => this.tick(), 25);
    },
    stop() { if (this.timer) clearInterval(this.timer); this.timer = null; },
    tick() {
      const spb = 60 / this.bpm / 4; // 16ths
      while (this.next < ac.currentTime + 0.12) {
        const s = this.step % 32, at = this.next - ac.currentTime;
        const bar = Math.floor(this.step / 16) % 4;
        const root = [261.6, 220, 174.6, 196][bar];
        if (enabled) {
          if (s % 4 === 0) { osc({ f0: 150, f1: 48, dur: 0.16, vol: 0.32, at }); }
          if (s % 8 === 4) noise({ dur: 0.1, vol: 0.09, f: 1800, q: 0.8, at });
          if (s % 2 === 1) noise({ dur: 0.03, vol: 0.03, f: 7000, q: 1, type: 'highpass', at });
          if (s % 4 === 2 || s % 8 === 0) osc({ type: 'triangle', f0: root / 2, dur: spb * 1.6, vol: 0.13, at });
          const mel = [0, -1, 4, -1, 7, -1, 4, 9, 7, -1, 4, -1, 2, -1, 0, -1, 0, -1, 4, -1, 7, -1, 9, 12, 9, -1, 7, -1, 4, 2, 0, -1][s];
          if (mel >= 0) osc({ type: 'square', f0: 523.25 * Math.pow(2, [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21][mel] / 12), dur: spb * 0.9, vol: 0.03, at });
        }
        if (s % 4 === 0 && this.onBeat) { const st = this.step; setTimeout(() => this.onBeat && this.onBeat(st / 4), Math.max(0, at * 1000)); }
        this.step++; this.next += spb;
      }
    },
  };

  return {
    init, osc, noise, voice, purr, sfx, Music,
    get on() { return enabled; },
    set on(v) { enabled = v; if (!v) Music.stop(); },
    get ready() { return !!ac; },
  };
})();
