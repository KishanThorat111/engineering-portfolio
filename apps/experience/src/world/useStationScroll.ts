/**
 * SCROLL DRIVES THE CAMERA. One take, ten stations, no page loads.
 *
 * The visitor scrolls a tall spacer; the scroll position selects a station; the
 * camera flies there. There is no navigation, no remount, and no route change
 * that reloads anything — `history.replaceState` keeps the URL honest so a
 * station stays shareable (§2.9) without the browser ever tearing the canvas
 * down.
 *
 * WHY THE STATION IS SNAPPED AND NOT INTERPOLATED
 * The obvious implementation maps scroll progress continuously onto a camera
 * path. It is wrong for this world: the camera has weight (§3.8), with lead-in
 * and settle, and a camera driven frame-by-frame from a scroll wheel has
 * neither — it becomes a slider, and the flight between stations stops being a
 * move and becomes a scrub. So scroll picks a DESTINATION and the rig flies
 * there under its own easing. The visitor's input chooses where; the rig
 * decides how, and the how is what makes it feel like a camera.
 *
 * REDUCED MOTION
 * The rig already collapses flight to an instant placement. Nothing extra is
 * needed here — the same scroll picks the same station, and it simply arrives.
 *
 * KEYBOARD
 * Scroll is not the only way through. Arrow/Page keys and the station index in
 * the chrome both call the same setter, so the world is fully navigable without
 * a pointer or a wheel.
 */
import { useEffect } from 'react';
import { useWorld } from '../state/store.ts';
import { STATIONS, type StationId } from '../kit/stations.ts';
import { LIVE_BASE } from '../router.ts';

const ORDER: StationId[] = STATIONS.map((s) => s.id);

/** Each station owns one viewport of scroll. */
export const SCROLL_PER_STATION = 1;

export function stationFromScroll(scrollY: number, viewport: number): StationId {
  if (viewport <= 0) return 'enter';
  const index = Math.round(scrollY / (viewport * SCROLL_PER_STATION));
  return ORDER[Math.max(0, Math.min(ORDER.length - 1, index))] ?? 'enter';
}

export function scrollForStation(id: StationId, viewport: number): number {
  return Math.max(0, ORDER.indexOf(id)) * viewport * SCROLL_PER_STATION;
}

export function useStationScroll(): void {
  const setNarrative = useWorld((s) => s.setNarrative);
  const narrative = useWorld((s) => s.narrative);

  /* --- deep link lands first, THEN scroll takes over ------------------ */
  useEffect(() => {
    let frame = 0;

    /*
     * ORDER MATTERS HERE, and getting it wrong silently broke every deep link.
     *
     * The scroll listener used to arm immediately and read scrollY, which on a
     * fresh load is 0 — so it set the station to `enter` and the URL effect
     * rewrote /live/proof/ back to /live/ before the visitor saw anything. A
     * shared link opened the world at the beginning and claimed that was where
     * it pointed.
     *
     * So the landing happens first and synchronously: read the path, place the
     * scroll position, and only then start listening. `behavior: 'auto'` is
     * required rather than preferred — a smooth scroll would still be in
     * flight when the listener arms and would be read as a scroll back to the
     * top.
     */
    const landing = initialStationFromPath();
    if (landing !== 'enter') {
      window.scrollTo({ top: scrollForStation(landing, window.innerHeight), behavior: 'auto' });
      setNarrative(landing);
    }

    const onScroll = () => {
      if (frame) return;
      // One read per animation frame. Reading scrollY per event is a layout
      // read on a hot path and the reason scroll handlers get blamed for jank.
      frame = requestAnimationFrame(() => {
        frame = 0;
        setNarrative(stationFromScroll(window.scrollY, window.innerHeight));
      });
    };

    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [setNarrative]);

  /* --- keyboard is a first-class way through -------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Never hijack typing.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const index = ORDER.indexOf(narrative);
      let next: number | null = null;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') next = index + 1;
      if (event.key === 'ArrowUp' || event.key === 'PageUp') next = index - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = ORDER.length - 1;
      if (next === null) return;

      const clamped = Math.max(0, Math.min(ORDER.length - 1, next));
      const id = ORDER[clamped];
      if (!id) return;
      event.preventDefault();
      window.scrollTo({
        top: scrollForStation(id, window.innerHeight),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [narrative]);

  /* --- the URL follows the camera, without reloading ------------------ */
  useEffect(() => {
    const station = STATIONS.find((s) => s.id === narrative);
    if (!station) return;
    const path = station.id === 'enter' ? LIVE_BASE : `${LIVE_BASE}${station.slug}/`;
    if (location.pathname !== path) {
      /*
       * replaceState, not pushState. Every station the camera passes through
       * on the way to another would otherwise become a back-button entry, and
       * a visitor scrolling to station 10 would need ten presses to leave. The
       * URL stays correct and shareable; the history stays sane.
       */
      history.replaceState({ narrative: station.id }, '', path);
    }
  }, [narrative]);
}

/** Deep links: land at the station the URL names, before the first paint. */
export function initialStationFromPath(pathname: string = location.pathname): StationId {
  const match = /\/live\/(?:archive\/)?([a-z-]+)\/?$/.exec(pathname);
  const slug = match?.[1];
  if (!slug) return 'enter';
  return STATIONS.find((s) => s.slug === slug)?.id ?? 'enter';
}
