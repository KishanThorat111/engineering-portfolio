/**
 * THE VISUAL WORLD — one configuration source for the ten environmental plates.
 *
 * The plates are the cinematic background artwork. They are NOT the interface:
 * every word, card, panel, control and label on this site is real HTML built
 * from repository content, and a plate is never responsible for readable
 * content. If a plate fails to load, the page must still be complete.
 *
 * ONE PLACE TO SWITCH TO R2/CDN
 * `PLATE_BASE` is the only string that knows where the images live. Moving the
 * plates to Cloudflare R2 is one edit here — set `PUBLIC_VISUAL_WORLD_BASE` in
 * the environment and every station follows. Ten hardcoded remote URLs
 * scattered through templates is exactly what this exists to prevent.
 *
 * ASSET STATUS, STATED PLAINLY
 * As of 25 Aug 2026 `apps/static/public/visual-world/` is EMPTY — the ten
 * plates have not been added to the repository. The background system is built,
 * wired, and degrades to the graphite ground with its atmospheric gradients
 * intact, which is also the correct behaviour on a slow connection or a failed
 * request. Dropping the ten files in at the paths below switches every station
 * on with no further code change.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Where the plates are served from.
 *
 * Defaults to the local public directory. Set `PUBLIC_VISUAL_WORLD_BASE` to an
 * R2/CDN origin (no trailing slash) to serve them from there instead.
 */
export const PLATE_BASE: string =
  import.meta.env['PUBLIC_VISUAL_WORLD_BASE']?.replace(/\/$/, '') ?? '/visual-world';

export type StationId =
  | 'enter'
  | 'systems'
  | 'dissection'
  | 'data'
  | 'lab'
  | 'live'
  | 'think'
  | 'build'
  | 'proof'
  | 'end';

export type Station = {
  id: StationId;
  /** Two-digit index, as the references number them. */
  index: string;
  /** Nav label. */
  label: string;
  /** Plate filename, without the base. */
  plate: string;
  /**
   * Where this station lives on the public site.
   *
   * The static site is a set of real pages, not a scroll hijack — so a station
   * maps to a route or to a section anchor on the homepage. This keeps every
   * station deep-linkable and keyboard-reachable without JavaScript.
   */
  href: string;
  /**
   * Alt text is deliberately EMPTY for every plate: they are decorative
   * environmental artwork and the page states everything they illustrate in
   * real text. A described background is noise to a screen reader.
   */
  decorative: true;
};

export const STATIONS: readonly Station[] = [
  { id: 'enter', index: '01', label: 'Enter', plate: '01-enter.png', href: '/', decorative: true },
  {
    id: 'systems',
    index: '02',
    label: 'Systems',
    plate: '02-systems.png',
    href: '/systems',
    decorative: true,
  },
  {
    id: 'dissection',
    index: '03',
    label: 'Dissection',
    plate: '03-dissection.png',
    href: '/systems#dissection',
    decorative: true,
  },
  {
    id: 'data',
    index: '04',
    label: 'Data',
    plate: '04-data.png',
    href: '/engineering#data',
    decorative: true,
  },
  {
    id: 'lab',
    index: '05',
    label: 'Lab',
    plate: '05-lab.png',
    href: '/engineering#lab',
    decorative: true,
  },
  {
    id: 'live',
    index: '06',
    label: 'Live',
    plate: '06-live.png',
    href: '/live/',
    decorative: true,
  },
  {
    id: 'think',
    index: '07',
    label: 'Think',
    plate: '07-think.png',
    href: '/about',
    decorative: true,
  },
  {
    id: 'build',
    index: '08',
    label: 'Build',
    plate: '08-build.png',
    href: '/about#contact',
    decorative: true,
  },
  {
    id: 'proof',
    index: '09',
    label: 'Proof',
    plate: '09-proof.png',
    href: '/engineering',
    decorative: true,
  },
  { id: 'end', index: '10', label: 'End', plate: '10-end.png', href: '/cv', decorative: true },
];

const BY_ID = new Map(STATIONS.map((s) => [s.id, s]));

export function station(id: StationId): Station {
  const found = BY_ID.get(id);
  /*
   * Throws rather than falling back. A station id that does not exist is a
   * template defect, and silently rendering the wrong background hides it.
   */
  if (!found) throw new Error(`Unknown station: ${id}`);
  return found;
}

/** Absolute URL for a station's plate, honouring the configured base. */
export function plateUrl(id: StationId): string {
  return `${PLATE_BASE}/${station(id).plate}`;
}

/**
 * Whether a plate actually exists, resolved AT BUILD TIME.
 *
 * The link gate caught the first version of this emitting
 * /visual-world/01-enter.png for a file that is not in the repository — a real
 * broken reference, correctly failed. Weakening the gate was never an option;
 * the fix is that a station does not reference artwork it does not have.
 *
 * The check only applies to LOCALLY served plates. When PLATE_BASE points at
 * R2 or a CDN there is no local file to stat and the configuration is trusted,
 * because a build machine cannot meaningfully probe a bucket and a false
 * negative there would silently blank every background in production.
 */
const LOCAL_BASE = '/visual-world';

/*
 * A STATIC ESM IMPORT, not a require() shim.
 *
 * The first version reached for `require('node:fs')` inside a try/catch. Astro
 * builds as ESM, `require` is not defined there, the catch swallowed the
 * ReferenceError, and every plate silently reported missing — the backgrounds
 * were absent from a build that had all ten files sitting on disk. A swallowed
 * error that degrades to "no artwork" is the worst shape this could take,
 * because the page still looks deliberate and nothing says anything is wrong.
 *
 * This module is imported only from .astro frontmatter, which runs on the
 * build server, so a node built-in is legitimate here and never reaches a
 * client bundle.
 */
export function plateExists(id: StationId): boolean {
  if (PLATE_BASE !== LOCAL_BASE) return true;

  /*
   * Resolved from the WORKING DIRECTORY, not from import.meta.url.
   *
   * Second failure of this same check, and worth recording: `new URL('../../',
   * import.meta.url)` resolves against the BUNDLED module's location during an
   * Astro build, not the source file's, so it walked out of a directory that
   * does not exist at build time and reported every plate missing while all
   * ten sat on disk. Both candidates below are tried because the build runs
   * from the workspace package in CI and can be invoked from the repo root
   * locally.
   */
  const file = station(id).plate;
  return CANDIDATE_ROOTS.some((root) => existsSync(join(root, file)));
}

const CANDIDATE_ROOTS = [
  join(process.cwd(), 'public', 'visual-world'),
  join(process.cwd(), 'apps', 'static', 'public', 'visual-world'),
];

/**
 * The station a visitor is most likely to reach next.
 *
 * Used to preload exactly one plate ahead rather than all ten. Ten
 * multi-megabyte images on first paint would be the single largest thing on
 * this site and would blow the 90KB page-weight budget's spirit even though
 * images are excluded from its letter.
 */
export function nextStation(id: StationId): Station | null {
  const index = STATIONS.findIndex((s) => s.id === id);
  return index >= 0 && index < STATIONS.length - 1 ? (STATIONS[index + 1] ?? null) : null;
}
