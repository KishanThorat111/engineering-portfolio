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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

/*
 * THE VISIBLE HERO MUST REJOIN TO THE LOCKED SENTENCE.
 *
 * `copy-check` used to assert this for the experience surface, where the hero
 * was split into display lines. That surface has been reverted to its
 * pre-world design and no longer splits anything, so that block went with it —
 * but the splitting did not disappear, it MOVED HERE. The home hero renders the
 * claim as four `<span>`s for the reference composition.
 *
 * The check above does not cover it. Station 01 also carries the whole sentence
 * in a visually-hidden paragraph for screen readers, so `flat.includes(claim)`
 * passes even if the visible lines say something else entirely — which is the
 * precise failure the original check was written after: reference 01's hero was
 * once line-broken as "I design, / I build, / and I operate", quietly adding two
 * pronouns to a sentence blueprint §1 locks.
 *
 * So the guard follows the risk. The visible `<h1>` is stripped of markup,
 * whitespace-collapsed, and must BE the locked sentence.
 */
const heroMatch = html.match(/<h1[^>]*id="claim"[^>]*>([\s\S]*?)<\/h1>/);
if (!heroMatch) {
  console.error(
    'station-check: could not find the home hero (h1#claim) in the built output. ' +
      'The markup changed and this gate can no longer see the sentence it guards.',
  );
  process.exit(1);
}
const heroText = heroMatch[1]
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
if (heroText !== claim) {
  fail(
    `the visible home hero does not rejoin to the locked claim.
` +
      `    locked:   ${claim}
` +
      `    rendered: ${heroText}`,
  );
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

/* ---- 3. the world does not leak past the home page ------------------ */

/*
 * THE GATE THIS REPOSITORY MOST NEEDED AND DID NOT HAVE.
 *
 * The ten-station world was commissioned for `/`. It shipped on every route,
 * because it was wired into `BaseLayout` — the rail replaced the site header
 * site-wide, `stations.css` was imported in shared frontmatter, and the parallax
 * and liveness scripts ran on the CV. Nothing failed. Every gate stayed green
 * for five weeks while the whole site quietly wore a design meant for one page.
 *
 * No existing gate could have caught it, because every one of them asks whether
 * what shipped is TRUE. None of them asked where it shipped. This one does.
 *
 * It scans every built HTML page that is not the home page and fails on any
 * trace of the world: the station rail, the plate layer, the stage shell, or
 * the world's material tokens in that page's stylesheets. Scoping a check to
 * the route that owns a design is not loosening it — the design is still fully
 * asserted on `/` by the two sections above, and it is now asserted to be
 * ABSENT everywhere else, which is strictly more than was checked before.
 */
const WORLD_MARKERS = [
  { re: /class="[^"]*station-nav/, what: 'the station rail' },
  { re: /class="[^"]*vw/, what: 'the plate layer (.vw)' },
  { re: /class="[^"]*stage/, what: 'the station stage shell' },
  { re: /\/visual-world\//, what: 'a visual-world plate reference' },
];

/** Every built page, so a route added later is covered without an edit here. */
function htmlPages(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlPages(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const pages = htmlPages(DIST);
if (pages.length < 5) {
  console.error(`station-check: only ${pages.length} built page(s) found — dist looks wrong.`);
  process.exit(1);
}

/*
 * `/live/` IS A DIFFERENT APPLICATION AND IS SCOPED OUT OF THIS SCAN.
 *
 * The scan below exists to keep the home page's IMAGE world off the static
 * pages. `/live/` is not a static page: it is the experience app, a React and
 * Three.js surface that renders its own ten-station world in WebGL, and it is
 * SUPPOSED to be a world. Asserting it is free of one would assert the opposite
 * of what it is for.
 *
 * Today the exclusion changes nothing — the 3D world renders client-side, so
 * its shells contain none of the markers below and would pass by accident.
 * Passing by accident is not being correct, and a gate that happens to pass for
 * a reason unrelated to its subject is the failure mode engineering principle 6
 * warns about. If a scene ever server-rendered a matching class name, this gate
 * would have failed a legitimate design.
 *
 * So the exclusion is explicit, and the assertions after the scan cover `/live/`
 * on its own terms instead.
 */
const LIVE_PREFIX = resolve(DIST, 'live');
const isLiveSurface = (page) => page.startsWith(LIVE_PREFIX);

/** Stylesheets a given page actually links, so the check follows the bundle. */
function sheetsFor(page, source) {
  return [...source.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)]
    .map((m) => resolve(DIST, m[1].replace(/^\//, '')))
    .filter((f) => existsSync(f));
}

let scanned = 0;
for (const page of pages) {
  if (page === HOME || isLiveSurface(page)) continue;
  const source = readFileSync(page, 'utf8');
  const rel = page
    .slice(DIST.length + 1)
    .split(String.fromCharCode(92))
    .join('/');
  scanned += 1;

  for (const marker of WORLD_MARKERS) {
    if (marker.re.test(source)) fail(`${rel} carries ${marker.what} — the world belongs to / only`);
  }

  /*
   * The stylesheet matters as much as the markup. Importing `StationNav` into
   * the shared layout was enough to put 26 of its scoped rules into the sheet
   * every route downloads, with no visible rail anywhere to show for it — a
   * leak that a markup-only check would have declared clean.
   */
  for (const sheet of sheetsFor(page, source)) {
    const css = readFileSync(sheet, 'utf8');
    for (const token of ['--plate-scrim', '--plate-edge', 'station-nav']) {
      if (css.includes(token)) {
        fail(`${rel} loads ${sheet.slice(DIST.length + 1)}, which carries "${token}"`);
      }
    }
  }
}

/* ---- 4. the two surfaces do not borrow each other's weight ---------- */

/*
 * THE 3D BUNDLE BELONGS TO `/live/` AND NOWHERE ELSE.
 *
 * The home page is the fast lane. Its whole job is to be light: plates, real
 * HTML, and a few hundred bytes of inline script. `/live/` carries React, Three
 * and the station world — roughly 367KB gzipped. One `<script>` or one preload
 * hint pointing at that bundle from a static page would quietly move the entire
 * weight of the 3D world onto a page whose budget was written assuming it was
 * not there, and nothing else here would notice: the page would still be true,
 * still accessible, still pass every other gate, and still be slow.
 *
 * So no static page may reference `/live/assets/`. A LINK to `/live/` is
 * expected and checked for below — a link costs nothing until it is followed,
 * which is the entire point of putting the world behind one.
 */
for (const page of pages) {
  if (isLiveSurface(page)) continue;
  const source = readFileSync(page, 'utf8');
  const rel = page
    .slice(DIST.length + 1)
    .split(String.fromCharCode(92))
    .join('/');
  for (const m of source.matchAll(/["'(]([^"'()]*\/live\/assets\/[^"'()]+)["')]/g)) {
    fail(`${rel} references the 3D bundle (${m[1]}) — that weight belongs to /live/ alone`);
  }
}

/*
 * And the reverse: `/live/` must actually be shipping the world. A gate that
 * keeps the bundle off the static pages, while the bundle quietly stops being
 * built at all, has proven nothing.
 */
const liveShell = resolve(DIST, 'live', 'index.html');
if (!existsSync(liveShell)) {
  console.error(
    'station-check: dist/live/index.html is missing — the experience app did not build.',
  );
  process.exit(1);
}
if (!/\/live\/assets\/[^"']+\.js/.test(readFileSync(liveShell, 'utf8'))) {
  fail('dist/live/index.html loads no bundle — the 3D world is not being shipped');
}

/*
 * THE ROUTE INTO THE WORLD.
 *
 * The 3D world is the most unusual thing this site has and it is one click off
 * the home page. That click is the whole structure: a fast home page, and a
 * heavy world behind a button. If the button is lost in a redesign the world
 * becomes unreachable to anyone who does not know the URL, and nothing would
 * fail — the site would simply get quieter. Cheap to assert, expensive to lose.
 */
if (!/href="\/live\/"/.test(html)) {
  fail('the home page has no link to /live/ — the world would be unreachable');
}

/* ---- report --------------------------------------------------------- */

if (failed > 0) {
  console.error(`\nstation-check: FAILED — ${failed} violation(s).`);
  process.exit(1);
}

console.log(
  `station-check: OK — ${stations.length} station/plate mappings verified against built output, ` +
    `the locked claim and ${chips.length} locked status chips, ` +
    `${scanned} static page(s) free of the world, ` +
    `the 3D bundle confined to /live/, and the route into it intact.`,
);
