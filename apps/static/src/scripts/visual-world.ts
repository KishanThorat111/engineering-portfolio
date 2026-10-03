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
  /** The station section: the box whose position is read every frame. */
  frame: HTMLElement;
  plate: HTMLElement | null;
  /** The overlay of labels and panels, which must travel with the plate. */
  overlay: HTMLElement | null;
  /** The headline column, which floats at its own, nearer depth. */
  column: HTMLElement | null;
  atmosphere: HTMLElement | null;
  grid: HTMLElement | null;
  veil: HTMLElement | null;
  depth: number;
};

const REDUCED = '(prefers-reduced-motion: reduce)';
/* The wide composition, where labels sit on the artwork. */
const WIDE = '(min-width: 1025px)';
/* Where the overlay sits on the frame as one layer (below this, on laptops,
   it is laid out on a grid and cannot ride the plate's drift). */
const FULL = '(min-width: 1600px)';

function collect(): Layer[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.vw')).map((root) => {
    const frame = root.closest<HTMLElement>('.stage') ?? root;
    return {
      root,
      frame,
      plate: root.querySelector<HTMLElement>('.vw__plate'),
      overlay: frame.querySelector<HTMLElement>('.stage__layer'),
      column: frame.querySelector<HTMLElement>('.stage__layer > .col, .stage__layer > .enter__col'),
      atmosphere: root.querySelector<HTMLElement>('.vw__atmosphere'),
      grid: root.querySelector<HTMLElement>('.vw__grid'),
      veil: root.querySelector<HTMLElement>('.vw__veil'),
      depth: Number(root.dataset['depth'] ?? '1') || 1,
    };
  });
}

export function initVisualWorld(): void {
  const layers = collect();
  if (layers.length === 0) return;

  /* --- parallax ------------------------------------------------------- */
  let motionOn = !matchMedia(REDUCED).matches;
  const wide = matchMedia(WIDE);
  const full = matchMedia(FULL);
  let ticking = false;

  const frame = () => {
    ticking = false;
    if (!motionOn) return;

    const viewport = window.innerHeight;
    for (const layer of layers) {
      /*
       * THE SECTION'S BOX, NOT THE PLATE LAYER'S.
       *
       * Stations below the fold are `content-visibility: auto`, so their
       * contents are not laid out. Asking a descendant for its rect forces
       * that layout — on every scroll frame, for all ten stations — and quietly
       * undoes the optimisation. The section itself is always laid out, and
       * the plate layer fills it exactly, so its box is the same answer for
       * free.
       */
      const rect = layer.frame.getBoundingClientRect();
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
        /*
         * 9px, down from 34.
         *
         * The plate is now shown whole, inside a 2% bleed, so the drift has to
         * fit in that margin or it exposes the edge of the image. The depth
         * effect survives: the atmosphere still moves at 62 and the grid at 96,
         * and parallax is the DIFFERENCE between layers, not the size of any
         * one of them. The plate was always meant to be the slowest thing in
         * the frame.
         */
        // On laptop widths the labels cannot follow the plate, so it holds still.
        const held = wide.matches && !full.matches;
        const drift = `${held ? 0 : (progress * 9 * d).toFixed(2)}px`;
        // Set on the frame, not the plate: the plate inherits it, and so do
        // the phone pins (Stage.astro), which must move with the artwork.
        layer.root.style.setProperty('--vw-plate-y', drift);
        /*
         * THE LABELS RIDE WITH THE ARTWORK.
         *
         * The plate drifting on its own meant every label was up to 9px off
         * its pointer except at the exact moment a station was centred. The
         * overlay now takes the same drift, so a label stays on the thing it
         * names at every scroll position — and the depth comes from the haze,
         * grid and light layers moving at their own rates around the scene.
         */
        if (layer.overlay && full.matches) layer.overlay.style.translate = `0 ${drift}`;
        /*
         * The headline column is not anchored to anything in the artwork, so
         * it is free to sit nearer the reader: it moves a little further than
         * the scene, and the words float in front of the world they describe.
         */
        if (layer.column && wide.matches) {
          layer.column.style.translate = `0 ${(progress * 22 * d).toFixed(2)}px`;
        }
        /*
         * NO SCALE. It used to swell the plate by up to 2% as a station
         * centred, which moves every point of the artwork away from the centre
         * — up to ~7px at the edges of the frame — while the labels naming those
         * points stay put. On station 01 that was enough to lift the pointer
         * lines visibly off the labels. A label has to stay on the thing it
         * names; the drift above is small and vertical, and it is zero when the
         * station is centred, which is when it is read.
         */
      }
      layer.atmosphere?.style.setProperty('--vw-atmos-y', `${(progress * 62 * d).toFixed(2)}px`);
      layer.grid?.style.setProperty('--vw-grid-y', `${(progress * 96 * d).toFixed(2)}px`);

      /*
       * THE STATION YOU ARE ON IS THE ONE THAT IS LIT.
       *
       * The veil is the page ground over the artwork (never over the text),
       * at zero while a station holds the middle of the screen and rising to
       * 0.6 as it moves a full screen away — so each frame brightens as it
       * arrives and dims as it leaves, and the seam between two stations
       * reads as a cut between shots. Wide composition only: a phone reads a
       * station top to bottom over several screens, and dimming its artwork
       * mid-read would be wrong.
       */
      if (layer.veil) {
        const away = Math.min(Math.max((Math.abs(progress) - 0.35) / 0.65, 0), 1);
        layer.veil.style.opacity = wide.matches ? (away * 0.6).toFixed(3) : '0';
      }
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
        layer.root.style.removeProperty('--vw-plate-y');
        layer.overlay?.style.removeProperty('translate');
        layer.column?.style.removeProperty('translate');
        layer.veil?.style.removeProperty('opacity');
        layer.atmosphere?.style.removeProperty('--vw-atmos-y');
        layer.grid?.style.removeProperty('--vw-grid-y');
      }
    } else {
      onScroll();
    }
  });

  onScroll();
}
