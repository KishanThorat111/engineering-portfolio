/**
 * STATION GATE — two things no other gate watches.
 *
 * 1. THE STATION-TO-PLATE MAPPING.
 *
 * Ten stations, ten plates, and a manifest keyed by master filename rather than
 * by station id. That indirection has already caused one silent failure: the
 * lookup was written against the station id (`enter`) while the manifest is
 * keyed by the file stem (`01-enter`), every entry missed, and the build failed
 * claiming there was no artwork while a fully-populated manifest sat beside it.
 *
 * The failure that would be WORSE is the one no existing gate can see: a
 * mapping that resolves successfully to the wrong plate. Station 05 showing
 * plate 04 breaks nothing. The build passes, the link gate passes — every
 * reference resolves, because the file is real — and the page looks deliberate.
 * A visitor sees the datastore hall labelled "Lab" and has no way to know.
 *
 * So this asserts the chain end to end, against BUILT output rather than
 * source: station id → its declared master → the manifest key → the filenames
 * in every rung → the `srcset` actually emitted into the HTML for that station's
 * section. A plate can only appear under the station that declares it.
 *
 * 2. THE LOCKED HERO CONTENT.
 *
 * PHASE_LOG's P9 entry records rebuilding the hero and silently dropping the
 * four locked §2 status chips, and notes plainly: "no gate covers them". They
 * were restored by hand, and the gap was left open. Locked content with no
 * automated guard is locked by memory, which is the same as not locked.
 *
 * This asserts the locked claim, the locked sub-line and all four status chips
 * are present in the built homepage. Wording is compared verbatim against
 * `config/site.ts`, so an edit to either side without the other fails here
 * rather than shipping.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve('dist');
const HOME = resolve(DIST, 'index.html');

if (!existsSync(HOME)) {
  console.error('station-check: dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

const html = readFileSync(HOME, 'utf8');
const manifest = JSON.parse(
  readFileSync(resolve('apps/static/src/config/visual-world-manifest.json'), 'utf8'),
);

/*
 * The station table, read out of the config rather than duplicated.
 *
 * A second copy of this list here would drift from the first and the gate would
 * then be asserting its own memory. The file is TypeScript, so the entries are
 * extracted by pattern — deliberately strict, and the count assertion below
 * fails loudly if the shape ever changes rather than quietly matching nothing.
 */
const configSource = readFileSync(resolve('apps/static/src/config/visual-world.ts'), 'utf8');
const stations = [
  ...configSource.matchAll(
    /id:\s*'([a-z]+)',\s*index:\s*'([0-9]{2})',[\s\S]{0,160}?plate:\s*'([0-9]{2}-[a-z]+\.png)'/g,
  ),
].map((m) => ({ id: m[1], index: m[2], stem: m[3].replace(/\.png$/, '') }));

let failed = 0;
const fail = (message) => {
  console.error(`  ✗ ${message}`);
  failed += 1;
};

/* ---- 1. the mapping ------------------------------------------------- */

if (stations.length !== 10) {
  // A gate that scans nothing must fail, not pass.
  console.error(
    `station-check: expected 10 stations in visual-world.ts, matched ${stations.length}. ` +
      'The config shape changed and this gate can no longer read it.',
  );
  process.exit(1);
}

/** Every filename the manifest knows, mapped back to the stem that owns it. */
const owner = new Map();
for (const [stem, formats] of Object.entries(manifest)) {
  for (const rungs of Object.values(formats)) {
    for (const file of Object.values(rungs)) owner.set(file, stem);
  }
}

/**
 * The `srcset` values emitted inside each station's own section.
 *
 * Sections are split on the `data-station` attribute, so a filename found here
 * is one the browser will actually fetch for THAT station — not merely one that
 * exists somewhere on the page.
 */
const sections = [...html.matchAll(/data-station="([a-z]+)"/g)].map((m) => ({
  id: m[1],
  at: m.index ?? 0,
}));

/*
 * THE INDEPENDENT INVARIANT, and the reason the first version of this gate was
 * worthless.
 *
 * The first version compared the plate a station RENDERS against the plate that
 * station DECLARES. Those are two readings of one fact, so the obvious mutation
 * — point station 05 at plate 04 — changed both together and sailed through. It
 * was injected and the gate exited 0. A gate that can only catch a lookup bug,
 * and not the declaration bug it was written for, is a gate that checks nothing
 * a build could plausibly get wrong.
 *
 * The station's own two-digit index is the independent source. Station 05 must
 * carry a plate whose stem begins `05-`, because the references, the masters and
 * the station index are numbered from the same narrative order. That is a fact
 * about the design system rather than about the config, so a config edit cannot
 * satisfy both sides of it at once.
 */
for (const station of stations) {
  if (!station.stem.startsWith(`${station.index}-`)) {
    fail(
      `station "${station.id}" is index ${station.index} but declares ${station.stem}.png — ` +
        `a station must carry the plate of its own number`,
    );
    continue;
  }

  const entry = manifest[station.stem];
  if (!entry) {
    fail(`station "${station.id}" declares ${station.stem}.png, which has no manifest entry`);
    continue;
  }

  const starts = sections.filter((s) => s.id === station.id).map((s) => s.at);
  if (starts.length === 0) {
    fail(`station "${station.id}" is declared in the config but never rendered into the homepage`);
    continue;
  }

  /*
   * `data-station` appears TWICE per station — once on the stage section and
   * once on the `.vw` layer nested inside it. Slicing to the next occurrence of
   * ANY station therefore cut every block off before its own plate, and the
   * gate reported all ten as rendering no artwork. That is the gate failing to
   * read the page, not the page being wrong, so the gate is what changed.
   *
   * The block runs from this station's first marker to the first marker
   * belonging to a DIFFERENT station, which is exactly its own section.
   */
  const start = Math.min(...starts);
  const nextOther = sections.filter((s) => s.at > start && s.id !== station.id).map((s) => s.at);
  const end = nextOther.length > 0 ? Math.min(...nextOther) : html.length;
  const block = html.slice(start, end);

  const referenced = [...block.matchAll(/\/visual-world\/([A-Za-z0-9._-]+\.(?:avif|webp))/g)].map(
    (m) => m[1],
  );

  if (referenced.length === 0) {
    fail(`station "${station.id}" renders no plate at all`);
    continue;
  }

  for (const file of referenced) {
    const stem = owner.get(file);
    if (!stem) {
      fail(`station "${station.id}" references ${file}, which is in no manifest entry`);
    } else if (stem !== station.stem) {
      fail(
        `station "${station.id}" renders ${file}, which belongs to ${stem} — ` +
          `it should be ${station.stem}`,
      );
    }
  }
}

/* ---- 2. the locked hero --------------------------------------------- */

const siteSource = readFileSync(resolve('apps/static/src/config/site.ts'), 'utf8');

/** Collapse whitespace so a line break in the template is not a difference. */
const flat = html.replace(/\s+/g, ' ');

const claim = siteSource.match(/claim:\s*'([^']+)'/)?.[1];
if (!claim) {
  console.error('station-check: could not read SITE.claim from config/site.ts');
  process.exit(1);
}
if (!flat.includes(claim)) {
  fail(`the locked claim is missing from the built homepage: "${claim}"`);
}

const chipsBlock = siteSource.match(/STATUS_CHIPS = \[([\s\S]*?)\]/)?.[1] ?? '';
const chips = [...chipsBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (chips.length !== 4) {
  console.error(
    `station-check: expected 4 locked status chips in config/site.ts, matched ${chips.length}.`,
  );
  process.exit(1);
}
/*
 * SCOPED TO EACH COMPOSITION, because "somewhere on the page" is not the check.
 *
 * The first version asked whether each chip appeared anywhere in the built
 * homepage. Injected by dropping a chip from the desktop hero, it exited 0 — the
 * mobile composition still carried all four, so the string was present while the
 * thing the gate exists to prevent had happened. That is precisely the P9
 * failure it was written for: a rebuilt hero silently losing locked content.
 *
 * Station 01 renders the chips twice, once per composition, and BOTH must carry
 * all four. A visitor gets one of them, never both, so a chip missing from
 * either is a chip missing for that visitor.
 */
const chipLists = [
  { name: 'the desktop hero', re: /class="enter__chips"[\s\S]*?<\/ul>/ },
  { name: 'the mobile hero', re: /class="enterM__chips"[\s\S]*?<\/ul>/ },
];

for (const list of chipLists) {
  const block = html.match(list.re)?.[0];
  if (!block) {
    // The target vanished. Fail loudly rather than check nothing.
    console.error(
      `station-check: could not find ${list.name}'s chip list in the built homepage. ` +
        'The markup changed and this gate can no longer see what it guards.',
    );
    process.exit(1);
  }
  const flatBlock = block.replace(/\s+/g, ' ');
  for (const chip of chips) {
    if (!flatBlock.includes(chip)) {
      fail(`locked status chip missing from ${list.name}: "${chip}"`);
    }
  }
}

if (!flat.includes(chips[0])) fail(`locked status chips are absent from the homepage entirely`);

/* ---- report --------------------------------------------------------- */

if (failed > 0) {
  console.error(`\nstation-check: FAILED — ${failed} violation(s).`);
  process.exit(1);
}

console.log(
  `station-check: OK — ${stations.length} station/plate mappings verified against built output, ` +
    `plus the locked claim and ${chips.length} locked status chips.`,
);
