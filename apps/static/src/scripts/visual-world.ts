/**
 * Parallax, for every station on the page. That is now all this does.
 *
 * ONE SCRIPT, TEN STATIONS. It finds every `.vw` on the page and drives them
 * all; there is no per-station JavaScript and adding station eleven requires
 * none.
 *
 * WHAT WAS DELETED, AND WHY
 * This file used to own plate loading too: an AVIF feature probe against a
 * data: URI, an IntersectionObserver with 60% of lead margin, and an Image()
 * decode before promoting a CSS background. Every part of that is now the
 * browser's job, done better and earlier — `<picture>` negotiates the format,
 * `srcset`/`sizes` picks the width, `loading="lazy"` handles everything below
 * the fold, and `fetchpriority="high"` on the first plate lets the preload
 * scanner start the fetch from the raw HTML. That chain of script-gated work
 * was measured at 3.4s of LCP against a 1.8s budget; markup does it without a
 * line of JavaScript.
 *
 * THE STATIC SURFACE'S JS BUDGET IS 15KB gz AND ALREADY MET (§11).
 * What remains is a few hundred bytes compressed and adds no dependency.
 *
 * WHY TRANSFORMS AND NOT object-position
 * Moving an object-position repaints the layer every frame. A translate on a
 * promoted layer is composited on the GPU and costs nothing per frame. The
 * plate is oversized in CSS precisely so it can be translated without exposing
 * an edge.
 *
 * REDUCED MOTION IS CHECKED BEFORE ANYTHING IS ARMED, and re-checked when it
 * changes. A visitor who turns the preference on mid-session gets stillness
 * immediately. Motion is suppressed; nothing is ever withheld, and because the
 * plates are now plain markup the artwork does not depend on this file at all.
 */

type Layer = {
  root: HTMLElement;
  plate: HTMLElement | null;
  atmosphere: HTMLElement | null;
  grid: HTMLElement | null;
  depth: number;
};

const REDUCED = '(prefers-reduced-motion: reduce)';

function collect(): Layer[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.vw')).map((root) => ({
    root,
    plate: root.querySelector<HTMLElement>('.vw__plate'),
    atmosphere: root.querySelector<HTMLElement>('.vw__atmosphere'),
    grid: root.querySelector<HTMLElement>('.vw__grid'),
    depth: Number(root.dataset['depth'] ?? '1') || 1,
  }));
}

export function initVisualWorld(): void {
  const layers = collect();
  if (layers.length === 0) return;

  /* --- parallax ------------------------------------------------------- */
  let motionOn = !matchMedia(REDUCED).matches;
  let ticking = false;

  const frame = () => {
    ticking = false;
    if (!motionOn) return;

    const viewport = window.innerHeight;
    for (const layer of layers) {
      const rect = layer.root.getBoundingClientRect();
      // Skip anything comfortably off screen — no work for stations nobody
      // is looking at.
      if (rect.bottom < -viewport || rect.top > viewport * 2) continue;

      /*
       * `progress` is -1 when the station is entering from below and +1 when
       * it has left above, 0 when centred. Every layer is a different multiple
       * of it, and that difference IS the depth.
       */
      const centre = rect.top + rect.height / 2;
      const progress = (centre - viewport / 2) / viewport;
      const d = layer.depth;

      if (layer.plate) {
        layer.plate.style.setProperty('--vw-plate-y', `${(progress * 34 * d).toFixed(2)}px`);
        // A whisper of scale as a station centres, so arriving feels like
        // approaching rather than like sliding.
        const scale = 1.04 - Math.min(Math.abs(progress), 1) * 0.03;
        layer.plate.style.setProperty('--vw-plate-scale', scale.toFixed(4));
      }
      layer.atmosphere?.style.setProperty('--vw-atmos-y', `${(progress * 62 * d).toFixed(2)}px`);
      layer.grid?.style.setProperty('--vw-grid-y', `${(progress * 96 * d).toFixed(2)}px`);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  const query = matchMedia(REDUCED);
  query.addEventListener('change', () => {
    motionOn = !query.matches;
    if (!motionOn) {
      // Clear every offset so nothing is left mid-drift.
      for (const layer of layers) {
        layer.plate?.style.removeProperty('--vw-plate-y');
        layer.plate?.style.removeProperty('--vw-plate-scale');
        layer.atmosphere?.style.removeProperty('--vw-atmos-y');
        layer.grid?.style.removeProperty('--vw-grid-y');
      }
    } else {
      onScroll();
    }
  });

  onScroll();
}
