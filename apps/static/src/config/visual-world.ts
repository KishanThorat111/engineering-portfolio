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
 * As of 30 Sep 2026 all ten plates are encoded and present in
 * `apps/static/public/visual-world/` as content-hashed AVIF + WebP, 4.65MB for
 * the set, named by `visual-world-manifest.json`. The 57MB of PNG masters they
 * were encoded from live in `visual-world-masters/` at the repository root,
 * outside the served directory, and are never deployed.
 *
 * The background system still degrades to the graphite ground with its
 * atmospheric gradients intact when a plate is slow or fails, which is the
 * correct behaviour on a bad connection and not only a missing-asset state.
 */

import manifest from './visual-world-manifest.json';
import previews from './visual-world-previews.json';

/**
 * Where the production plates are served from. ONE value, and the only string
 * in the codebase that knows where the artwork lives.
 *
 * Unset, it falls back to the local masters so `npm run dev` works with no
 * environment at all. In production it is the R2 custom domain, e.g.
 *
 *   PUBLIC_VISUAL_WORLD_BASE=https://assets.kishanthorat.com/visual-world
 *
 * Never an S3 endpoint and never a credentialled URL: these are public,
 * cacheable, immutable image reads.
 */
export const PLATE_BASE: string =
  import.meta.env['PUBLIC_VISUAL_WORLD_BASE']?.replace(/\/$/, '') ?? '/visual-world';

/** `{ avif: { "1280": "file.avif", ... }, webp: { ... } }`, keyed by master stem. */
type ManifestEntry = { avif?: Record<string, string>; webp?: Record<string, string> };
const MANIFEST = manifest as Record<string, ManifestEntry>;

/**
 * The manifest is keyed by MASTER FILE STEM (`01-enter`), not by station id
 * (`enter`) — the pipeline derives its keys from the filenames it encoded and
 * has no idea what a station is. Looking up by station id silently missed
 * every entry and failed the build with "no production artwork" while the
 * manifest sat there fully populated.
 */
function manifestKey(id: StationId): string {
  return station(id).plate.replace(/\.png$/, '');
}

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
  /**
   * The MASTER filename in visual-world-masters/. Source provenance only —
   * production URLs come from the content-hashed manifest, never from this.
   */
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

/**
 * Production URLs for a station's plate, in both formats.
 *
 * AVIF is primary and WebP is the fallback for Safari before 16.4 — chosen by
 * measurement, not preference: AVIF q65 beat every WebP candidate on mean
 * error, dark-region banding and edge preservation at roughly half the size.
 * See scripts/optimize-visual-world.mjs for the benchmark.
 *
 * Filenames are content-hashed, so every URL here is safe to serve immutable.
 *
 * With no manifest entry — during local development against the raw masters —
 * both fall back to the PNG, so the site works before the pipeline has run.
 */
export function plateSources(id: StationId): { avif: string; webp: string; width: number } {
  const entry = MANIFEST[manifestKey(id)];
  const avif = srcset(entry?.avif);
  const webp = srcset(entry?.webp);
  if (!avif || !webp) {
    /*
     * Unreachable through the component, which guards on plateExists() first.
     * Throwing rather than returning a PNG path keeps the failure loud: the
     * masters are no longer served, so a silent fallback would emit a URL that
     * 404s in production.
     */
    throw new Error(
      `No production artwork for station ${id}. Run: node scripts/optimize-visual-world.mjs`,
    );
  }
  return { avif, webp, width: widestWidth(entry?.avif) };
}

/**
 * A `srcset` string, ascending by width, for one format's rungs.
 *
 * The browser chooses from this before any script runs — which is the whole
 * reason the rungs exist. The previous version served one width through a
 * JavaScript loader that first had to probe AVIF support with a data: URI, and
 * the homepage's LCP was 3.4s against a 1.8s budget as a direct result.
 */
function srcset(rungs: Record<string, string> | undefined): string {
  if (!rungs) return '';
  const widths = Object.keys(rungs)
    .map(Number)
    .filter((w) => Number.isFinite(w))
    .sort((a, b) => a - b);
  if (widths.length === 0) return '';
  return widths.map((w) => `${PLATE_BASE}/${rungs[String(w)]} ${w}w`).join(', ');
}

/**
 * A plate's AVIF srcset without the rungs wider than `max` — for screens that
 * are themselves no wider than `max`. On a 1700px screen at 1.5× the full set
 * selects the 2528px file (222KB for plate 01); capped at 1920 it selects the
 * 1920px one (154KB), still 1.1 file pixels per CSS pixel of a full-bleed
 * frame. Measured: about a third less artwork for the whole home page.
 */
export function plateAvifUpTo(id: StationId, max: number): string {
  const rungs = MANIFEST[manifestKey(id)]?.avif ?? {};
  return srcset(Object.fromEntries(Object.entries(rungs).filter(([w]) => Number(w) <= max)));
}

/**
 * The key of the plate's instant preview (scripts/visual-world-previews.mjs):
 * set as `data-preview` on the plate's <img>, it selects a ~250-byte blurred
 * copy of the artwork from styles/plate-previews.css as the image's own
 * background, so a frame shows its scene before the artwork has arrived.
 */
export function platePreview(id: StationId): string | undefined {
  const key = manifestKey(id);
  return key in (previews as Record<string, unknown>) ? key : undefined;
}

/** The widest rung, used as the <img> intrinsic width so the ratio is known. */
function widestWidth(rungs: Record<string, string> | undefined): number {
  const widths = Object.keys(rungs ?? {})
    .map(Number)
    .filter(Number.isFinite);
  return widths.length > 0 ? Math.max(...widths) : PLATE_INTRINSIC_WIDTH;
}

/**
 * The plates' aspect ratio. Every master is 3:2, which is the ratio the design
 * references are composed at and the ratio the station stage holds. Declared so
 * the <img> reserves its box before a byte arrives and CLS stays at 0.
 */
export const PLATE_INTRINSIC_WIDTH = 2528;
export const PLATE_INTRINSIC_HEIGHT = 1685;

/**
 * The `sizes` hint. Every plate is full-bleed behind its station, so the
 * displayed width is the viewport width at every breakpoint — which is exactly
 * what `100vw` says, and saying it lets the browser pick a rung from the raw
 * HTML instead of waiting for layout.
 */
export const PLATE_SIZES = '100vw';

/**
 * Whether a station has production artwork.
 *
 * This used to stat the PNG master in `public/`. The masters have moved to
 * `visual-world-masters/` — outside the served directory, because Astro copies
 * `public/` verbatim and 57MB of source PNG was shipping in the deployed
 * payload. Existence is now a question about the MANIFEST, which is committed,
 * so it answers identically on a build machine that has never run sharp.
 *
 * It is deliberately NOT a filesystem check any more. The link gate caught the
 * first version of this emitting `/visual-world/01-enter.png` for a file that
 * was not in the repository — a real broken reference, correctly failed — and
 * the two `existsSync` attempts that followed both reported every plate missing
 * while all ten sat on disk, because they resolved against the wrong root. A
 * predicate that answers from a committed file cannot get the root wrong, and
 * it answers the same when PLATE_BASE points at R2, where there is no local
 * file to stat at all.
 *
 * A station with no manifest entry emits no plate at all, and the link gate
 * treats a missing reference as the defect it is.
 */
export function plateExists(id: StationId): boolean {
  const entry = MANIFEST[manifestKey(id)];
  return Boolean(srcset(entry?.avif) && srcset(entry?.webp));
}

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
