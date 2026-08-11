/**
 * Stations are real URLs.
 *
 * §2.9: "Every station is directly addressable by URL … Any moment must be
 * shareable as a link that opens there." That is a product requirement, not a
 * routing preference, and it rules out the easy option of a hash.
 *
 * Each station gets its own built HTML shell (see vite.config.ts), so
 * /live/payments/ is a real page a static host serves without any SPA
 * fallback, carries its own title and description, and can be linked to from
 * anywhere. The app reads which station it is from the path.
 */

export const STATIONS = ['isolation', 'payments', 'fraud', 'ai', 'limits'] as const;
export type Station = (typeof STATIONS)[number];
export type Route = { station: Station | null };

export function currentRoute(pathname: string = location.pathname): Route {
  const match = /\/live\/([a-z-]+)\/?$/.exec(pathname);
  const candidate = match?.[1];
  if (candidate && (STATIONS as readonly string[]).includes(candidate)) {
    return { station: candidate as Station };
  }
  return { station: null };
}

export function stationPath(station: Station | null): string {
  return station ? `/live/${station}/` : '/live/';
}

/**
 * Navigate without a reload, so the take stays continuous (§3.8).
 *
 * One canvas for the life of the page is the locked constraint; a real
 * navigation would tear down the WebGL context and read as a cut. pushState
 * changes the URL — which is what makes the station shareable — while the
 * scene keeps running.
 */
export function navigate(station: Station | null): void {
  const path = stationPath(station);
  if (location.pathname !== path) history.pushState({ station }, '', path);
  dispatchEvent(new PopStateEvent('popstate', { state: { station } }));
}
