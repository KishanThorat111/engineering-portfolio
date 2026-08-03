/**
 * Copy gate — Truth Constitution rule 5, blueprint §7.5.
 *
 * Greps every built HTML file in dist/ for the banned-word lists in
 * content/banned.json. Runs against BUILT output, not source, so no template,
 * component, or content path can smuggle a banned word past the gate.
 *
 * HTML comments are stripped before matching: OWNER-INPUT markers are process
 * metadata, not published copy. Any OWNER-INPUT marker found is reported as a
 * warning so it stays visible — unresolved markers become launch blockers in
 * Phase 8, but they do not fail interim builds.
 *
 * Exits non-zero on any banned-word hit. This gate is never disabled to make
 * a build pass.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DIST = resolve('dist');
const BANNED = JSON.parse(readFileSync(resolve('content/banned.json'), 'utf8'));

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Escape regex metacharacters, then let spaces match any whitespace run. */
function termToRegex(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

let files;
try {
  files = htmlFiles(DIST);
} catch {
  console.error('copy-check: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const violations = [];
const ownerInputs = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file);

  for (const match of raw.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (/OWNER-INPUT/i.test(match[1])) {
      ownerInputs.push(`${rel}:${lineOf(raw, match.index)} ${match[1].trim().slice(0, 80)}`);
    }
  }

  // Strip comments so process markers are not scanned as published copy.
  const text = raw.replace(/<!--[\s\S]*?-->/g, '');

  for (const [category, terms] of Object.entries(BANNED)) {
    if (category.startsWith('$')) continue;
    for (const term of terms) {
      for (const match of text.matchAll(termToRegex(term))) {
        violations.push(
          `${rel}:${lineOf(text, match.index)} banned ${category} word "${match[0]}"`,
        );
      }
    }
  }
}

if (ownerInputs.length > 0) {
  console.warn(
    `copy-check: ${ownerInputs.length} OWNER-INPUT marker(s) present (launch blockers by Phase 8):`,
  );
  for (const marker of ownerInputs) console.warn(`  ⚠ ${marker}`);
}

if (violations.length > 0) {
  console.error(`copy-check: FAILED — ${violations.length} banned-word violation(s):`);
  for (const violation of violations) console.error(`  ✗ ${violation}`);
  process.exit(1);
}

console.log(`copy-check: OK — ${files.length} HTML file(s) clean.`);
