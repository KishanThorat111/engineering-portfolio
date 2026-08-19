/**
 * Token contrast gate — blueprint §5: "All pairings must pass WCAG 2.2 AA
 * (checked in CI)."
 *
 * Reads the colour tokens straight out of `src/styles/tokens.css` rather than
 * holding a second copy, so the gate cannot drift from the palette it checks.
 * Every pairing listed below is one the components actually use; adding a new
 * colour combination to a component means adding it here.
 *
 * Thresholds are the WCAG 2.2 AA minimums: 4.5:1 for normal text, 3:1 for
 * large text and for non-text elements such as borders and focus rings.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve('apps/static/src/styles/tokens.css'), 'utf8');

/**
 * Pull colour declarations out of the token file, following aliases.
 *
 * The palette gained a semantic register (--signal, --pending, --isolation,
 * --record, --fault) with the older names kept as aliases pointing at it, so
 * `--accent: var(--signal)` is now a legitimate declaration. A parser that only
 * understood literal hex read those as missing tokens and exited 1 — the gate
 * reporting a palette failure when the only fault was its own reading of the
 * file. Aliases now resolve transitively. Nothing here is loosened: the check
 * list below is strictly larger than it was.
 */
const declared = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6}\b|var\(--[\w-]+\))/g)].map((m) => [m[1], m[2]]),
);

function resolveToken(name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`contrast-check: circular token alias at --${name}`);
  seen.add(name);
  const value = declared[name];
  if (value === undefined) return undefined;
  if (value.startsWith('#')) return value;
  return resolveToken(value.slice(6, -1), seen);
}

const tokens = Object.fromEntries(
  Object.keys(declared)
    .map((name) => [name, resolveToken(name)])
    .filter(([, hex]) => hex !== undefined),
);

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Enforced pairings: [foreground, background, minimum, what uses it]
 *
 * These carry information a reader must be able to perceive — text, and the
 * boundaries and rings that identify a control or its focus state (WCAG 2.2
 * SC 1.4.3 and SC 1.4.11). A failure here fails the build.
 */
const REQUIRED = [
  /* Prose, on all three grounds the redesign introduced. */
  ['text', 'bg', 4.5, 'body text on the page background'],
  ['text', 'bg-raised', 4.5, 'body text on cards and chips'],
  ['text', 'bg-inset', 4.5, 'body text in the live panel and the register bands'],
  ['text-muted', 'bg', 4.5, 'muted prose and captions'],
  ['text-muted', 'bg-raised', 4.5, 'chip qualifiers, stack tags, card meta'],
  ['text-muted', 'bg-inset', 4.5, 'the live panel copy and the register limitation text'],

  /*
   * --text-faint carries CONTENT, not decoration: stack lists, the "as of"
   * date qualifiers, post dates, section eyebrows. It is held to the text
   * minimum on every ground for that reason, and it genuinely failed at its
   * first value (3.89:1 on --bg) until it was lightened.
   */
  ['text-faint', 'bg', 4.5, 'stack lists, date qualifiers, eyebrow labels'],
  ['text-faint', 'bg-raised', 4.5, 'the same, on a raised surface'],
  ['text-faint', 'bg-inset', 4.5, 'the same, inside the live panel and register bands'],

  /* The register. Each entry means one state and is read as text somewhere. */
  ['signal', 'bg', 4.5, 'IN PRODUCTION and LIVE status labels'],
  ['signal', 'bg-inset', 4.5, 'the live panel status line once the plane answers'],
  ['pending', 'bg', 4.5, 'PRE-LAUNCH status labels and caution notes'],
  ['pending', 'bg-inset', 4.5, 'the live panel status line when it cannot reach the plane'],
  ['isolation', 'bg', 4.5, 'tenancy-boundary labels'],
  ['record', 'bg', 4.5, 'the evidence rail label'],
  ['record', 'bg-inset', 4.5, 'the evidence rail label on its inset ground'],
  ['fault', 'bg', 4.5, 'the DISCLOSED LIMITATION label on the register'],
  ['fault', 'bg-inset', 4.5, 'the same, on an alternating register band'],

  /* Reversed pairs — dark content on a coloured ground. */
  ['bg', 'signal', 4.5, 'dark label on a primary button'],
  ['bg', 'isolation', 4.5, 'selected text'],

  /* Non-text, SC 1.4.11: 3:1 for anything identifying a control or a state. */
  ['focus', 'bg', 3, 'the focus ring'],
  ['text-faint', 'bg', 3, 'the default link underline, which is what identifies a link'],
  ['signal', 'bg', 3, 'the link underline on hover'],
  ['text-muted', 'bg', 3, 'the secondary button boundary, which identifies it as a control'],
  ['fault', 'bg', 3, 'the limitation rule, the only marker of that block'],
];

/**
 * Reported, not enforced.
 *
 * `--border` against `--bg` is 1.33:1. It is used only for decorative edges —
 * card and chip outlines whose content is independently readable and which
 * identify no control and no state, so SC 1.4.11 does not apply to them. It is
 * printed rather than dropped because the honest position is that this palette
 * gives very low-contrast card edges by design (blueprint §5 puts elevation in
 * a border-plus-background shift and locks the token values). That is a real
 * consequence for low-vision readers, it is a consequence of a very dark
 * ground, and it is logged for the manual accessibility pass.
 * Anything that must be *perceived* belongs in REQUIRED above, not here.
 */
const INFORMATIONAL = [
  ['border', 'bg', 'decorative section and chip edges'],
  ['border-strong', 'bg', 'the opening eyebrow rule'],
  ['bg-raised', 'bg', 'the raised-surface shift behind cards'],
  ['bg-inset', 'bg', 'the recessed shift behind the live panel and register bands'],
];

let failed = 0;

console.log('contrast-check: WCAG 2.2 AA token pairings');
for (const [fg, bg, minimum, usage] of REQUIRED) {
  const fgHex = tokens[fg];
  const bgHex = tokens[bg];
  if (!fgHex || !bgHex) {
    console.error(`contrast-check: token not found in tokens.css: --${fg} or --${bg}`);
    process.exit(1);
  }
  const ratio = contrast(fgHex, bgHex);
  const pass = ratio >= minimum;
  if (!pass) failed += 1;
  console.log(
    `  ${pass ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(5)}:1 (min ${minimum}) --${fg} on --${bg} — ${usage}`,
  );
}

console.log('  -- decorative, reported only --');
for (const [fg, bg, usage] of INFORMATIONAL) {
  const ratio = contrast(tokens[fg], tokens[bg]);
  console.log(`  info ${ratio.toFixed(2).padStart(5)}:1           --${fg} on --${bg} — ${usage}`);
}

if (failed > 0) {
  console.error(
    `contrast-check: FAILED — ${failed} pairing(s) below the AA minimum. Fix the token or the usage — never this threshold.`,
  );
  process.exit(1);
}

console.log(`contrast-check: OK — ${REQUIRED.length} enforced pairing(s) pass.`);
