/**
 * Print /cv to public/cv.pdf — blueprint T8.
 *
 * A LOCAL TOOL, NEVER A CI DEPENDENCY.
 * ------------------------------------
 * The PDF is committed to the repository, so CI never needs to produce it and
 * never runs this script. `playwright-core` is used rather than `playwright`
 * for exactly this reason: it has no browser-download postinstall, so a CI
 * `npm ci` pulls roughly a megabyte of JavaScript and nothing else. The script
 * drives a Chromium-based browser already installed on the machine (Edge or
 * Chrome) instead of a managed one, so there is no download step at all.
 *
 * WHY IT IS DETERMINISTIC
 * -----------------------
 * A browser stamps every PDF with its creation and modification time, so two
 * runs of the same page would otherwise differ byte-for-byte and the file
 * would churn in git on every regeneration. Those two timestamps are rewritten
 * to a fixed value afterwards, character-for-character the same length so the
 * cross-reference table's byte offsets stay valid. The result: identical input
 * produces an identical file, which `npm run cv:pdf -- --check` verifies by
 * hashing.
 *
 * Usage:
 *   npm run build && npm run cv:pdf
 *   npm run cv:pdf -- --check    (regenerate twice, prove the hashes match)
 */
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const DIST = resolve('dist');
const OUTPUT = resolve('public/cv.pdf');
const CHECK = process.argv.includes('--check');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/** Serve dist/ over http. file:// would break the absolute /fonts and /_astro paths. */
function serveDist() {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
      let path = join(DIST, url);
      const found = await stat(path).catch(() => null);
      if (!found || found.isDirectory()) path = join(path, 'index.html');
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** Edge and Chrome are both Chromium; whichever exists is fine for printing. */
async function launchBrowser() {
  const channels = ['msedge', 'chrome', 'chromium'];
  const failures = [];
  for (const channel of channels) {
    try {
      return await chromium.launch({ channel });
    } catch (error) {
      failures.push(`${channel}: ${String(error).split('\n')[0]}`);
    }
  }
  throw new Error(
    `cv-pdf: no Chromium-based browser found. Install Microsoft Edge or Google Chrome.\n${failures.join('\n')}`,
  );
}

/**
 * Replace the two timestamps a browser writes into the PDF trailer with a
 * fixed one. Same digit count, so every byte offset in the file stays correct.
 */
function stripTimestamps(buffer) {
  const FIXED = '20260101000000';
  return Buffer.from(
    buffer
      .toString('latin1')
      .replace(/(\/(?:CreationDate|ModDate)\s*\(D:)(\d{14})/g, (_match, prefix) => prefix + FIXED),
    'latin1',
  );
}

async function renderPdf() {
  if (!(await stat(DIST).catch(() => null))) {
    throw new Error('cv-pdf: dist/ not found — run `npm run build` first.');
  }

  const server = await serveDist();
  const { port } = server.address();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/cv`, { waitUntil: 'load' });
    // Self-hosted fonts must be resolved before printing, or the PDF falls
    // back to a system face and the line breaks move.
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: false,
      preferCSSPageSize: true,
    });
    return stripTimestamps(pdf);
  } finally {
    await browser.close();
    server.close();
  }
}

const first = await renderPdf();

if (CHECK) {
  const second = await renderPdf();
  const hashA = createHash('sha256').update(first).digest('hex');
  const hashB = createHash('sha256').update(second).digest('hex');
  console.log(`cv-pdf: run 1 sha256 ${hashA}`);
  console.log(`cv-pdf: run 2 sha256 ${hashB}`);
  if (hashA !== hashB) {
    console.error('cv-pdf: FAILED — two runs produced different bytes.');
    process.exit(1);
  }
  console.log('cv-pdf: deterministic — both runs identical.');
}

await writeFile(OUTPUT, first);
console.log(`cv-pdf: wrote ${OUTPUT} (${(first.length / 1024).toFixed(1)}KB)`);
