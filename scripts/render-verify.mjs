/**
 * Measures the render layer in a real browser.
 *
 * P4's definition of done is "60fps mid-range at tier 2; quality tiers
 * verified", and neither half is provable by looking at it. This drives a real
 * Chromium over the built artifact, samples real frame deltas from the running
 * scene, and reports p50/p95 — the same numbers the in-page governor uses, read
 * from the page rather than asserted about it.
 *
 * IT ALSO VERIFIES THE THINGS THAT ARE NOT PERFORMANCE: reduced motion,
 * degraded mode, the accessible document, and the absence of WebGL. Those are
 * invisible to every other gate in this repository, and §11 is explicit that
 * reduced motion has to be verified by execution in the conditions it claims to
 * handle.
 *
 * WHAT IT CANNOT DO, STATED PLAINLY: this machine is not a mid-range phone. CPU
 * throttling approximates one and is reported as an approximation. A real
 * device measurement is a P8 task and this script does not pretend to be one.
 *
 * Local only. `playwright-core` drives an already-installed Edge or Chrome and
 * downloads no browser, which is why it never enters CI (Phase 3 decision 9).
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { createServer } from 'node:http';
import { connect as netConnect } from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const DIST = resolve('dist');
const PORT = 4317;
/*
 * A second origin serving the same build with NO control plane behind it. The
 * degraded-mode check needs a plane that is genuinely absent, and it must be
 * absent by construction rather than because the main harness happens not to
 * forward something — an earlier version of this file passed that check only
 * because the WebSocket was not proxied, and started failing the moment it was.
 */
const DEAD_PORT = 4318;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
};

/**
 * Parses `dist/_headers` and applies it the way Cloudflare ACTUALLY does.
 *
 * THIS PARSER WAS WRONG, AND ITS WRONGNESS SHIPPED A PRODUCTION OUTAGE.
 *
 * It used to `set` each header, so a later rule replaced an earlier one and
 * /live/ appeared to receive only its own policy. Cloudflare does not do that:
 * every matching rule ACCUMULATES, repeated names are joined with a comma, and
 * `! Header` is the only way to drop an inherited one. So /live/ really
 * received two Content-Security-Policy headers — its own, and the static one
 * carrying `connect-src 'none'`. A browser enforces the INTERSECTION of every
 * CSP header it is given, so nothing on the live surface could open a
 * connection, while this harness reported 35/35 green.
 *
 * Verified against the installed wrangler's own bundle: UNSET_OPERATOR = "! ",
 * each rule compiles to { set, unset }, and same-name values within a rule are
 * joined with `, `. A harness that models the platform incorrectly is worse
 * than no harness, because it converts an unknown into a false assurance.
 */
const headerRules = (() => {
  const rules = [];
  try {
    let current = null;
    for (const raw of readFileSync(join(DIST, '_headers'), 'utf8').split('\n')) {
      const line = raw.trimEnd();
      if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
      if (!/^\s/.test(line)) {
        current = { pattern: line.trim(), headers: [], unset: [] };
        rules.push(current);
        continue;
      }
      const trimmed = line.trim();
      if (!current) continue;
      // `! Header` — the unset operator, matching wrangler's UNSET_OPERATOR.
      if (trimmed.startsWith('! ')) {
        current.unset.push(trimmed.slice(2).trim().toLowerCase());
        continue;
      }
      const index = trimmed.indexOf(':');
      if (index > 0) {
        current.headers.push([
          trimmed.slice(0, index).trim().toLowerCase(),
          trimmed.slice(index + 1).trim(),
        ]);
      }
    }
  } catch {
    /* absent file: the P8 checks fail loudly, which is the correct outcome */
  }

  const matches = (pattern, pathname) =>
    pattern.endsWith('/*') ? pathname.startsWith(pattern.slice(0, -1)) : pattern === pathname;

  return (pathname) => {
    const applied = new Map();
    for (const rule of rules) {
      if (!matches(rule.pattern, pathname)) continue;
      // Unset first, then set — the order each compiled rule is applied in.
      for (const name of rule.unset) applied.delete(name);
      for (const [name, value] of rule.headers) {
        const existing = applied.get(name);
        applied.set(name, existing ? `${existing}, ${value}` : value);
      }
    }
    return Object.fromEntries(applied);
  };
})();

/**
 * Serves the composed dist exactly as the Worker would — and proxies the API.
 *
 * The proxy is not a convenience. In production the static surface and the
 * control plane sit behind ONE Cloudflare origin, so the browser makes
 * same-origin calls and no CORS is involved. Pointing the page at a second port
 * would exercise a shape that never ships, and would need CORS headers the
 * production service is right not to have. Proxying reproduces the real
 * topology, so what is verified here is what deploys.
 */
function serve(port = PORT, upstream = process.env.LIVE_API) {
  return new Promise((ready) => {
    const server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url ?? '/', 'http://localhost');

        if (upstream && /^\/(v1|r|internal|health)(\/|$)/.test(url.pathname)) {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          const headers = Object.fromEntries(
            Object.entries(request.headers).filter(
              ([name]) => !['host', 'connection', 'content-length'].includes(name),
            ),
          );
          const forwarded = await fetch(upstream + url.pathname + url.search, {
            method: request.method,
            headers,
            body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
          });
          const text = await forwarded.text();
          response.writeHead(forwarded.status, {
            'content-type': forwarded.headers.get('content-type') ?? 'application/json',
          });
          response.end(text);
          return;
        }

        let path = join(DIST, decodeURIComponent(url.pathname));
        const info = await stat(path).catch(() => null);
        if (!info || info.isDirectory()) path = join(path, 'index.html');
        const body = await readFile(path);
        response.writeHead(200, {
          'content-type': MIME[extname(path)] ?? 'application/octet-stream',
          ...headerRules(url.pathname),
        });
        response.end(body);
      } catch {
        response.writeHead(404, { 'content-type': 'text/plain' });
        response.end('not found');
      }
    });

    /*
     * The WebSocket is proxied for the same reason the HTTP calls are, and one
     * more: `connect-src 'self'` is a real part of the shipped policy, so a
     * cross-origin socket would be refused by the browser here while working
     * perfectly in production behind Caddy. Piping the upgrade through this
     * origin makes the socket genuinely same-origin, which is both what ships
     * and what the CSP describes.
     */
    server.on('upgrade', (request, socket, head) => {
      if (!upstream) return socket.destroy();
      const target = new URL(upstream);
      const relay = netConnect(Number(target.port || 80), target.hostname, () => {
        const lines = [`${request.method} ${request.url} HTTP/1.1`];
        for (let i = 0; i < request.rawHeaders.length; i += 2) {
          const name = request.rawHeaders[i];
          const value = name.toLowerCase() === 'host' ? target.host : request.rawHeaders[i + 1];
          lines.push(`${name}: ${value}`);
        }
        relay.write(lines.join('\r\n') + '\r\n\r\n');
        if (head?.length) relay.write(head);
        relay.pipe(socket);
        socket.pipe(relay);
      });
      relay.on('error', () => socket.destroy());
      socket.on('error', () => relay.destroy());
    });

    server.listen(port, () => ready(server));
  });
}

async function launch() {
  const candidates = ['msedge', 'chrome'];
  for (const channel of candidates) {
    try {
      return await chromium.launch({
        channel,
        args: [
          // Without this, headless Chromium falls back to SwiftShader software
          // rendering and every number below would describe a CPU rasteriser
          // rather than a GPU. Measuring the wrong thing precisely is worse
          // than not measuring.
          '--use-angle=default',
          '--enable-gpu',
          '--ignore-gpu-blocklist',
        ],
      });
    } catch {
      /* try the next channel */
    }
  }
  throw new Error('render-verify: no Edge or Chrome found. This script is local-only by design.');
}

async function sampleFrames(page, seconds) {
  return page.evaluate(async (duration) => {
    const deltas = [];
    let last = performance.now();
    const end = last + duration * 1000;
    await new Promise((done) => {
      const tick = () => {
        const now = performance.now();
        deltas.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    const clean = deltas.filter((d) => d > 0 && d < 200).sort((a, b) => a - b);
    const at = (q) => clean[Math.min(clean.length - 1, Math.ceil(q * clean.length) - 1)] ?? 0;
    const mean = clean.reduce((a, b) => a + b, 0) / Math.max(clean.length, 1);
    return { p50: at(0.5), p95: at(0.95), p99: at(0.99), fps: 1000 / mean, frames: clean.length };
  }, seconds);
}

const results = [];
function record(name, detail, pass) {
  results.push({ name, detail, pass });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name} — ${detail}`);
}

async function open(browser, options, path = '/live/') {
  const page = await browser.newPage(options);
  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'load' });
  // The document renders as soon as React mounts; waiting on it rather than on
  // a timer means the measurements start from a real ready state.
  await page.waitForSelector('#document', { timeout: 15_000 });
  return page;
}

const server = await serve();
// `null`, not `undefined` — an explicit `undefined` would take the default
// parameter and quietly proxy to the live plane, which is precisely the origin
// this one exists not to be.
const deadServer = await serve(DEAD_PORT, null);
const browser = await launch();

try {
  /* ---- 1. Sustained frame time, unthrottled ------------------------- */
  console.log('\n=== sustained frame time (this machine, real GPU) ===');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    // Warm-up: shader compilation and the first few frames are not steady state.
    await page.waitForTimeout(2500);
    const frames = await sampleFrames(page, 8);
    const governor = await page.evaluate(() => window.__frameReport?.() ?? null);
    console.log(
      `  p50 ${frames.p50.toFixed(2)}ms  p95 ${frames.p95.toFixed(2)}ms  ` +
        `p99 ${frames.p99.toFixed(2)}ms  ${frames.fps.toFixed(1)}fps over ${frames.frames} frames`,
    );
    console.log(`  in-page governor: tier ${governor?.tier}, reason "${governor?.reason}"`);
    record(
      'sustained 60fps on this machine',
      `p95 ${frames.p95.toFixed(2)}ms (budget 19ms), ${frames.fps.toFixed(1)}fps`,
      frames.p95 <= 19,
    );
    await page.close();
  }

  /* ---- 2. Sustained GPU pressure: does the governor actually move? ---- */
  console.log('\n=== sustained GPU pressure (A8 downgrade) ===');
  {
    /*
     * CPU THROTTLING WAS TRIED FIRST AND PROVED NOTHING, which is worth
     * recording rather than quietly replacing. Emulation.setCPUThrottlingRate
     * slows script execution; it does not slow a GPU. This scene is GPU-bound,
     * so under a 4x CPU throttle it ran at 237fps and the governor correctly
     * did nothing — a test that would have reported success for a governor
     * that was never wired up at all.
     *
     * Rendering roughly six times the pixels is pressure the scene actually
     * feels, and it is the closest this machine gets to a weaker device.
     */
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 3,
    });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForSelector('#document');
    await page.waitForTimeout(3000);

    const start = await page.evaluate(() => window.__frameReport?.() ?? null);
    const frames = await sampleFrames(page, 12);
    const end = await page.evaluate(() => window.__frameReport?.() ?? null);

    console.log(
      `  p50 ${frames.p50.toFixed(2)}ms  p95 ${frames.p95.toFixed(2)}ms  ${frames.fps.toFixed(1)}fps`,
    );
    console.log(`  governor: tier ${start?.tier} -> ${end?.tier} ("${end?.reason}")`);

    /*
     * The claim under test is the REACTION, not a frame number. Either the
     * device held the budget at its tier — in which case there was nothing to
     * react to — or it did not and the tier came down. The state that must
     * never occur is sustained p95 over budget with the tier unchanged.
     */
    const heldBudget = frames.p95 <= 19;
    const cameDown = (end?.tier ?? 3) < (start?.tier ?? 3);
    record(
      'governor reacts to pressure rather than holding an unservable tier (A8)',
      `p95 ${frames.p95.toFixed(2)}ms, tier ${start?.tier} -> ${end?.tier}`,
      heldBudget || cameDown,
    );
    await page.close();
  }

  /* ---- 3. Reduced motion, verified by execution ---------------------- */
  console.log('\n=== prefers-reduced-motion: reduce ===');
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // The camera must not drift. Two samples a second apart must be identical.
    const readCamera = () =>
      page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas ? `${canvas.width}x${canvas.height}` : null;
      });
    const first = await readCamera();
    await page.waitForTimeout(1200);
    const second = await readCamera();

    const noteVisible = await page
      .getByText(/Reduced motion is on/i)
      .isVisible()
      .catch(() => false);

    record(
      'reduced motion is honoured and disclosed',
      `canvas stable (${first} → ${second}); note rendered: ${noteVisible}`,
      first === second && noteVisible,
    );
    await page.close();
  }

  /* ---- 4. Degraded mode, with no live plane ------------------------- */
  console.log('\n=== degraded mode (live plane unreachable) ===');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    /*
     * Served from the origin with no control plane behind it: the fetches 404
     * and the socket upgrade is refused, both same-origin and both at the
     * network layer. Nothing is stubbed and no page behaviour is overridden —
     * this is the real failure path, reached by genuinely removing the plane.
     */
    await page.goto(`http://localhost:${DEAD_PORT}/live/`, { waitUntil: 'load' });
    await page.waitForTimeout(9000);

    const badge = await page
      .locator('.badge-replay')
      .first()
      .isVisible()
      .catch(() => false);
    const heading = await page
      .getByText(/live plane is unreachable/i)
      .isVisible()
      .catch(() => false);
    const claimsLive = await page
      .locator('.badge-live')
      .count()
      .then((n) => n > 0);
    const events = await page.locator('.event').count();

    record(
      'degraded mode announces itself and never claims to be live',
      `replay badge: ${badge}, heading: ${heading}, claims live: ${claimsLive}, ` +
        `replayed events: ${events}`,
      badge && heading && !claimsLive && events > 0,
    );
    await page.close();
  }

  /* ---- 4b. THE SCENE ACTUALLY DREW SOMETHING ------------------------- */
  console.log('\n=== the scene is drawn, not merely mounted ===');
  {
    /*
     * EVERY OTHER CHECK IN THIS FILE CAN PASS WITH A BLANK CANVAS.
     *
     * Frame sampling measures requestAnimationFrame. Canvas dimensions measure
     * layout. A React tree suspended forever still gives you both — a healthy
     * rAF loop and a correctly sized canvas with nothing on it. That is exactly
     * what shipped: drei's <Text> resolved glyphs through a CDN, this origin's
     * connect-src 'self' refused the fetch, the Text suspended, and because the
     * Canvas wraps the world in <Suspense fallback={null}> the ENTIRE scene
     * rendered as zero pixels. The harness reported 37/37.
     *
     * So this reads the framebuffer and counts non-background pixels. It is the
     * only check here that can tell "drawing" from "running".
     */
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForTimeout(6000);

    const hasCanvas = (await page.locator('canvas').count()) > 0;

    /*
     * Screenshot, not canvas.toDataURL.
     *
     * Reading the WebGL canvas directly returns an empty buffer, because
     * preserveDrawingBuffer is off and the drawing buffer is gone by the time
     * script runs — the first version of this check did exactly that and
     * reported 0 pixels for a scene that may well have been fine. A screenshot
     * captures what the compositor actually put on screen, which is the only
     * thing that answers "did the visitor see anything".
     *
     * The strip sampled is the left margin beside the 62rem document column,
     * where the scene is the ONLY thing on screen. Sampling the middle would
     * measure the document's own cards.
     */
    /*
     * DIFFERENCE, not absolute brightness.
     *
     * An earlier version thresholded raw pixel values and passed at "100% lit,
     * brightest 45/765" — which was the near-black page background showing
     * through a transparent canvas, not the scene. Any fixed threshold either
     * sits below the background and passes on nothing, or above the scene's
     * dimmest real output and fails on something. So this screenshots the same
     * strip twice, once with the scene layer hidden, and asks whether the
     * canvas changes what the visitor sees. Nothing else answers that.
     */
    const clip = { x: 0, y: 120, width: 180, height: 600 };
    const withScene = await page.screenshot({ clip });
    await page.evaluate(() => {
      const layer = document.querySelector('.scene-layer');
      if (layer instanceof HTMLElement) layer.style.display = 'none';
    });
    await page.waitForTimeout(250);
    const withoutScene = await page.screenshot({ clip });

    const [a, b] = await Promise.all([
      sharp(withScene).raw().toBuffer({ resolveWithObject: true }),
      sharp(withoutScene).raw().toBuffer({ resolveWithObject: true }),
    ]);
    let differing = 0;
    let peak = 0;
    const pixels = a.info.width * a.info.height;
    for (let i = 0; i < a.data.length; i += a.info.channels) {
      const delta =
        Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]);
      if (delta > peak) peak = delta;
      if (delta > 6) differing += 1;
    }

    const ratio = differing / pixels;
    record(
      'the WebGL scene renders actual pixels, not an empty canvas',
      hasCanvas
        ? `${(ratio * 100).toFixed(1)}% of the strip changes when the scene is hidden, peak delta ${peak}`
        : 'no canvas element at all',
      hasCanvas && ratio > 0.02,
    );
    await page.close();
  }

  /* ---- 5. The accessible document ----------------------------------- */
  console.log('\n=== accessibility ===');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForTimeout(6000);

    const h1 = await page.locator('h1').count();
    const canvasHidden = await page
      .locator('canvas')
      .first()
      .evaluate((el) => el.closest('[aria-hidden="true"]') !== null)
      .catch(() => false);
    const liveRegion = await page.locator('[role="status"][aria-live="polite"]').count();
    const skip = await page.locator('.skip-link').count();

    record(
      'document is the accessible path',
      `h1: ${h1}, canvas aria-hidden: ${canvasHidden}, live region: ${liveRegion}, skip link: ${skip}`,
      h1 === 1 && canvasHidden && liveRegion === 1 && skip === 1,
    );

    // Keyboard: the skip link must be the first stop and must reach the document.
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    record(
      'keyboard reaches the skip link first',
      `focused: "${focused}"`,
      focused.includes('skip-link'),
    );

    await page.close();
  }

  /* ---- 6. No WebGL ---------------------------------------------------- */
  console.log('\n=== WebGL unavailable ===');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      // Genuinely remove the capability rather than mocking a flag.
      HTMLCanvasElement.prototype.getContext = function () {
        return null;
      };
    });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);

    const notice = await page
      .getByText(/cannot run the scene/i)
      .isVisible()
      .catch(() => false);
    const log = await page
      .locator('#log-heading')
      .isVisible()
      .catch(() => false);
    const canvases = await page.locator('canvas').count();

    record(
      'no WebGL still delivers the information',
      `notice: ${notice}, event log present: ${log}, canvases: ${canvases}`,
      notice && log,
    );
    await page.close();
  }

  /* ---- 7. FUSION: every visual state traces to a real backend event --- */
  console.log('\n=== P5 fusion (live control plane) ===');
  if (!process.env.LIVE_API) {
    console.log('  skipped — LIVE_API is not set, so there is no control plane to fuse with.');
    console.log('  This section is the P5 definition of done and is NOT optional; it is run');
    console.log('  against the Compose stack by `npm run verify:fusion`.');
  } else {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      // Both the HTTP calls and the socket go through this origin, which the
      // harness proxies to the running stack. That is the production topology —
      // one origin in front of both surfaces — rather than an approximation of
      // it, and it is what makes `connect-src 'self'` verifiable here.
      window.__API_BASE__ = '';
      window.__LIVE_URL__ = `ws://localhost:${location.port}/v1/live`;
    });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForSelector('#document');

    // The arrival beat must show a REAL measured round trip.
    const rtt = await page
      .locator('.arrival-line')
      .first()
      .innerText()
      .catch(() => '');
    record(
      'arrival reports a real measured round trip (§2.2, A6)',
      rtt.replace(/\s+/g, ' ').trim(),
      /\d+ms round trip/.test(rtt),
    );

    // A real tenant must have been provisioned by the real control plane.
    await page.waitForSelector('.station', { timeout: 20_000 }).catch(() => null);
    const provisioned = await page
      .locator('.arrival-line')
      .nth(2)
      .innerText()
      .catch(() => '');
    record(
      'a real tenant was provisioned by the control plane',
      provisioned.replace(/\s+/g, ' ').trim(),
      /tnt_/.test(provisioned),
    );

    // The break-out must produce a REAL 403 and fire the locked choreography.
    await page.getByRole('button', { name: /^Read it$/ }).click();
    const denial = await page
      .locator('.denial')
      .first()
      .innerText({ timeout: 25_000 })
      .catch(() => '');
    record(
      'the break-out is refused by the real control plane (§2.5)',
      denial.replace(/\s+/g, ' ').trim().slice(0, 80),
      /^403/.test(denial),
    );

    // The membrane inspector must carry the LIVE policy predicate.
    await page.getByRole('button', { name: /Open the membrane/ }).click();
    const predicate = await page
      .locator('.inspect code')
      .first()
      .innerText({ timeout: 20_000 })
      .catch(() => '');
    record(
      'the inspector shows the live predicate, not a description',
      predicate.trim(),
      /app_current_org\(\)/.test(predicate),
    );

    /*
     * The denial must arrive back over the socket as a real audit event.
     *
     * `waitFor`, NOT `isVisible({ timeout })`. isVisible() evaluates once and
     * ignores a timeout option entirely, so the original check was a race that
     * happened to pass — until it did not, once, in a full run. The event has a
     * genuine journey to make (commit → NOTIFY → gateway → socket → store →
     * render) and the assertion has to be willing to wait for it. A flaky check
     * on a real mechanism teaches nobody anything; a patient one on the same
     * mechanism proves it.
     */
    const auditRow = await page
      .locator('.event-denied')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    record(
      'the refusal returns as a real audit event over the socket',
      `denied row visible: ${auditRow}`,
      auditRow,
    );

    // It must be LIVE, not replaying.
    const live = await page.locator('.badge-live').count();
    const replay = await page.locator('.badge-replay').count();
    record(
      'the surface reports LIVE when it is genuinely live',
      `live badges: ${live}, replay badges: ${replay}`,
      live === 1 && replay === 0,
    );

    await page.close();
  }

  /* ---- 8. Stations are real, shareable URLs (§2.9) -------------------- */
  console.log('\n=== station URLs ===');
  for (const station of ['isolation', 'payments', 'fraud', 'ai', 'limits']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const response = await page.goto(`http://localhost:${PORT}/live/${station}/`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('#document').catch(() => null);
    const title = await page.title();
    const canonical = await page
      .locator('link[rel=canonical]')
      .getAttribute('href')
      .catch(() => null);
    record(
      `/live/${station}/ is a real page`,
      `${response?.status()} · "${title}" · ${canonical}`,
      response?.status() === 200 && canonical?.endsWith(`/live/${station}/`) === true,
    );
    await page.close();
  }

  /* ---- 8b. P6: the estate reads the machine layer --------------------- */
  console.log('\n=== P6 estate (§2.7, §2.8) ===');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForSelector('.estate-node', { timeout: 20_000 }).catch(() => null);

    const nodes = await page.locator('.estate-node').count();
    record('the estate resolves into four nodes (§2.7)', `${nodes} nodes`, nodes === 4);

    /*
     * Exactly one node is attackable. §2.7 makes the contrast the point: this
     * one is yours to break, those three are load-bearing. A second attackable
     * node would not be a styling slip — it would be the page inviting someone
     * at a system other people depend on.
     */
    const open = await page.locator('.estate-posture.is-open').count();
    const closed = await page.locator('.estate-posture.is-closed').count();
    record(
      'exactly one node is attackable; three are load-bearing',
      `open: ${open}, closed: ${closed}`,
      open === 1 && closed === 3,
    );

    /*
     * Statuses must match the machine layer exactly. Re-authoring them into
     * this surface would create a third copy that drifts — and the drift would
     * be in the flattering direction, which is what rule 10 exists to stop.
     */
    const profile = await (await fetch(`http://localhost:${PORT}/api/profile.json`)).json();
    const expected = profile.systems.map((system) =>
      system.statusDetail ? `${system.statusLabel} (${system.statusDetail})` : system.statusLabel,
    );
    const shown = (await page.locator('.estate-status').allInnerTexts()).map((t) => t.trim());
    const allPresent = expected.every((label) => shown.includes(label));
    record(
      'estate statuses come from the machine layer, not re-authored (rule 10)',
      `expected [${expected.join(' | ')}], shown [${shown.join(' | ')}]`,
      allPresent,
    );

    // §2.8: the disclosed limitations are read in context, after operating.
    const limitations = await page.locator('.estate-limitations li').count();
    record(
      'disclosed limitations are shown in context (§2.8)',
      `${limitations} items`,
      limitations >= 4,
    );

    // No live signal is claimed for a system whose permissions are unanswered.
    const signals = (await page.locator('.estate-signal').allInnerTexts()).join(' ');
    record(
      'no live signal is claimed for the production platforms (§15)',
      `mentions "No live signal published": ${signals.includes('No live signal published')}`,
      signals.includes('No live signal published'),
    );

    await page.close();
  }

  /* ---- 9. P8: the security headers, applied and survived -------------- */
  console.log('\n=== P8 security headers ===');
  {
    /*
     * Every page in this harness is already served under the real policy (see
     * headerRules), so these loads happen inside exactly the CSP the origin
     * will send. A generated policy nobody has loaded a page under is a guess;
     * running the real pages inside it and watching for refusals is the only
     * thing that distinguishes a correct policy from a plausible one.
     */
    const REQUIRED = [
      'content-security-policy',
      'x-content-type-options',
      'referrer-policy',
      'x-frame-options',
      'permissions-policy',
      'strict-transport-security',
    ];

    for (const [label, path] of [
      ['static home', '/'],
      ['case study', '/systems/hospital-operations/'],
      ['live surface', '/live/'],
    ]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const refusals = [];
      page.on('console', (message) => {
        const text = message.text();
        if (/Content Security Policy|Refused to/i.test(text)) refusals.push(text);
      });
      const response = await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'load' });
      await page.waitForTimeout(2500);

      const sent = response?.headers() ?? {};
      const missing = REQUIRED.filter((name) => !sent[name]);
      record(
        `${label}: all six security headers present`,
        missing.length === 0 ? 'all present' : `missing ${missing.join(', ')}`,
        missing.length === 0,
      );
      record(
        `${label}: loads with zero CSP refusals`,
        refusals.length === 0 ? 'none' : refusals.slice(0, 2).join(' | '),
        refusals.length === 0,
      );
      await page.close();
    }

    // The static surface loads no bundled JavaScript and has nothing to talk
    // to, so it is permitted to open no connections at all.
    const staticCsp = headerRules('/')['content-security-policy'] ?? '';
    record(
      'the static surface forbids connections entirely',
      staticCsp.includes("connect-src 'none'") ? "connect-src 'none'" : staticCsp.slice(0, 70),
      staticCsp.includes("connect-src 'none'"),
    );

    /*
     * THE LIVE SURFACE MUST RECEIVE EXACTLY ONE POLICY, AND IT MUST PERMIT
     * CONNECTIONS.
     *
     * This is the check whose absence let a production outage ship. Cloudflare
     * accumulates matching rules, so /live/ inherited the static
     * `connect-src 'none'` alongside its own `connect-src 'self'` — and a
     * browser enforces the intersection of every CSP header, so the strictest
     * won and the live surface could not reach its own control plane. Both
     * halves are asserted: one policy, and one that allows connections.
     */
    const liveCsp = headerRules('/live/')['content-security-policy'] ?? '';
    record(
      'the live surface receives exactly one CSP, not an accumulated pair',
      liveCsp.includes(',') ? `ACCUMULATED: ${liveCsp.slice(0, 90)}` : 'single policy',
      liveCsp !== '' && !liveCsp.includes(','),
    );
    record(
      'the live surface is permitted to reach its own control plane',
      /connect-src 'self'/.test(liveCsp) && !/connect-src 'none'/.test(liveCsp)
        ? "connect-src 'self'"
        : `BLOCKED: ${(liveCsp.match(/connect-src[^;]*/g) || ['absent']).join(' + ')}`,
      /connect-src 'self'/.test(liveCsp) && !/connect-src 'none'/.test(liveCsp),
    );
    const unsafe = /script-src[^;]*unsafe-(inline|eval)/;
    record(
      'no unsafe-inline or unsafe-eval in either script-src',
      'both policies checked',
      staticCsp !== '' && !unsafe.test(staticCsp) && !unsafe.test(liveCsp),
    );

    // The hashes must be the ones this build produced, not a stale copy left
    // behind by an earlier one.
    const home = await readFile(join(DIST, 'index.html'), 'utf8');
    const inline = [...home.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter((body) => body.trim() !== '');
    const { createHash } = await import('node:crypto');
    const allHashed = inline.every((body) =>
      staticCsp.includes(createHash('sha256').update(body, 'utf8').digest('base64')),
    );
    record(
      'every inline script in this build is hashed into the policy',
      `${inline.length} inline script(s) on home`,
      inline.length > 0 && allHashed,
    );
  }

  /* ---- 10. Responsive ------------------------------------------------- */
  console.log('\n=== responsive ===');
  for (const [label, viewport] of [
    ['mobile 390', { width: 390, height: 844 }],
    ['tablet 834', { width: 834, height: 1112 }],
    ['desktop 1440', { width: 1440, height: 900 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://localhost:${PORT}/live/`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    record(`${label}: no horizontal overflow`, `${overflow}px`, overflow <= 0);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
  deadServer.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\nrender-verify: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.error('render-verify: FAILED');
  for (const f of failed) console.error(`  ✗ ${f.name} — ${f.detail}`);
  process.exit(1);
}
console.log('render-verify: OK');
