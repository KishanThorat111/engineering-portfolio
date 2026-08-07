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

/** Pull `--name: #rrggbb;` declarations out of the token file. */
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
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
  ['text', 'bg', 4.5, 'body text on the page background'],
  ['text', 'bg-raised', 4.5, 'body text on cards and chips'],
  ['text-muted', 'bg', 4.5, 'muted prose and captions'],
  ['text-muted', 'bg-raised', 4.5, 'chip qualifiers, stack tags, card meta'],
  ['accent', 'bg', 4.5, 'links and the LIVE status glyph'],
  ['accent', 'bg-raised', 4.5, 'accents inside cards'],
  ['accent-warm', 'bg', 4.5, 'PRE-LAUNCH glyph and caution notes'],
  ['accent-warm', 'bg-raised', 4.5, 'the AGED row label inside a decision card'],
  ['bg', 'accent', 4.5, 'dark label on a primary button'],
  ['accent-danger', 'bg', 3, 'the limitation rule, the only marker of that block'],
  ['accent', 'bg', 3, 'the focus ring'],
  ['text-muted', 'bg', 3, 'the secondary button boundary, which identifies it as a control'],
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
 * consequence for low-vision readers, it is not mine to fix by changing a
 * locked token, and it is logged for the Phase 8 manual accessibility pass.
 * Anything that must be *perceived* belongs in REQUIRED above, not here.
 */
const INFORMATIONAL = [
  ['border', 'bg', 'decorative card and chip edges'],
  ['bg-raised', 'bg', 'the raised-surface shift behind cards'],
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
    `contrast-check: FAILED — ${failed} pairing(s) below the AA minimum. Tokens are fixed by blueprint §5, so fix the usage, not the value.`,
  );
  process.exit(1);
}

console.log(`contrast-check: OK — ${REQUIRED.length} enforced pairing(s) pass.`);
