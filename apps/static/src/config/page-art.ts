/**
 * WHICH ARTWORK EACH PAGE BEYOND THE HOME PAGE MAY SHOW. ONE PLACE.
 *
 * Until October 2026 the ten plates belonged to `/` alone. That was the
 * owner's ruling of S3, after the whole image world had leaked onto every
 * route through files every page shares — not by anyone's choice. On 3 Oct
 * 2026 the owner asked for the opposite on purpose: "why dont you use those
 * images in those other pages also … the relative one and also best suited"
 * (docs/PHASE_LOG.md, S11).
 *
 * So the rule moves to where the data now puts it. A page may show a plate
 * only if it is declared against that page here; `PlateImage` refuses to
 * build an undeclared one, and station-check fails the build if any page
 * references a plate it does not declare, or declares one it does not show.
 * An accidental leak — through the layout, a shared component, anything —
 * lands on an undeclared page or brings an undeclared plate, and fails.
 *
 * What still never leaves `/`: the station stage, the plate layer, the rail,
 * the stations stylesheet and the world's scripts. A plate here is a picture
 * on a page, not the world.
 *
 * Keys are routes without slashes at either end; `404` is the not-found page.
 * The first plate is the page's opening; the rest appear further down.
 */
import type { StationId } from './visual-world';

/** The `sizes` PageHero gives its scene, shared so the preload asks for the same file. */
export const HERO_SIZES = '(min-width: 900px) 68vw, 70vw';

export const PAGE_ART: Readonly<Record<string, readonly StationId[]>> = {
  systems: ['systems'],
  'systems/hospital-operations': ['dissection', 'systems'],
  'systems/menu-platform': ['data', 'systems'],
  'systems/electrical-platform': ['proof', 'systems'],
  experience: ['live', 'end'],
  engineering: ['think', 'lab'],
  about: ['build', 'think'],
  cv: ['enter'],
  '404': ['end'],
};

/** The key a built route is declared under. */
export function routeKey(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
}

/** Throws unless `id` is declared for this route — the build-time half of the rule. */
export function assertDeclared(pathname: string, id: StationId): void {
  const key = routeKey(pathname);
  if (!(PAGE_ART[key] ?? []).includes(id)) {
    throw new Error(
      `PlateImage: plate "${id}" is not declared for "/${key}" in config/page-art.ts. ` +
        'Declare it there (an owner decision, logged) rather than placing artwork ad hoc.',
    );
  }
}
