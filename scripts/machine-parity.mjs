/**
 * Machine/human parity gate — blueprint §7.6, constitution rule 10.
 *
 * WHAT THIS PROVES, AND WHAT PROVES THE REST
 * ------------------------------------------
 * The profile's *shape* is validated by Zod inside the build itself
 * (`src/lib/profile.ts` ends with `profileSchema.parse`), so a malformed
 * profile fails `npm run build` and therefore fails CI. This gate does the
 * other half: it reads the artifact that actually landed in `dist` and checks
 * that what it tells a machine matches what the pages tell a person.
 *
 * That split matters. A schema can only say the document is well-formed. It
 * cannot notice that the machine layer calls a platform LIVE while the page
 * calls it PRE-LAUNCH — and that divergence is the one this site would be most
 * damaged by, because the machine version is the one a screener quotes.
 *
 * Checked here:
 *   1. Statuses agree, per system, between profile.json, the rendered badge,
 *      and the JSON-LD `creativeWorkStatus`.
 *   2. Role lines agree between profile.json and the rendered page.
 *   3. Every qualified metric in the profile appears on its page, with its
 *      qualifier — a figure that reaches a machine without its date is exactly
 *      the failure rule 2 exists to prevent.
 *   4. Every system carries at least one limitation into the machine layer.
 *   5. Canonical and Open Graph URLs are absolute and share one origin.
 *
 * The gate reads the origin from the artifact rather than hardcoding it, so
 * changing the production domain does not require editing this file.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST = resolve('dist');
const PROFILE = join(DIST, 'api/profile.json');

if (!existsSync(PROFILE)) {
  console.error('machine-parity: dist/api/profile.json not found — run `npm run build` first.');
  process.exit(1);
}

const profile = JSON.parse(readFileSync(PROFILE, 'utf8'));
const failures = [];
const checked = [];

function fail(message) {
  failures.push(message);
}

/** Strip tags and normalise entities so rendered text compares fairly. */
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* --- 0. The artifact's own contract ------------------------------------ */

if (profile.schemaVersion !== 1) {
  fail(`schemaVersion is ${JSON.stringify(profile.schemaVersion)}, expected 1`);
}
checked.push('schemaVersion');

const origin = new URL(profile.links.website).origin;

/* --- 1..4. Per-system parity ------------------------------------------- */

for (const system of profile.systems) {
  const path = new URL(system.url).pathname.replace(/^\/|\/$/g, '');
  const page = join(DIST, path, 'index.html');

  if (!existsSync(page)) {
    fail(`${system.name}: profile.json points at ${system.url}, which was not built`);
    continue;
  }

  const html = readFileSync(page, 'utf8');
  const text = textOf(html);

  // 1. Status, three ways: the profile, the rendered badge, and the JSON-LD.
  const badge = html.match(/<span class="label"[^>]*>([\s\S]*?)<\/span>/i);
  const renderedStatus = badge ? textOf(badge[1]) : '(no badge found)';
  const expected = system.statusDetail
    ? `${system.statusLabel} (${system.statusDetail})`
    : system.statusLabel;

  if (renderedStatus !== expected) {
    fail(
      `${system.name}: page badge reads "${renderedStatus}" but profile.json says "${expected}"`,
    );
  }

  const ld = html.match(/"creativeWorkStatus":"([^"]+)"/);
  if (!ld) {
    fail(`${system.name}: no SoftwareApplication creativeWorkStatus in the page's JSON-LD`);
  } else if (textOf(ld[1]) !== expected) {
    fail(`${system.name}: JSON-LD status "${ld[1]}" does not match profile.json "${expected}"`);
  }
  checked.push(`${system.name}: status`);

  // 2. Role line.
  if (!text.includes(textOf(system.role))) {
    fail(`${system.name}: role line in profile.json does not appear on ${system.url}`);
  }
  checked.push(`${system.name}: role line`);

  // 3. Metrics, each with its qualifier.
  for (const metric of system.metrics ?? []) {
    if (!text.includes(textOf(metric.value))) {
      fail(`${system.name}: metric value "${metric.value}" is not on the page`);
    }
    if (!text.includes(textOf(metric.qualifier))) {
      fail(
        `${system.name}: metric "${metric.value}" reaches the machine layer but its qualifier ` +
          `"${metric.qualifier}" is not on the page — a figure must never travel without its date`,
      );
    }
    checked.push(`${system.name}: metric ${metric.value}`);
  }

  // 4. Limitations must survive into the machine layer.
  if (!Array.isArray(system.limitations) || system.limitations.length === 0) {
    fail(`${system.name}: no limitations in profile.json — rule 3 applies to machines too`);
  } else {
    for (const item of system.limitations) {
      if (!text.includes(textOf(item.limitation))) {
        fail(`${system.name}: a limitation in profile.json is not stated on the page`);
      }
    }
    checked.push(`${system.name}: ${system.limitations.length} limitation(s)`);
  }
}

/* --- 5. Canonicals and Open Graph, across every built page -------------- */

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const rel = file.replace(DIST, '').replace(/\\/g, '/');

  /* Pages excluded from discovery carry no share card by design, so they are
     outside this section's remit — but they must still be canonical. */
  const isNoindex = /<meta name="robots" content="noindex/i.test(html);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canonical) {
    fail(`${rel}: no canonical link`);
  } else if (!canonical[1].startsWith(origin)) {
    fail(`${rel}: canonical "${canonical[1]}" is not on the profile's origin ${origin}`);
  }

  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (!ogImage) {
    if (!isNoindex) fail(`${rel}: no og:image`);
  } else {
    if (!ogImage[1].startsWith(origin)) {
      fail(`${rel}: og:image "${ogImage[1]}" is not on the profile's origin ${origin}`);
    }
    const asset = join(DIST, new URL(ogImage[1]).pathname);
    if (!existsSync(asset)) {
      fail(`${rel}: og:image points at ${ogImage[1]}, which was not generated`);
    }
  }

  if (!/<meta name="description" content="[^"]+"/.test(html)) fail(`${rel}: no meta description`);
}
checked.push('canonical, og:image, and description on every page');

/* ----------------------------------------------------------------------- */

if (failures.length > 0) {
  console.error(`machine-parity: FAILED — ${failures.length} divergence(s):`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  console.error(
    'The machine layer and the human pages must state the same facts. Fix the source they ' +
      'both read; do not patch one side.',
  );
  process.exit(1);
}

console.log(`machine-parity: OK — ${checked.length} check(s) agree across both layers.`);
