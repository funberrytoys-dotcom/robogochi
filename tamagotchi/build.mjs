// Bundles the game, illustrations, font and recorded vocabulary for offline play.
// dist/robogochie.html — full document for phones / APK; dist/artifact.html — body-only page for claude.ai artifacts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const ORDER = ['core.js', 'audio.js', 'robots.js', 'draw_robot.js', 'fx.js', 'robot.js', 'behaviors.js', 'room.js', 'ui.js', 'games.js', 'passport.js', 'speech.js', 'workshop.js', 'parcel.js', 'main.js'];
const js = ORDER.map((f) => `// ---- ${f} ----\n` + src(f)).join('\n');
const asset = (file, mime) => 'data:' + mime + ';base64,' + fs.readFileSync(path.join(ROOT, 'assets', file)).toString('base64');
const css = ['style.css', 'club.css', 'parcel.css', 'speech.css', 'workshop.css'].map(src).join('\n');
const font = asset('fonts/nunito.woff2', 'font/woff2');
const voice = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'assets', 'voice')).filter(f => f.endsWith('.mp3')).map(f => [path.parse(f).name, asset('voice/' + f, 'audio/mpeg')]));
const art = { sleeve: asset('parcel/sleeve.webp', 'image/webp'), chiko: asset('parcel/chiko.webp', 'image/webp'), logo: asset('logo.png', 'image/png') };
const body = src('shell.html')
  .replace('/*CSS*/', () => `@font-face{font-family:Nunito;src:url(${font}) format("woff2");font-weight:200 1000;font-display:swap}\n` + css)
  .replace('/*ASSETS*/', () => `window.PARCEL_ART=${JSON.stringify(art)};window.LOGO_SRC=window.PARCEL_ART.logo;window.ROBO_VOICE=${JSON.stringify(voice)};window.ROOM_ART=${JSON.stringify(asset('room.webp', 'image/webp'))};`)
  .replace('/*JS*/', () => js);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'artifact.html'), body);
const full = '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n' + body.replace('<div id="wrap">', '</head>\n<body>\n<div id="wrap">') + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(ROOT, 'dist', 'robogochie.html'), full);
console.log('built', (full.length / 1024).toFixed(0) + ' KB');
