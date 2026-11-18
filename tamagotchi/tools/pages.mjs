// Builds the GitHub Pages site into ../docs: concept page at the root, the game at /play/, the demo video.
// node tools/pages.mjs   (run node build.mjs first)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const T = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = path.resolve(T, '..');
const SITE = 'https://funberrytoys-dotcom.github.io/robogochi/';
const REPO = 'https://github.com/funberrytoys-dotcom/robogochi';
const APK = `${REPO}/releases/latest/download/robogochi.apk`;
const D = path.join(P, 'docs');
const mk = (p) => fs.mkdirSync(p, { recursive: true });
mk(path.join(D, 'img')); mk(path.join(D, 'play')); mk(path.join(D, 'video'));

const og = (title, desc, url) => `
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}img/og.jpg">
<meta name="twitter:card" content="summary_large_image">`;

// concept page
let html = fs.readFileSync(path.join(P, 'concept-claude', 'index.html'), 'utf8');
html = html.replace(/href="https:\/\/claude\.ai\/artifact\/[^"]+" target="_blank" rel="noopener">Играть в прототип/, 'href="play/">Играть в прототип');
html = html.replace('<a class="btn ghost" href="#robots">20 роботов</a>', `<a class="btn ghost" href="#video">Видео</a>\n      <a class="btn ghost" href="${APK}">APK для Android</a>\n      <a class="btn ghost" href="#robots">20 роботов</a>`);
const video = `
  <figure class="demo" id="video">
    <video src="video/robogochi-demo.mp4" poster="video/poster.jpg" controls playsinline preload="metadata"></video>
    <figcaption>Минута из прототипа, записана прямо из игры со звуком. Палец показывает, куда нажимают.</figcaption>
  </figure>
  <div class="strip">`;
html = html.replace(/\n  <div class="strip">/, video);
html = html.replace('</style>', `  .demo { margin: 22px auto 26px; max-width: 380px; }
  .demo video { width: 100%; aspect-ratio: 9 / 16; display: block; border-radius: 24px; background: #1b1530; box-shadow: 0 18px 40px rgba(40, 20, 90, 0.25); }
  .demo figcaption { margin-top: 10px; text-align: center; font-size: 14px; opacity: 0.75; }
</style>`);
html = html.replace(/<\/title>/, `</title>${og('Робогочи · Toysberry Game Studio', 'Детский тамагочи про робота-малыша, который живёт в телефоне. Концепция, 20 роботов и играбельный прототип.', SITE)}`);
fs.writeFileSync(path.join(D, 'index.html'), html);
for (const f of fs.readdirSync(path.join(P, 'concept-claude', 'img'))) fs.copyFileSync(path.join(P, 'concept-claude', 'img', f), path.join(D, 'img', f));

// game
let game = fs.readFileSync(path.join(T, 'dist', 'robogochie.html'), 'utf8');
game = game.replace(/<\/title>/, `</title>${og('Робогочи · играть', 'Открой посылку Чико, собери робота и научи его первым словам.', SITE + 'play/')}`);
fs.writeFileSync(path.join(D, 'play', 'index.html'), game);

// video
for (const f of ['robogochi-demo.mp4', 'poster.jpg', 'preview.gif']) {
  const src = path.join(P, 'video', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(D, 'video', f));
}
fs.writeFileSync(path.join(D, '.nojekyll'), '');
console.log('pages built in', D);
