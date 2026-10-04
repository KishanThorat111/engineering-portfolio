/**
 * The B-202 gate: the security policy each surface ACTUALLY receives.
 *
 * Twice in August 2026 the live surface shipped broken while every check was
 * green, and both times the cause was the effective Content-Security-Policy —
 * what a browser enforces after Cloudflare has composed every matching
 * `_headers` rule — rather than anything a source file said:
 *
 *   3cf7754  /live/ got TWO policies; the browser enforced their intersection,
 *            the static one's connect-src 'none' won, and nothing could connect.
 *   7b4cf85  the live policy's script-src lacked blob:, so the text renderer's
 *            worker could not importScripts() its own code; the 3D scene drew
 *            nothing at all.
 *
 * The protection was a local browser harness that never ran in CI. This gate
 * runs in CI: it composes dist/_headers with the same code that harness uses
 * (scripts/lib/cloudflare-headers.mjs) and asserts the effective policy for
 * each surface. It then proves it is not vacuous, on every run, by applying
 * both historical defects to a copy of the file and requiring a failure for
 * each — a gate that cannot fail is not a gate.
 *
 * usage: node scripts/policy-check.mjs   (after `npm run build`)
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { composer } from './lib/cloudflare-headers.mjs';

const DIST = resolve('dist');

/** `default-src 'self'; connect-src 'self'` → Map(directive → Set(sources)). */
function directives(csp) {
  const map = new Map();
  for (const part of csp.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) map.set(name.toLowerCase(), new Set(sources));
  }
  return map;
}

/** Every violation of the effective policies, for one `_headers` text. */
export function violations(text) {
  const headersFor = composer(text);
  const found = [];
  const check = (path, rule) => {
    const headers = headersFor(path);
    const csp = headers['content-security-policy'] ?? '';
    // Two policies accumulate into one comma-joined value; one policy has
    // exactly one default-src.
    const policies = csp ? csp.split(/,\s*(?=default-src)/).length : 0;
    if (policies !== 1) {
      found.push(`${path}: receives ${policies} Content-Security-Policy headers, needs exactly 1`);
      return;
    }
    const d = directives(csp);
    rule(d, (message) => found.push(`${path}: ${message}`));
    const hsts = headers['strict-transport-security'] ?? '';
    if (hsts.includes(',')) found.push(`${path}: Strict-Transport-Security sent twice ("${hsts}")`);
  };

  const live = (d, fail) => {
    const connect = d.get('connect-src') ?? new Set();
    if (!connect.has("'self'") || connect.has("'none'")) {
      fail(`connect-src must allow 'self' and not 'none' — the page must reach its own API`);
    }
  };
  // The live surface and every sheet of it.
  for (const path of ['/live/', '/live/isolation/', '/live/b-201/']) check(path, live);
  // The archived world needs blob: in script-src (7b4cf85) and worker-src.
  check('/live/archive/', (d, fail) => {
    live(d, fail);
    if (!(d.get('script-src') ?? new Set()).has('blob:')) {
      fail(`script-src lacks blob: — the archived scene's text worker cannot load (7b4cf85)`);
    }
    if (!(d.get('worker-src') ?? new Set()).has('blob:')) fail(`worker-src lacks blob:`);
  });
  // The static surface never gains blob:, and keeps its connect rule.
  check('/', (d, fail) => {
    if ((d.get('script-src') ?? new Set()).has('blob:')) fail(`the static surface gained blob:`);
    if (!(d.get('connect-src') ?? new Set()).has("'self'")) fail(`connect-src lacks 'self'`);
  });
  return found;
}

const text = readFileSync(join(DIST, '_headers'), 'utf8');
const real = violations(text);
if (real.length) {
  console.error(`policy-check: FAILED — ${real.length} effective-policy violation(s):`);
  for (const v of real) console.error(`  ✗ ${v}`);
  process.exit(1);
}

/*
 * NEGATIVE CONTROLS — the two historical defects, re-applied to a copy.
 * Each must be caught; if either passes, this gate has stopped modelling the
 * platform and is reporting green over nothing.
 */
const controls = [
  ['3cf7754: the /live/* unset removed', text.replace(/^(\s*)! Content-Security-Policy\s*$/m, '')],
  [
    '7b4cf85: blob: removed from the live script-src',
    text.replace("script-src 'self' blob:", "script-src 'self'"),
  ],
];
for (const [name, tampered] of controls) {
  if (tampered === text) {
    console.error(
      `policy-check: FAILED — negative control "${name}" could not be applied; the file changed shape`,
    );
    process.exit(1);
  }
  if (violations(tampered).length === 0) {
    console.error(`policy-check: FAILED — negative control "${name}" was NOT caught`);
    process.exit(1);
  }
}

console.log(
  `policy-check: OK — effective policies correct for 5 paths; both historical defects (3cf7754, 7b4cf85) re-applied and caught.`,
);
