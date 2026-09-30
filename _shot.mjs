import { chromium } from 'playwright-core';
let b;
for (const ch of ['msedge', 'chrome']) {
  try {
    b = await chromium.launch({ channel: ch });
    break;
  } catch {}
}
const ids = [
  'enter',
  'systems',
  'dissection',
  'data',
  'lab',
  'live',
  'think',
  'contact',
  'proof',
  'end',
];
const names = [
  '01-enter',
  '02-systems',
  '03-dissection',
  '04-data',
  '05-lab',
  '06-live',
  '07-think',
  '08-build',
  '09-proof',
  '10-end',
];
const only = process.argv[3] ? [process.argv[3]] : ids;
const w = Number(process.argv[2] || 1440);
const pg = await b.newPage({ viewport: { width: w, height: Math.round(w * 0.667) } });
const errs = [];
pg.on('pageerror', (e) => errs.push(e.message.slice(0, 60)));
await pg.goto('http://127.0.0.1:4399/', { waitUntil: 'load' });
await pg.waitForTimeout(2000);
for (let i = 0; i < ids.length; i++) {
  if (!only.includes(ids[i])) continue;
  const el = await pg.$('#' + ids[i]);
  if (!el) {
    console.log(names[i], 'MISSING');
    continue;
  }
  await el.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(800);
  await el.screenshot({ path: `build/verify/R-${names[i]}-${w}.png` });
  console.log(names[i], 'captured');
}
console.log(
  'overflow',
  await pg.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ),
  errs.length ? 'ERR ' + errs[0] : 'clean',
);
await b.close();
