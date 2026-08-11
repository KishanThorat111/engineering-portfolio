/**
 * P7 — the fast lane and the machine layer, verified.
 *
 * The static surface and the live surface now sit on one origin, and the risk
 * this phase introduces is the one rule 10 exists to catch: two surfaces
 * telling a reader different things. These checks read the BUILT artifact and
 * assert the reconciliation is real rather than merely present.
 *
 * Runs offline over `dist/` with no browser, so it is cheap enough to belong in
 * CI beside the other truth gates — unlike the render harness, which needs a
 * GPU and stays local.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST = resolve('dist');
const failures = [];
const checks = [];

function check(name, condition, detail) {
  checks.push(name);
  if (!condition) failures.push(`${name} — ${detail}`);
}

const read = (path) => readFileSync(join(DIST, path), 'utf8');

/* --- 1. The live surface is reachable from the site ------------------ */

const home = read('index.html');
check(
  'the home page links to the live surface',
  home.includes('href="/live/"'),
  'nothing on the static surface pointed at /live/, which would make the most unusual ' +
    'thing here the least discoverable',
);

/* --- 2. The machine layer describes it ------------------------------- */

const profile = JSON.parse(read('api/profile.json'));

check(
  'profile.json carries the demonstration block',
  profile.demonstration && typeof profile.demonstration.url === 'string',
  'an agent reading this site would not know the demonstration exists',
);

check(
  'the demonstration is labelled a demo (rule 11)',
  profile.demonstration?.plane === 'demo' &&
    /demonstration plane/i.test(profile.demonstration?.disclosure ?? ''),
  'the machine layer must say what plane this is, unprompted',
);

check(
  'the machine layer warns against reporting the demo as production',
  /must not be reported as one/i.test(profile.demonstration?.disclosure ?? ''),
  'a summariser could otherwise fold the demo into the three production platforms',
);

/*
 * The demonstration must NOT appear in `systems`.
 *
 * That array is the three production platforms, and a screener quoting it is
 * quoting the CV's claims. Adding a demo to it would inflate the count of
 * systems this engineer operates, which is the precise kind of drift rule 4
 * forbids.
 */
check(
  'the demo is not counted among the production systems',
  Array.isArray(profile.systems) &&
    profile.systems.length === 3 &&
    !profile.systems.some((system) => /demo/i.test(system.name)),
  `systems[] should hold exactly the three production platforms, found ${profile.systems?.length}`,
);

/* --- 3. llms.txt gives an agent a way to verify rather than quote ---- */

const llms = read('llms.txt');
check(
  'llms.txt points an agent at the demonstration catalogue',
  llms.includes('/v1/demonstrations'),
  'the catalogue is how a machine checks the claims instead of trusting them',
);
check(
  'llms.txt carries the demo caution',
  /DEMO/.test(llms) && /physically separate/i.test(llms),
  'an agent summarising this site must not present the demo as production',
);

/* --- 4. The live surface is not competing for search ----------------- */

const live = read('live/index.html');
check(
  'the live surface is noindex',
  /<meta name="robots" content="noindex/i.test(live),
  'two canonical copies of the same claims would compete for the same queries',
);

const sitemap = read('sitemap-0.xml');
check(
  'the live surface is absent from the sitemap',
  !sitemap.includes('/live/'),
  'a noindex page in the sitemap is a contradictory instruction',
);

/* --- 5. No-JS and low-power both lead somewhere real ----------------- */

check(
  'the live surface degrades to a real destination without JavaScript',
  /<noscript>/.test(live) && /href="\/"/.test(live),
  'a noscript that says nothing useful is not a fallback',
);

/*
 * The static surface is the low-power path, and it has to actually be low
 * power. This is the budget §11 says must never regress, measured on the
 * built artifact rather than assumed.
 */
const scripts = [...home.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map((m) => m[1]);
check(
  'the static home page loads no bundled JavaScript',
  scripts.length === 0,
  `found ${scripts.length}: ${scripts.join(', ')}`,
);

/* --- 6. Every route the machine layer promises actually exists ------- */

/*
 * Own-origin links only. LinkedIn and GitHub are promised to machines too, but
 * they are somebody else's to serve — asserting they exist in `dist` would be
 * checking the wrong thing, and their reachability is a quarterly maintenance
 * concern rather than a build one (the link gate makes the same split).
 */
const ownOrigin = new URL(profile.links.website).origin;

for (const [name, url] of Object.entries(profile.links ?? {})) {
  if (typeof url !== 'string' || !url.startsWith('http')) continue;
  if (new URL(url).origin !== ownOrigin) continue;
  const path = new URL(url).pathname.replace(/^\/|\/$/g, '');
  const candidates = [
    join(DIST, path || 'index.html'),
    join(DIST, path, 'index.html'),
    join(DIST, `${path}.html`),
  ];
  check(
    `links.${name} resolves to a built file`,
    candidates.some((candidate) => existsSync(candidate)),
    `${url} was promised to machines and is not in the build`,
  );
}

/*
 * The demonstration URL is a page; the catalogue is served by the control
 * plane, not by the static build, so only the page is checked here. Saying so
 * explicitly rather than silently skipping it.
 */
check(
  'the demonstration URL resolves to a built page',
  existsSync(join(DIST, 'live', 'index.html')),
  'profile.json promises /live/ and the build does not contain it',
);

/* --------------------------------------------------------------------- */

if (failures.length > 0) {
  console.error(`fastlane-check: FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error(
    'The two surfaces must agree and must both be reachable. Fix the source they share; ' +
      'do not patch one side.',
  );
  process.exit(1);
}

console.log(`fastlane-check: OK — ${checks.length} check(s) across both surfaces.`);
