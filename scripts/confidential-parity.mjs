/**
 * Confidential-content parity gate — Ruling 4, and constitution rule 7:
 * "OPS360 content never exceeds CV wording."
 *
 * A rule kept by intention decays. This one is kept by a gate: every bullet
 * rendered inside a card marked CONFIDENTIAL on /experience must also appear,
 * word for word, on /cv. If a future edit enriches that card with one extra
 * detail — a client name, a system name, a figure the CV does not carry — the
 * build fails and names the sentence.
 *
 * It compares BUILT HTML rather than source, for the same reason the copy gate
 * does: what shipped is the only thing a reader sees, and the check should not
 * be able to pass while the page says something else.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPERIENCE = resolve('dist/experience/index.html');
const CV = resolve('dist/cv/index.html');

for (const [label, path] of [
  ['experience', EXPERIENCE],
  ['cv', CV],
]) {
  if (!existsSync(path)) {
    console.error(`confidential-parity: ${label} page not built — run \`npm run build\` first.`);
    process.exit(1);
  }
}

/** Strip tags and normalise entities and whitespace so two renderings compare fairly. */
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const experienceHtml = readFileSync(EXPERIENCE, 'utf8');
const cvText = textOf(readFileSync(CV, 'utf8'));

/**
 * Pull out every experience card that renders the confidential treatment, then
 * take its bullet list. The marker is the badge the component emits, which is
 * the same thing a reader sees — so the gate and the reader agree on which
 * cards are covered.
 */
const cards = experienceHtml.split(/<article[^>]*class="[^"]*experience-card/i).slice(1);
const confidentialBullets = [];

for (const card of cards) {
  if (!/CONFIDENTIAL/.test(card)) continue;
  const list = card.match(/<ul[^>]*class="[^"]*bullets[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
  if (!list) continue;
  for (const item of list[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = textOf(item[1]);
    if (text) confidentialBullets.push(text);
  }
}

if (confidentialBullets.length === 0) {
  console.error(
    'confidential-parity: found no bullets inside a CONFIDENTIAL experience card on /experience.\n' +
      'Either the confidential treatment stopped rendering, or the markup changed and this gate ' +
      'is now checking nothing — which is worse than failing. Fix the selector.',
  );
  process.exit(1);
}

const exceeded = confidentialBullets.filter((bullet) => !cvText.includes(bullet));

if (exceeded.length > 0) {
  console.error(
    `confidential-parity: FAILED — ${exceeded.length} statement(s) on /experience are not present verbatim on /cv:`,
  );
  for (const bullet of exceeded) console.error(`  ✗ ${bullet.slice(0, 120)}…`);
  console.error(
    'Ruling 4: confidential client work is described at CV level and never beyond it. Either ' +
      'reword to match the CV exactly, or change the CV first if the CV itself is wrong.',
  );
  process.exit(1);
}

console.log(
  `confidential-parity: OK — ${confidentialBullets.length} confidential statement(s) match /cv verbatim.`,
);
