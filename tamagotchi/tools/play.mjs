// Scripted headless run on a phone-sized viewport (no window): node tools/play.mjs <steps.json> <outDir> [query]
// steps: ["wait", ms] | ["tap", x, y] | ["drag", x0, y0, x1, y1, steps] | ["shot", name] | ["eval", "js"] | ["down", x, y] | ["move", x, y] | ["up"]
import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [stepsFile, outDir, query = ''] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const root = path.join(os.homedir(), 'AppData/Local/ms-playwright');
const exe = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
const browser = await chromium.launch({ executablePath: path.join(root, exe, 'chrome-win64/chrome.exe'), args: ['--autoplay-policy=no-user-gesture-required'] });
const vw = +(process.env.VW || 390), vh = +(process.env.VH || 844);
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[log]')) logs.push(m.type() + ': ' + m.text()); });
const url = pathToFileURL(path.join(ROOT, 'dist', 'robogochie.html')).href + (query ? '?' + query : '');
await page.goto(url);
await page.waitForTimeout(300);
for (const s of steps) {
  const [op, ...a] = s;
  if (op === 'wait') await page.waitForTimeout(a[0]);
  else if (op === 'tap') { await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); }
  else if (op === 'down') { await page.mouse.move(a[0], a[1]); await page.mouse.down(); }
  else if (op === 'move') await page.mouse.move(a[0], a[1], { steps: a[2] || 8 });
  else if (op === 'up') await page.mouse.up();
  else if (op === 'drag') { await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(a[2], a[3], { steps: a[4] || 15 }); await page.mouse.up(); }
  else if (op === 'q') { const pt = await page.evaluate(a[0]); s.splice(0, s.length, ...[a[1], pt.x, pt.y, ...(a.slice(2))]); const [op2, x, y, ...rest] = s; if (op2 === 'tap') { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); } else if (op2 === 'down') { await page.mouse.move(x, y); await page.mouse.down(); } else if (op2 === 'move') await page.mouse.move(x, y, { steps: rest[0] || 8 }); }
  else if (op === 'shot') await page.screenshot({ path: path.join(outDir, a[0] + '.png') });
  else if (op === 'eval') { const r = await page.evaluate(a[0]); if (r !== undefined) logs.push('eval> ' + JSON.stringify(r)); }
}
console.log(logs.length ? logs.join('\n') : 'no errors');
await browser.close();
