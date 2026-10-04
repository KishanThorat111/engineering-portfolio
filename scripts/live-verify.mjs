/**
 * /live/ with no control plane, verified in a real browser (S16).
 *
 * The deployed /live/ has no backend behind it, and that is the designed
 * state. This drives the built site exactly as the static host serves it —
 * directory pages, `_redirects`, and `/v1/*` answering with the host's own 404
 * — and proves, by running it, what a visitor gets:
 *
 *   - RECORDED from the first frame; the page never requests /v1/* at all
 *   - no retry control, no live-channel row, no receipt
 *   - the provenance line and its links
 *   - every demonstration plays its recorded exchange to a real outcome
 *   - every investigation renders its drawing, evidence and commit links
 *   - no horizontal overflow at 320, 390, 820 and 1440 px
 *   - reduced motion leaves nothing animating; the keyboard reaches the action
 *   - the archive still serves; retired station URLs redirect
 *
 * Uses an installed Chrome or Edge through playwright-core, which downloads no
 * browser (CI runners ship Chrome). usage: node scripts/live-verify.mjs
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const DIST = resolve('dist');
const PORT = 4329;
const BASE = `http://127.0.0.1:${PORT}`;
const copy = JSON.parse(readFileSync(join(DIST, 'live', 'copy.json'), 'utf8'));
const D = copy.drawing;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};
const redirects = readFileSync(join(DIST, '_redirects'), 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => l.trim().split(/\s+/));

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  console.log(`${ok ? '  ✓' : '  ✗'} ${message}`);
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, BASE).pathname);
  for (const [from, to, code] of redirects) {
    if (path === from) {
      res.writeHead(Number(code), { location: to });
      return res.end();
    }
  }
  let file = join(DIST, path);
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) {
      res.writeHead(307, { location: `${path}/` });
      return res.end();
    }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    // What the Worker does for /v1/* with no tunnel route: its own 404 page.
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(readFileSync(join(DIST, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const launch = () =>
  process.env.CHROME_PATH
    ? chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
    : chromium.launch({
        channel: process.platform === 'win32' ? 'msedge' : 'chrome',
        headless: true,
      });
const browser = await launch();

async function page(viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  // Negative control: LIVE_VERIFY_BACKEND=on turns the backend flag on, so the
  // page provisions against an absent control plane — and this must fail.
  if (process.env.LIVE_VERIFY_BACKEND === 'on') {
    await context.addInitScript(() => {
      globalThis.__LIVE_BACKEND__ = 'on';
    });
  }
  const p = await context.newPage();
  const api = [];
  const errors = [];
  p.on('request', (r) => {
    if (/\/(v1|health|r)\//.test(new URL(r.url()).pathname)) api.push(r.url());
  });
  p.on('pageerror', (e) => errors.push(String(e)));
  return { p, api, errors, context };
}

const recordedReady = (p) =>
  p.waitForFunction(
    () => document.querySelector('.dw')?.getAttribute('data-mode') === 'recorded',
    null,
    {
      timeout: 10_000,
    },
  );

async function runVisible(p) {
  const button = p.locator('.frame__field > div:not([hidden]) .act__primary');
  await button.click();
  await p.waitForFunction(
    () => {
      const b = document.querySelector('.frame__field > div:not([hidden]) .act__primary');
      return b && !b.disabled;
    },
    null,
    { timeout: 20_000 },
  );
  await p.waitForTimeout(600);
  return p.locator('.frame__field > div:not([hidden]) .notes').innerText();
}

try {
  console.log('live-verify: /live/ with no control plane');
  {
    const { p, api, errors, context } = await page({ width: 1440, height: 900 });
    const started = Date.now();
    await p.goto(`${BASE}/live/`, { waitUntil: 'load' });
    await recordedReady(p);
    check(
      Date.now() - started < 5_000,
      `RECORDED from the first load (${Date.now() - started} ms)`,
    );
    check(
      (await p.locator('h1').innerText()) === D.opening.headline,
      'the opening headline is the recorded-first one',
    );
    const provenance = await p.locator('.provenance').innerText();
    check(provenance.includes(D.opening.provenance[1]), 'the provenance line is visible');
    check(
      (await p.locator('.provenance a').evaluateAll((a) => a.map((x) => x.href))).join() ===
        [D.source.ci, D.source.repo].join(),
      'provenance links to the verifying workflow and the repository',
    );
    const text = await p.locator('body').innerText();
    check(!text.includes(D.retryLive), 'no retry control');
    const channelRows = await p
      .locator('.tb__row dt, .strip dt')
      .evaluateAll(
        (dts, label) => dts.filter((dt) => dt.textContent.trim() === label).length,
        D.fields.channel,
      );
    check(channelRows === 0, 'no live-channel row in the title block');
    check(!text.includes(D.receipt.action) && !text.includes(D.receipt.recordedNote), 'no receipt');
    check(!/530|provisioning failed/i.test(text), 'no 530 or provisioning failure in the page');

    const results = {
      isolation: 'HTTP 403',
      limits: '10 accepted',
      payments: '1 activated',
      fraud: 'HTTP 409',
      ai: '0 tokens',
    };
    for (const [id, expected] of Object.entries(results)) {
      if (id !== 'isolation') {
        await p.click(`.sheets a[href="/live/${id}/"]`);
        // A sheet change runs inside a View Transition, so the DOM swaps a
        // frame or more after the click. Wait for the new sheet itself.
        await p.waitForFunction(
          (name) => document.querySelector('#sheet-title')?.textContent?.startsWith(name),
          D.sheets[id].name,
          { timeout: 10_000 },
        );
      }
      const notes = await runVisible(p);
      check(notes.includes(expected), `${id}: the recorded exchange plays to "${expected}"`);
    }
    check(
      (await p.locator('.revs tbody tr').count()) > 0,
      'recorded audit rows reach the title block',
    );
    check(api.length === 0, `the page never requested the control plane (${api.length} requests)`);
    check(errors.length === 0, `no page errors (${errors.join(' | ')})`);
    await context.close();
  }

  console.log('live-verify: the investigations');
  for (const id of ['b-201', 'b-202', 'b-203']) {
    const c = D.incidents[id];
    const { p, api, errors, context } = await page({ width: 1440, height: 900 });
    await p.goto(`${BASE}/live/${id}/`, { waitUntil: 'load' });
    await recordedReady(p);
    const field = p.locator('.frame__field > div:not([hidden])');
    check(
      (await p.locator('#sheet-title').innerText()).startsWith(c.name),
      `${id}: opens directly at its own URL`,
    );
    check(
      (await field.locator('.plan svg[role="img"]').count()) === 1,
      `${id}: the sequence drawing renders`,
    );
    check(
      (await field.locator('.ev-items > li').count()) === c.evidence.length,
      `${id}: ${c.evidence.length} evidence items`,
    );
    const commits = await field
      .locator('.incident__fixes a')
      .evaluateAll((a) => a.map((x) => x.href));
    check(
      commits.length === c.fix.length &&
        commits.every((h) => h.startsWith(`${D.source.repo}/commit/`)),
      `${id}: fix links go to the repository's commits (${c.fix.map((f) => f.commit).join(', ')})`,
    );
    check(
      (await field.innerText()).includes(D.incidentFields.historical),
      `${id}: labelled as a historical incident`,
    );
    check(
      api.length === 0 && errors.length === 0,
      `${id}: no control-plane request, no page error`,
    );
    await context.close();
  }

  console.log('live-verify: widths, keyboard, reduced motion');
  for (const [w, h] of [
    [320, 700],
    [390, 844],
    [820, 1180],
    [1440, 900],
  ]) {
    for (const path of ['/live/', '/live/b-201/']) {
      const { p, context } = await page(
        { width: w, height: h },
        { isMobile: w < 700, hasTouch: w < 700 },
      );
      await p.goto(`${BASE}${path}`, { waitUntil: 'load' });
      await recordedReady(p);
      await p.waitForTimeout(300);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 0, `${w}×${h} ${path}: no horizontal overflow (${overflow}px)`);
      await context.close();
    }
  }
  {
    const { p, context } = await page({ width: 1280, height: 900 }, { reducedMotion: 'reduce' });
    await p.goto(`${BASE}/live/`, { waitUntil: 'load' });
    await recordedReady(p);
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await p.keyboard.press('Tab');
      reached = await p.evaluate(
        () =>
          document.activeElement?.classList.contains('act__primary') &&
          !document.activeElement.closest('[hidden]'),
      );
    }
    const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    check(
      reached && outline !== 'none',
      'the keyboard reaches the action, with a visible focus ring',
    );
    await p.keyboard.press('Enter');
    await p.waitForSelector('.wall--ink', { timeout: 10_000 });
    await p.waitForTimeout(800);
    const running = await p.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length,
    );
    check(running === 0, `reduced motion: nothing animating after a run (${running})`);
    await context.close();
  }

  console.log('live-verify: the archive and retired URLs');
  {
    const { p, context } = await page({ width: 1280, height: 900 });
    const archive = await p.goto(`${BASE}/live/archive/`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    check(archive?.status() === 200, '/live/archive/ serves');
    check((await p.locator('#root *').count()) > 0, '/live/archive/ mounts the preserved world');
    const retired = await p.goto(`${BASE}/live/systems/`, { waitUntil: 'load' });
    check(
      new URL(p.url()).pathname === '/live/' && retired?.status() === 200,
      '/live/systems/ redirects to /live/',
    );
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`live-verify: FAILED — ${failures.length} check(s).`);
  process.exit(1);
}
console.log('live-verify: OK');
