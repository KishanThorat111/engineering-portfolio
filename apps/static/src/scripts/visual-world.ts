/**
 * Parallax and lazy plate loading, for every station on the page.
 *
 * ONE SCRIPT, TEN STATIONS. It finds every `.vw` on the page and drives them
 * all; there is no per-station JavaScript and adding station eleven requires
 * none.
 *
 * THE STATIC SURFACE'S JS BUDGET IS 15KB gz AND ALREADY MET (§11).
 * This file is a few hundred bytes compressed and adds no dependency. That is
 * the reason it is hand-written rather than reaching for a scroll library:
 * every animation library that would do this costs more than the entire
 * remaining budget.
 *
 * WHY TRANSFORMS AND NOT background-position
 * Moving a background-position repaints the layer every frame. A translate on
 * a promoted layer is composited on the GPU and costs nothing per frame. The
 * plate is oversized in CSS precisely so it can be translated without exposing
 * an edge.
 *
 * REDUCED MOTION IS CHECKED BEFORE ANYTHING IS ARMED, and re-checked when it
 * changes. A visitor who turns the preference on mid-session gets stillness
 * immediately, and the observers that load plates keep working — motion is
 * suppressed, content never is.
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

/**
 * Does this browser decode AVIF?
 *
 * Resolved ONCE for the page. AVIF is the primary format because it measured
 * better than every WebP candidate at half the size, but Safari before 16.4
 * cannot decode it — and a `background-image` that fails is silent, so a
 * feature test is the only way to know. A one-pixel AVIF is decoded to answer
 * the question; the promise is created immediately so it has usually settled
 * by the time the first plate is wanted.
 */
const AVIF_PIXEL =
  'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=';

let avifSupport: Promise<boolean> | null = null;

function supportsAvif(): Promise<boolean> {
  if (!avifSupport) {
    avifSupport = new Promise<boolean>((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(probe.width > 0);
      probe.onerror = () => resolve(false);
      probe.src = AVIF_PIXEL;
    });
  }
  return avifSupport;
}

/**
 * Promote a lazy plate to a real background.
 *
 * Loaded through an Image first so the swap happens on a decoded bitmap:
 * assigning the url straight to background-image paints an empty box until the
 * bytes arrive, which on a slow connection is a visible flash of ground.
 */
async function loadPlate(layer: Layer): Promise<void> {
  const el = layer.plate;
  if (!el || el.dataset['loaded'] === 'true') return;
  const src = (await supportsAvif()) ? el.dataset['avif'] : el.dataset['webp'];
  if (!src) return;
  el.dataset['loaded'] = 'true';

  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  const apply = () => {
    el.style.backgroundImage = `url("${src}")`;
    el.dataset['ready'] = 'true';
  };
  if (img.decode) {
    img.decode().then(apply).catch(apply);
  } else {
    img.onload = apply;
    /*
     * No onerror handler that hides anything. A plate that fails to load
     * leaves the graphite ground and the atmosphere, which is a complete and
     * intentional appearance — there is nothing to fall back to because
     * nothing readable was ever in the image.
     */
  }
}

export function initVisualWorld(): void {
  const layers = collect();
  if (layers.length === 0) return;

  /* --- lazy loading: one station ahead ------------------------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const layer = layers.find((l) => l.root === entry.target);
          if (layer) void loadPlate(layer);
          io.unobserve(entry.target);
        }
      },
      // 60% of a viewport of lead time: enough that the plate is decoded before
      // the station is on screen, not so much that everything loads at once.
      { rootMargin: '60% 0px' },
    );
    for (const layer of layers) {
      /*
       * Eager plates load immediately and are never observed. Nothing is
       * inlined into the HTML any more — the gate forbids inline styles — so
       * this is the ONLY thing that puts the first station's artwork on
       * screen, and it must not wait for an intersection that already
       * happened before the observer existed.
       */
      if (layer.root.dataset['priority'] === 'eager') void loadPlate(layer);
      else io.observe(layer.root);
    }
  } else {
    // No observer: load everything rather than show nothing. Correctness beats
    // the budget in the fallback path.
    layers.forEach(loadPlate);
  }

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
