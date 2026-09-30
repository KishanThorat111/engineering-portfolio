/**
 * Copy gate — Truth Constitution rule 5, blueprint §7.5.
 *
 * Greps BUILT output in dist/ for the banned-word lists in
 * content/banned.json. Runs against built output, not source, so no template,
 * component, or content path can smuggle a banned word past the gate.
 *
 * WHAT IT SCANS, AND WHY THAT WIDENED
 * -----------------------------------
 * Until Phase 0 this gate read `.html` only, which left the machine layer
 * unguarded: `/api/profile.json` and `/llms.txt` are published copy — the
 * machine layer is a first-class audience (dossier §1.5), and a screening agent
 * quoting profile.json is quoting this site. Rule 5 binds every surface that
 * ships, so the gate now covers the published text artifacts too. They were
 * clean when this widened; the point is that nothing was checking.
 *
 * Minified JavaScript is deliberately NOT scanned. Bundled third-party code
 * contains these words as identifiers (`owner`, `clients`) in quantities that
 * would drown the signal, and a gate whose output nobody reads is not a gate.
 * The experience app's visitor-facing copy therefore has to reach the build as
 * data, not as literals scattered through a bundle — one content module emitted
 * as JSON, which this gate already covers. That constraint is the reason for
 * the rule, not a workaround for it.
 *
 * HTML comments are stripped before matching: OWNER-INPUT markers are process
 * metadata, not published copy. Any OWNER-INPUT marker found is reported as a
 * warning so it stays visible — unresolved markers become launch blockers in
 * Phase 8, but they do not fail interim builds.
 *
 * Exits non-zero on any banned-word hit, and also on finding nothing to scan:
 * a gate that silently checks zero files is worse than one that fails, because
 * it reports success for work it never did.
 *
 * This gate is never disabled to make a build pass.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DIST = resolve('dist');
const BANNED = JSON.parse(readFileSync(resolve('content/banned.json'), 'utf8'));

/** Published copy for people. */
const MARKUP = /\.html$/;

/** Published copy for machines — the sitemap, robots, llms.txt, profile.json. */
const TEXT = /\.(txt|json|xml)$/;

/*
 * Upstream font licences ship verbatim by legal obligation, so a hit inside one
 * could not be fixed — only excused. Excluding them by name, with the reason
 * written down, is honest; discovering the conflict later and softening the
 * whole gate to accommodate it would not be.
 */
const EXCLUDED = [/^fonts[\\/]OFL-.*\.txt$/];

function allFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...allFiles(full));
    else out.push(full);
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

let all;
try {
  all = allFiles(DIST);
} catch {
  console.error('copy-check: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const markup = [];
const text = [];
for (const file of all) {
  const rel = relative(DIST, file);
  if (EXCLUDED.some((pattern) => pattern.test(rel))) continue;
  if (MARKUP.test(file)) markup.push(file);
  else if (TEXT.test(file)) text.push(file);
}

if (markup.length === 0 || text.length === 0) {
  console.error(
    `copy-check: FAILED — nothing to scan (${markup.length} markup file(s), ` +
      `${text.length} text artifact(s) under ${relative(process.cwd(), DIST)}). ` +
      'This build produced no published copy for one of its audiences, or the gate has ' +
      'lost sight of the output. Either way it is not a pass.',
  );
  process.exit(1);
}

const violations = [];
const ownerInputs = [];

for (const file of [...markup, ...text]) {
  const raw = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file);
  const isMarkup = MARKUP.test(file);

  if (isMarkup) {
    for (const match of raw.matchAll(/<!--([\s\S]*?)-->/g)) {
      if (/OWNER-INPUT/i.test(match[1])) {
        ownerInputs.push(`${rel}:${lineOf(raw, match.index)} ${match[1].trim().slice(0, 80)}`);
      }
    }
  }

  // Strip comments so process markers are not scanned as published copy.
  const body = isMarkup ? raw.replace(/<!--[\s\S]*?-->/g, '') : raw;

  for (const [category, terms] of Object.entries(BANNED)) {
    if (category.startsWith('$')) continue;
    for (const term of terms) {
      for (const match of body.matchAll(termToRegex(term))) {
        violations.push(
          `${rel}:${lineOf(body, match.index)} banned ${category} word "${match[0]}"`,
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

console.log(
  `copy-check: OK — ${markup.length} markup file(s) and ${text.length} machine-layer ` +
    'artifact(s) clean.',
);
