/**
 * THE STATIONS ASSEMBLE AS THEY ARRIVE, AND THE READER CARRIES A LIGHT.
 *
 * Two behaviours, both decoration over a page that is complete without them:
 *
 * 1. ARRIVAL. A station that starts below the screen has its overlay held
 *    back, then put together in reading order as it comes up: the headline
 *    line by line, labels sliding out from their dots, panels rising into
 *    place. Each element animates only `opacity` and the individual
 *    `translate`/`scale` properties, which compose with — never replace — the
 *    `transform` that positions labels on the artwork, and which the GPU
 *    animates without layout or paint.
 *
 * 2. LIGHT. On a device with a real pointer, a soft lamp follows it across the
 *    artwork and the haze and grid move against it at their own depths, and
 *    the panel under the pointer catches the light along its edge.
 *
 * WHAT CAN NEVER HAPPEN
 * Content is hidden only by this script, only after it has decided to show it
 * again, and only for stations that start entirely off screen — so nothing a
 * reader can see is ever made to disappear, and if this file fails to load,
 * fails to run, or the reader has asked for reduced motion, everything simply
 * renders where it is. `html[data-reveal-ready]`, set in <head> by the layout
 * only when motion is allowed, gates every hiding rule in CSS as well.
 *
 * Nothing here reads or implies a measurement; the one motion on this page
 * that does — the trace pulse — is driven by the liveness probe, at the speed
 * of the round trip it measured.
 */

const WIDE = '(min-width: 1025px)';
const LIT_POINTER = '(hover: hover) and (pointer: fine)';

/** What moves, and how: label (l/r by side), panel, headline line, other. */
function kind(el: HTMLElement): string {
  const c = el.classList;
  if (c.contains('cal')) return c.contains('cal--right') ? 'r' : 'l';
  if (c.contains('pnl')) return 'p';
  if (el.parentElement?.matches('.claim, .enter__claim')) return 'h';
  return 'e';
}

/** The pieces of a station's wide overlay, the column broken into its lines. */
function wideTargets(stage: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const layer = stage.querySelector('.stage__layer');
  for (const el of Array.from(layer?.children ?? []) as HTMLElement[]) {
    if (!el.matches('.col, .enter__col')) {
      out.push(el);
      continue;
    }
    for (const c of Array.from(el.children) as HTMLElement[]) {
      if (c.matches('.claim, .enter__claim'))
        out.push(...(Array.from(c.children) as HTMLElement[]));
      else out.push(c);
    }
  }
  return out;
}

function mobileTargets(stage: HTMLElement): HTMLElement[] {
  const slot = stage.querySelector('.stage__mobile')?.firstElementChild;
  return slot ? (Array.from(slot.children) as HTMLElement[]) : [];
}

/** Show a set in reading order: top to bottom in bands, then left to right. */
function show(list: HTMLElement[]): void {
  const placed = list.map((el) => ({ el, r: el.getBoundingClientRect() }));
  placed.sort((a, b) => Math.round(a.r.top / 48) - Math.round(b.r.top / 48) || a.r.left - b.r.left);
  placed.forEach(({ el }, i) => el.style.setProperty('--i', String(Math.min(i, 16))));
  requestAnimationFrame(() => {
    for (const { el } of placed) el.dataset['shown'] = '';
  });
}

/**
 * The chapter rail's "you are here". Navigation state, not motion, so it runs
 * whatever the motion preference: the station crossing the middle of the
 * screen is the current one.
 */
function trackChapters(): void {
  const rail = document.querySelector<HTMLElement>('[data-chapters]');
  if (!rail || !('IntersectionObserver' in window)) return;
  const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>('[data-chapter]'));
  const here = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = links.findIndex((a) => a.dataset['chapter'] === entry.target.id);
        if (index < 0) continue;
        links.forEach((a, i) => {
          if (i === index) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
        rail.style.setProperty('--done', String(index));
      }
    },
    { rootMargin: '-49% 0px -50% 0px' },
  );
  for (const a of links) {
    const station = document.getElementById(a.dataset['chapter'] ?? '');
    if (station) here.observe(station);
  }
}

export function initStageMotion(): void {
  trackChapters();
  const root = document.documentElement;
  // The layout's head script sets this only when motion is allowed.
  if (!('revealReady' in root.dataset) || !('IntersectionObserver' in window)) return;

  const wide = matchMedia(WIDE).matches;
  const stages = Array.from(document.querySelectorAll<HTMLElement>('.stage'));

  /* --- arrival ------------------------------------------------------- */
  const arrive = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const stage = entry.target as HTMLElement;
        arrive.unobserve(stage);
        stage.dataset['in'] = '';
        show(wideTargets(stage).filter((el) => 'rv' in el.dataset));
      }
    },
    { rootMargin: '0px 0px -22% 0px' },
  );

  // On a phone a station runs over several screens, so each piece arrives
  // on its own rather than all at once when the section's top appears.
  const piece = new IntersectionObserver(
    (entries) => {
      const due: HTMLElement[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        piece.unobserve(entry.target);
        due.push(entry.target as HTMLElement);
      }
      if (due.length) show(due);
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  const below = innerHeight;
  for (const stage of stages) {
    // Only the section's own box is read here; see visual-world.ts on why.
    if (stage.getBoundingClientRect().top < below) {
      stage.dataset['in'] = '';
      continue;
    }
    if (wide) {
      for (const el of wideTargets(stage)) el.dataset['rv'] = kind(el);
      // The whole frame — artwork and overlay together — settles as it arrives.
      stage.dataset['armed'] = '';
      arrive.observe(stage);
    } else {
      stage.dataset['in'] = '';
      for (const el of mobileTargets(stage)) {
        el.dataset['rv'] = 'e';
        piece.observe(el);
      }
    }
  }

  /*
   * A keyboard reader can tab into a station before it has arrived. Focus
   * must never land on something invisible, so focus arriving inside a held
   * station shows it at once, whatever the scroll position.
   */
  document.addEventListener('focusin', (e) => {
    const stage = e.target instanceof Element ? e.target.closest<HTMLElement>('.stage') : null;
    if (!stage || 'in' in stage.dataset) return;
    arrive.unobserve(stage);
    stage.dataset['in'] = '';
    for (const el of Array.from(stage.querySelectorAll<HTMLElement>('[data-rv]'))) {
      el.style.setProperty('--i', '0');
      el.dataset['shown'] = '';
    }
  });

  /* --- light --------------------------------------------------------- */
  if (!matchMedia(LIT_POINTER).matches) return;

  let last: PointerEvent | null = null;
  let lit: HTMLElement | null = null;
  let litPanel: HTMLElement | null = null;
  let pulled: HTMLElement | null = null;
  let queued = false;

  /*
   * Magnetic calls to action: the button leans a few pixels toward the pointer
   * while it is over it, and settles back when it leaves. Its own transition
   * is set inline, so the arrival choreography's staggered delay can never
   * apply to it.
   */
  const release = (el: HTMLElement | null) => {
    if (el) el.style.translate = '';
  };

  const paint = () => {
    queued = false;
    const e = last;
    if (!e) return;
    const target = e.target instanceof Element ? e.target : null;
    const vw = target?.closest('.stage')?.querySelector<HTMLElement>('.vw') ?? null;

    if (vw !== lit) {
      if (lit) delete lit.dataset['lit'];
      lit = vw;
      if (lit) lit.dataset['lit'] = '';
    }
    if (vw) {
      const r = vw.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      vw.style.setProperty('--vw-sx', `${x.toFixed(0)}px`);
      vw.style.setProperty('--vw-sy', `${y.toFixed(0)}px`);
      vw.style.setProperty('--vw-px', ((x / r.width) * 2 - 1).toFixed(3));
      vw.style.setProperty('--vw-py', ((y / r.height) * 2 - 1).toFixed(3));
    }

    const cta = target?.closest<HTMLElement>('.cta, .enter__cta--primary') ?? null;
    if (cta !== pulled) {
      release(pulled);
      pulled = cta;
    }
    if (cta) {
      const c = cta.getBoundingClientRect();
      const dx = (e.clientX - (c.left + c.width / 2)) * 0.16;
      const dy = (e.clientY - (c.top + c.height / 2)) * 0.3;
      cta.style.transition =
        'translate 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background 0.2s ease';
      cta.style.translate = `${Math.max(-8, Math.min(8, dx)).toFixed(1)}px ${Math.max(-5, Math.min(5, dy)).toFixed(1)}px`;
    }

    const panel = target?.closest<HTMLElement>('.pnl') ?? null;
    if (panel !== litPanel) litPanel = panel;
    if (panel) {
      const q = panel.getBoundingClientRect();
      panel.style.setProperty('--mx', `${(e.clientX - q.left).toFixed(0)}px`);
      panel.style.setProperty('--my', `${(e.clientY - q.top).toFixed(0)}px`);
    }
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      last = e;
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    },
    { passive: true },
  );

  document.addEventListener('pointerleave', () => {
    if (lit) delete lit.dataset['lit'];
    lit = null;
    release(pulled);
    pulled = null;
  });
}
