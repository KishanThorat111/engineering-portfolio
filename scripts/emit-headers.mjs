/**
 * Emits `dist/_headers` — the security response headers this origin sends.
 *
 * WHY THIS EXISTS
 * The P0 review recorded, by fetching them, that the live origin sent none:
 * no CSP, no HSTS, no X-Content-Type-Options, no Referrer-Policy. For a site
 * whose subject is security engineering that is the wrong detail for a reader
 * to find, and Phase 8's ≥95 best-practices threshold fails on it.
 *
 * WHY A FILE AND NOT A WORKER
 * Verified against the installed wrangler rather than recalled: its own bundle
 * declares `HEADERS_FILENAME = "_headers"`, so Workers static assets read this
 * file from the assets directory. That keeps the deployment a static-assets
 * deployment — no Worker script, no request-time code — which is the shape P0
 * chose and the shape with the least to go wrong.
 *
 * WHY THE CSP IS COMPUTED RATHER THAN WRITTEN
 * The static surface carries two small inline scripts (the nav disclosure and
 * the reveal observer, ~1.1KB together). A CSP with `'unsafe-inline'` would
 * technically pass a scanner while permitting exactly the injection CSP exists
 * to stop. So this hashes the inline scripts that are actually in the build and
 * allows precisely those. If a script changes, its hash changes with it; if one
 * is added without going through the build, the browser blocks it.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, relative } from 'node:path';

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

/** Every inline <script> body in the build, hashed the way a CSP wants. */
function inlineScriptHashes() {
  const hashes = new Set();
  for (const file of htmlFiles(DIST)) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
      const body = match[1];
      if (body === undefined || body.trim() === '') continue;
      // The hash is over the exact bytes between the tags, including
      // whitespace — that is what the browser hashes.
      hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
    }
  }
  return [...hashes];
}

const scriptHashes = inlineScriptHashes();

/*
 * Two policies, because the two surfaces genuinely differ.
 *
 * The static surface loads no bundled JavaScript at all, so its policy can be
 * as tight as the inline hashes allow and forbid connections entirely.
 *
 * The live surface loads its own bundle and opens a WebSocket to the same
 * origin. `connect-src 'self'` covers both http and ws on that origin, and
 * `worker-src blob:` is required because three spawns workers from blobs for
 * texture decoding. Nothing wider than that.
 */
const COMMON = [
  "default-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Astro emits component styles as <style> blocks; hashing every one of them
  // would make this file churn on any styling change for a class of attack the
  // rest of this policy already closes.
  "style-src 'self' 'unsafe-inline'",
];

/*
 * `connect-src 'self'`, changed from 'none' in the P9 redesign.
 *
 * 'none' was correct when it was written: the static surface loaded no bundled
 * JavaScript and had nothing to talk to, so forbidding connections outright
 * cost nothing. The homepage now carries a live estate panel that measures the
 * control plane's round trip in the visitor's own browser and reads the
 * demonstration catalogue — its own API, on its own origin.
 *
 * This is the correct policy for a page that legitimately makes a request, not
 * a loosening: it is same-origin only, it admits no third party, and the static
 * surface still ships zero bundled JavaScript. Everything the panel states
 * without a network call is rendered server-side, so the page is complete and
 * honest with scripting disabled.
 */
const staticCsp = [
  ...COMMON,
  `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
  "connect-src 'self'",
].join('; ');

/*
 * `blob:` IN script-src IS REQUIRED, AND IT IS NOT DECORATION.
 *
 * troika-three-text — the text renderer behind the scene's plane labels —
 * generates glyph SDFs in a worker spawned from a blob, and that worker then
 * calls importScripts() on ANOTHER blob URL. Creating the worker is governed by
 * worker-src, which was already allowed; the importScripts call inside it is
 * governed by script-src, which was not. The browser refused it with
 *
 *   NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'
 *   worker module init function failed to rehydrate
 *
 * so the text never resolved, and because the Canvas wraps the world in
 * <Suspense fallback={null}>, one unresolved child rendered the ENTIRE scene as
 * zero pixels. In production that was a blank page with no error visible to a
 * visitor: WebGL fine, canvas present, nothing drawn.
 *
 * This is scoped to /live/* alone. The static surface keeps script-src pinned
 * to 'self' plus per-script hashes and never gains blob:, so the pages that
 * carry the published claims are unchanged.
 */
const liveCsp = [
  ...COMMON,
  "script-src 'self' blob:",
  "connect-src 'self'",
  'worker-src blob:',
].join('; ');

const SHARED = [
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: DENY',
  // No camera, microphone, geolocation, or payment anywhere on this origin.
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  // Two years, subdomains included. Cloudflare terminates TLS, and the origin
  // is https-only, so this costs nothing and closes the downgrade window.
  '  Strict-Transport-Security: max-age=63072000; includeSubDomains',
  '  Cross-Origin-Opener-Policy: same-origin',
];

const body = `# Security response headers, generated by scripts/emit-headers.mjs.
#
# DO NOT EDIT BY HAND — it is rebuilt on every build, and the script-src hashes
# below are computed from the inline scripts actually present in this build.
# Read by Cloudflare Workers static assets, whose own bundle declares
# HEADERS_FILENAME = "_headers".
#
# Rebuilt: this file is an artifact, so a stale copy cannot ship.

/*
${SHARED.join('\n')}
  Content-Security-Policy: ${staticCsp}

# The live surface loads its own bundle and opens a same-origin WebSocket, so
# it needs a wider connect-src than the static pages — and only that.
#
# The unset line below IS THE WHOLE POINT OF THIS BLOCK.
#
# Cloudflare ACCUMULATES every matching rule; a more specific path does not
# override a broader one. Without the unset, /live/ received TWO policies — this
# one and the /* one — and a browser enforces the INTERSECTION of all CSP
# headers it is given. The static policy's connect-src 'none' therefore won,
# and every fetch and the WebSocket on the live surface were refused with
# "Failed to fetch" in production while every gate here stayed green.
#
# Verified against the installed wrangler rather than recalled: its bundle
# defines UNSET_OPERATOR = "! " and compiles each rule to { set, unset }, and
# the doubled Strict-Transport-Security seen in production is the same
# accumulation joining values with a comma.
#
# The shared headers are deliberately NOT repeated here — /* already applied
# them, and repeating them is what produced those doubled values.
/live/*
  ! Content-Security-Policy
  Content-Security-Policy: ${liveCsp}
`;

writeFileSync(join(DIST, '_headers'), body);
console.log(
  `emit-headers: OK — ${scriptHashes.length} inline script hash(es) allowed on the static surface.`,
);

if (scriptHashes.length === 0) {
  // The static surface has two inline scripts. Zero means the detection broke,
  // and a policy that allowed nothing would break the nav and the reveals.
  console.error('emit-headers: FAILED — no inline scripts found, which cannot be right.');
  process.exit(1);
}
