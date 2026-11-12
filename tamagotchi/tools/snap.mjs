// Headless screenshot (no window): node tools/snap.mjs <file-or-url[?query]> <out.png> [width height] [--wait ms] [--mobile] [--eval "js"]
import { chromium } from 'playwright-core';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [target, out, w = '1300', h = '1240'] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--mobile'));
const root = path.join(os.homedir(), 'AppData/Local/ms-playwright');
const exe = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
const browser = await chromium.launch({ executablePath: path.join(root, exe, 'chrome-win64/chrome.exe') });
const mobile = args.includes('--mobile');
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[log]')) errs.push(m.text()); });
let url = target;
if (!/^https?:/.test(target)) {
  const [file, query] = target.split('?');
  url = pathToFileURL(path.resolve(file)).href + (query ? '?' + query : '');
}
await page.goto(url);
await page.waitForTimeout(+flag('--wait', 400));
const ev = flag('--eval', null);
if (ev) { await page.evaluate(ev); await page.waitForTimeout(+flag('--wait2', 600)); }
await page.screenshot({ path: out, fullPage: !mobile, omitBackground: args.includes('--transparent') });
console.log(errs.length ? 'LOG/ERRORS:\n' + errs.join('\n') : 'ok ' + out);
await browser.close();
