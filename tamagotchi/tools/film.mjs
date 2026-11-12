// Records a short demo video of the game, frame by frame, with its own synthesized sound.
// node tools/film.mjs [out.mp4]
// Time is frozen (Playwright clock) and advanced one video frame at a time, so motion is smooth
// regardless of machine speed. WebAudio is redirected into an OfflineAudioContext driven by the same
// clock and rendered at the end, so every squeak lands exactly on its bill flap.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'video', 'robogochi-demo.mp4'));
const PROBE = process.env.PROBE ? path.resolve(process.env.PROBE) : null; // folder: also dump numbered stills
const W = 432, H = 768, DSF = 2.5, FPS = 30, FR = 1000 / FPS;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (PROBE) fs.mkdirSync(PROBE, { recursive: true });
const tmpV = OUT.replace(/\.mp4$/, '.video.tmp.mp4'), tmpA = OUT.replace(/\.mp4$/, '.audio.tmp.wav');

// ---------- in-page shim: offline audio + finger + captions ----------
const SHIM = String.raw`(() => {
  const SR = 48000, LEN = SR * 150;
  const T0 = performance.now();
  window.__filmT0 = T0;
  const RealOff = window.OfflineAudioContext;
  function FakeAC() {
    if (window.__actx) return window.__actx;
    const c = new RealOff(2, LEN, SR);
    Object.defineProperty(c, 'currentTime', { get: () => (performance.now() - T0) / 1000 });
    Object.defineProperty(c, 'state', { get: () => 'running' });
    c.resume = () => Promise.resolve(); c.suspend = () => Promise.resolve(); c.close = () => Promise.resolve();
    window.__actx = c; return c;
  }
  window.AudioContext = FakeAC; window.webkitAudioContext = FakeAC;
  window.__renderAudio = async (t0, t1) => {
    if (!window.__actx) return '';
    const buf = await window.__actx.startRendering();
    const a = Math.max(0, Math.round(t0 * SR)), b = Math.min(buf.length, Math.round(t1 * SR));
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const pcm = new Int16Array((b - a) * 2);
    for (let i = a, j = 0; i < b; i++) {
      pcm[j++] = Math.max(-1, Math.min(1, L[i])) * 32767;
      pcm[j++] = Math.max(-1, Math.min(1, R[i])) * 32767;
    }
    const u8 = new Uint8Array(pcm.buffer); let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };

  const F = { x: -99, y: -99, down: false, a: 0, ring: 0 };
  addEventListener('pointerdown', (e) => { F.down = true; F.x = e.clientX; F.y = e.clientY; F.ring = 1; }, true);
  addEventListener('pointermove', (e) => { F.x = e.clientX; F.y = e.clientY; }, true);
  addEventListener('pointerup', () => { F.down = false; }, true);
  const C = { el: null, a: 0, want: 0, text: '' };
  const E = { el: null, a: 0, want: 0 };
  window.__cap = (t) => { if (t) { C.text = t; if (C.el) C.el.textContent = t; C.want = 1; } else C.want = 0; };
  window.__end = (on) => { E.want = on ? 1 : 0; };
  function mount() {
    const st = document.createElement('style');
    st.textContent = '#toast,#hint{display:none!important}' + '#filmFinger{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.55);border:2.5px solid rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(30,20,70,.35);pointer-events:none;z-index:9998;opacity:0}' +
      '#filmRing{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid rgba(255,255,255,.9);pointer-events:none;z-index:9998;opacity:0}' +
      '#filmCap{position:fixed;left:50%;top:124px;transform:translateX(-50%);padding:9px 18px 10px;border-radius:18px;background:rgba(24,22,60,.66);border:1.5px solid rgba(255,255,255,.18);color:#fff;font:900 21px/1.15 Nunito,system-ui,sans-serif;letter-spacing:.2px;white-space:nowrap;pointer-events:none;z-index:9997;opacity:0;text-shadow:0 1px 2px rgba(0,0,0,.35)}' +
      '#filmEnd{position:fixed;left:50%;top:132px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:12px 20px 12px 14px;border-radius:22px;background:rgba(24,22,60,.72);border:1.5px solid rgba(255,255,255,.2);color:#fff;pointer-events:none;z-index:9997;opacity:0;white-space:nowrap}' +
      '#filmEnd img{width:66px;height:auto;display:block}#filmEnd b{display:block;font:900 30px/1 Nunito,system-ui,sans-serif}#filmEnd span{display:block;margin-top:5px;font:800 14px/1.2 Nunito,system-ui,sans-serif;opacity:.85}';
    document.head.appendChild(st);
    const f = document.createElement('div'); f.id = 'filmFinger'; document.body.appendChild(f);
    const r = document.createElement('div'); r.id = 'filmRing'; document.body.appendChild(r);
    C.el = document.createElement('div'); C.el.id = 'filmCap'; C.el.textContent = C.text; document.body.appendChild(C.el);
    E.el = document.createElement('div'); E.el.id = 'filmEnd';
    E.el.innerHTML = '<img src="' + (window.LOGO_SRC || '') + '" alt=""><div><b>Робогочи</b><span>робот-малыш в твоём телефоне<br>Toysberry Game Studio</span></div>';
    document.body.appendChild(E.el);
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      F.a += ((F.down ? 1 : 0) - F.a) * Math.min(1, dt * (F.down ? 28 : 10));
      F.ring = Math.max(0, F.ring - dt * 2.6);
      f.style.opacity = F.a.toFixed(3);
      f.style.transform = 'translate(' + F.x + 'px,' + F.y + 'px) scale(' + (0.85 + 0.15 * F.a).toFixed(3) + ')';
      r.style.opacity = (F.ring * 0.9).toFixed(3);
      r.style.transform = 'translate(' + F.x + 'px,' + F.y + 'px) scale(' + (1 + (1 - F.ring) * 0.9).toFixed(3) + ')';
      C.a += (C.want - C.a) * Math.min(1, dt * 9);
      C.el.style.opacity = C.a.toFixed(3);
      C.el.style.transform = 'translateX(-50%) translateY(' + ((1 - C.a) * 8).toFixed(2) + 'px)';
      E.a += (E.want - E.a) * Math.min(1, dt * 6);
      E.el.style.opacity = E.a.toFixed(3);
      E.el.style.transform = 'translateX(-50%) scale(' + (0.94 + 0.06 * E.a).toFixed(3) + ')';
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', mount); else mount();
})();`;

// ---------- browser ----------
const pwRoot = path.join(os.homedir(), 'AppData/Local/ms-playwright');
const exe = fs.readdirSync(pwRoot).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
const browser = await chromium.launch({ executablePath: path.join(pwRoot, exe, 'chrome-win64/chrome.exe'), args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'] });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
const page = await context.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
await page.addInitScript(SHIM);
await page.goto(pathToFileURL(path.join(ROOT, 'dist', 'robogochie.html')).href);
await page.evaluate(() => document.fonts.ready.then(() => 1));
await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 200));
const cdp = await context.newCDPSession(page);
await cdp.send('Animation.enable');

// ---------- ffmpeg (frames in, H.264 out) ----------
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmpV], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));

// ---------- director ----------
let nFrames = 0, recording = false, audioStart = 0, realT = Date.now();
const fx = { x: W / 2, y: H / 2 };
async function grab() {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: W, height: H, scale: DSF } });
  const buf = Buffer.from(data, 'base64');
  if (PROBE && nFrames % 15 === 0) fs.writeFileSync(path.join(PROBE, String(nFrames).padStart(5, '0') + '.jpg'), buf);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  nFrames++;
  if (nFrames === 40) {
    // CSS animations run on real time; slow them to match the capture speed
    const msPer = (Date.now() - realT) / 40;
    await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.min(1, FR / msPer) });
  }
}
async function frames(n) {
  for (let i = 0; i < n; i++) {
    await page.clock.runFor(FR);
    if (recording) await grab();
  }
}
const sec = (s) => frames(Math.max(1, Math.round(s * FPS)));
const ev = (fn, arg) => page.evaluate(fn, arg);
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
// move the finger to a point (or a point computed in the page each frame), sub = extra pointer moves per frame
async function glide(target, s, sub = 1) {
  const n = Math.max(1, Math.round(s * FPS));
  const x0 = fx.x, y0 = fx.y;
  for (let i = 1; i <= n; i++) {
    const t = typeof target === 'function' ? await ev(target) : target;
    for (let j = 1; j <= sub; j++) {
      const k = ease((i - 1 + j / sub) / n);
      fx.x = x0 + (t.x - x0) * k; fx.y = y0 + (t.y - y0) * k;
      await page.mouse.move(fx.x, fx.y);
    }
    await frames(1);
  }
}
async function jump(p) { fx.x = p.x; fx.y = p.y; await page.mouse.move(p.x, p.y); }
async function tap(p) { await jump(p); await page.mouse.down(); await frames(3); await page.mouse.up(); await frames(1); }
async function el(sel) {
  const p = await ev((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  if (!p) throw new Error('no element ' + sel);
  return p;
}
const tapEl = async (sel) => tap(await el(sel));
const cap = (t) => ev((t) => window.__cap(t), t);
const head = () => ev(() => { const h = __rg.Room.robot.headWorld(); return { x: h.x, y: h.y }; });
const headFn = (dx = 0, dy = 0) => new Function(`const h=__rg.Room.robot.headWorld();return {x:h.x+(${dx}),y:h.y+(${dy})}`);

// ===== scenario =====
// boot: first tap enables sound (not filmed), then the studio logo lights up on the robot's visor
await frames(10);
await tap({ x: W / 2, y: H * 0.6 });
audioStart = await ev(() => (performance.now() - window.__filmT0) / 1000) + 1 / FPS;
recording = true; realT = Date.now();
await jump({ x: -60, y: H * 0.9 });
await sec(6.4);

// choose
await cap('Выбери малыша');
const pik = await ev(() => { const C = __rg.Choose; const r = C.bots.find((b) => b.def.id === 'pik') || C.bots[0]; return { x: r.x, y: r.y - r.px * 0.6 }; });
await glide(pik, 0.5); await tap(pik); await sec(1.2);
await glide(await el('#pickBtn'), 0.4); await tapEl('#pickBtn'); await sec(0.9);
await cap('Дай ему имя');
await glide(await el('#nameOk'), 0.4); await tapEl('#nameOk');
await ev(() => { const G = __rg.Game; G.s.hints = { pet: 1, feed: 1, knock: 1, tap: 1, lift: 1, wash: 1, sleep: 1, games: 1, shop: 1 }; G.s.bolts = 160; G.s.demoAll = true; G.save(); UI.bolts(); });
await sec(0.6);
await cap('Он живёт в твоём телефоне');
await sec(1.9);

// pet
await cap('Погладь — заурчит');
await ev(() => { const r = __rg.Room.robot; r.stop(); r.target = null; });
await glide(headFn(-46, -6), 0.4);
await page.mouse.down();
for (let i = 0; i < 3; i++) { await glide(headFn(46, -10), 0.42, 2); await glide(headFn(-46, -4), 0.42, 2); }
await page.mouse.up(); await sec(1.0);

// tap five times
await cap('Тыкни пять раз — шлёп!');
await sec(0.3);
for (let i = 0; i < 5; i++) { const h = await head(); await glide({ x: h.x + 6, y: h.y + 4 }, 0.08); await tap({ x: h.x + 6, y: h.y + 4 }); await sec(0.06); }
await jump({ x: -60, y: fx.y }); await sec(3.0);

// knock on the glass
await cap('Постучи по стеклу — ответит');
const glass = await ev(() => ({ x: __rg.World.W * 0.3, y: __rg.World.floorTop - __rg.World.S * 0.9 }));
await glide(glass, 0.35);
await tap(glass); await sec(0.15); await tap(glass); await sec(0.33); await tap(glass); await sec(0.12); await tap(glass);
await jump({ x: -60, y: fx.y });
for (let i = 0; i < 60 && !(await ev(() => __rg.Room.robot.coName === 'knock')); i++) await frames(1);
for (let i = 0; i < 150 && (await ev(() => __rg.Room.robot.coName === 'knock')); i++) await frames(1);
await ev(() => { const r = __rg.Room.robot, Wd = __rg.World; r.walkTo(Wd.cx, Wd.floorTop + (Wd.floorBottom - Wd.floorTop) * 0.42, 1.3); });
await sec(1.1);

// feed
await cap('Покорми печенькой');
await tapEl('.act[data-a=food]'); await sec(0.35);
const cookie = await el('#tray .food');
await glide(cookie, 0.25); await page.mouse.down(); await frames(2);
await glide(() => { const R = __rg.Room, r = R.robot, h = r.headWorld(); return { x: h.x, y: h.y + r.px * 0.5 + 30 }; }, 0.75);
await sec(0.15); await page.mouse.up();
await jump({ x: -60, y: fx.y }); await sec(2.6);

// wash
await cap('Помой губкой');
await tapEl('.act[data-a=wash]'); await sec(0.3);
await glide(headFn(-40, 0), 0.25); await page.mouse.down();
for (let i = 0; i < 6 && (await ev(() => __rg.World.washing)); i++) {
  await glide(headFn(42, (i % 3) * 18 - 10), 0.2, 3);
  await glide(headFn(-42, (i % 3) * 18 + 4), 0.2, 3);
}
await page.mouse.up();
await jump({ x: -60, y: fx.y }); await sec(2.4);
if (await ev(() => __rg.World.washing)) await ev(() => __rg.Room.cancelWash());

// lift by the belly
await cap('Подними за пузико');
const bellyFn = () => { const r = __rg.Room.robot; r.stop(); r.target = null; const ys = []; for (let k = 0.1; k < 0.9; k += 0.02) if (r.hitTest(r.x, r.y - r.px * k) === 'body') ys.push(r.y - r.px * k); return { x: r.x, y: ys.length ? ys[Math.floor(ys.length / 2)] : r.y - r.px * 0.35 }; };
await glide(bellyFn, 0.3);
const belly = await ev(bellyFn); await jump(belly); await page.mouse.down(); await frames(2);
await glide({ x: belly.x - 20, y: belly.y - 150 }, 0.5);
await glide({ x: belly.x + 30, y: belly.y - 165 }, 0.45);
await glide({ x: belly.x - 10, y: belly.y - 150 }, 0.4);
await page.mouse.up();
await jump({ x: -60, y: fx.y }); await sec(1.5);

// shop: propeller hat
await cap('Шапки и мебель за винтики');
await tapEl('.act[data-a=shop]'); await sec(0.6);
await ev(() => document.querySelector('button[data-i=propeller]').scrollIntoView({ block: 'center' })); await frames(2);
await glide(await el('button[data-i=propeller]'), 0.35); await tapEl('button[data-i=propeller]'); await sec(0.7);
await glide(await el('#sheetX'), 0.3); await tapEl('#sheetX');
await jump({ x: -60, y: fx.y }); await sec(1.5);
await cap(null);
await ev(() => { const r = __rg.Room.robot; r.stop(); r.play(__rg.B.fly(r), 2, 'fly'); });
await sec(2.6);

// mini-game: catch the bolts
await cap('Мини-игры за винтики');
await tapEl('.act[data-a=games]'); await sec(0.5);
await glide(await el('.game[data-g=catch]'), 0.3); await tapEl('.game[data-g=catch]');
await sec(1.0);
const gy = H * 0.78;
await glide({ x: W * 0.5, y: gy }, 0.2); await page.mouse.down();
for (const x of [0.25, 0.72, 0.4, 0.78]) await glide({ x: W * x, y: gy }, 0.6);
await page.mouse.up();
await tapEl('#gExit');
await jump({ x: -60, y: fx.y }); await sec(0.8);

// collection: 20 robots, try a premium one
await cap('20 роботов-малышей');
await tapEl('.act[data-a=robots]'); await sec(0.7);
await ev(() => { document.getElementById('sheetBody').scrollTop = 400; }); await sec(0.5);
await ev(() => document.querySelector('button[data-r=kometa]').scrollIntoView({ block: 'center' })); await sec(0.5);
const kom = await el('button[data-r=kometa]');
await glide(kom, 0.35); await tapEl('button[data-r=kometa]');
await jump({ x: -60, y: fx.y }); await sec(2.6);

// dance party + end plate
await cap('Танцы! Тыкай робота в такт');
await tapEl('.act[data-a=games]'); await sec(0.45);
await glide(await el('.game[data-g=dance]'), 0.3); await tapEl('.game[data-g=dance]');
await jump({ x: -60, y: fx.y }); await sec(1.2);
for (const dt of [0.55, 0.5, 0.55]) { const h = await head(); await tap({ x: h.x, y: h.y }); await jump({ x: -60, y: fx.y }); await sec(dt); }
await cap(null);
await ev(() => window.__end(true));
await sec(3.4);

// ---------- finish ----------
recording = false;
ff.stdin.end();
await ffDone;
const dur = nFrames / FPS;
const b64 = await ev(([a, b]) => window.__renderAudio(a, b), [audioStart, audioStart + dur]);
const pcm = Buffer.from(b64, 'base64');
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(48000, 24);
hdr.writeUInt32LE(48000 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(tmpA, Buffer.concat([hdr, pcm]));
await browser.close();
await new Promise((res, rej) => {
  const m = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpV, '-i', tmpA, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT], { stdio: 'inherit' });
  m.on('close', (c) => (c === 0 ? res() : rej(new Error('mux exit ' + c))));
});
console.log(JSON.stringify({ out: OUT, frames: nFrames, seconds: +dur.toFixed(2), audioBytes: pcm.length, errors: errs }, null, 1));
