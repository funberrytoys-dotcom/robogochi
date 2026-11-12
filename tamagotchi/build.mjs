// Bundles src/ into one self-contained HTML (no network needed except the optional Google font).
// dist/robogochie.html — full document for phones / APK; dist/artifact.html — body-only page for claude.ai artifacts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
const ORDER = ['core.js', 'audio.js', 'robots.js', 'draw_robot.js', 'fx.js', 'robot.js', 'behaviors.js', 'room.js', 'ui.js', 'games.js', 'main.js'];
const js = ORDER.map((f) => `// ---- ${f} ----\n` + src(f)).join('\n');
const css = src('style.css');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'logo.png')).toString('base64');
const body = src('shell.html').replace('/*CSS*/', () => css).replace('/*LOGO*/', () => logo).replace('/*JS*/', () => js);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'artifact.html'), body);
const full = '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n' + body.replace('<div id="wrap">', '</head>\n<body>\n<div id="wrap">') + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(ROOT, 'dist', 'robogochie.html'), full);
console.log('built', (full.length / 1024).toFixed(0) + ' KB');
