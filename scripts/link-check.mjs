/**
 * Internal link gate — blueprint §7.5.
 *
 * Extracts every href/src from built HTML in dist/ and verifies that each
 * internal target resolves to a real built file. Dead internal links are the
 * failure mode that killed the previous portfolio; here they fail the build.
 *
 * External URLs (http/https/mailto/tel) are out of scope for CI — they are
 * checked in the quarterly maintenance review instead, to keep CI deterministic
 * and offline.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

const DIST = resolve('dist');

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function targetExists(urlPath, fromFile) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (clean === '') return true; // pure fragment/query — same page
  const base = clean.startsWith('/') ? join(DIST, clean) : join(dirname(fromFile), clean);
  const candidates = clean.endsWith('/')
    ? [join(base, 'index.html')]
    : [base, `${base}.html`, join(base, 'index.html')];
  return candidates.some((candidate) => existsSync(candidate));
}

let files;
try {
  files = htmlFiles(DIST);
} catch {
  console.error('link-check: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const EXTERNAL = /^(https?:|mailto:|tel:|data:|#)/i;
const broken = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (EXTERNAL.test(url)) continue;
    checked += 1;
    if (!targetExists(url, file)) {
      broken.push(`${rel} → ${url}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`link-check: FAILED — ${broken.length} broken internal link(s):`);
  for (const link of broken) console.error(`  ✗ ${link}`);
  process.exit(1);
}

console.log(`link-check: OK — ${checked} internal reference(s) across ${files.length} file(s).`);
