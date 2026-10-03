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
 * 2. LIGHT. Moved to scripts/pointer.ts (Oct 2026), which every page runs: the
 *    ring, the light on the artwork, the panels' edges and the pull on calls
 *    to action all follow one smoothed pointer position there.
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

export function initStageMotion(): void {
  const root = document.documentElement;
  // The layout's head script sets this only when motion is allowed.
  if (!('revealReady' in root.dataset) || !('IntersectionObserver' in window)) return;

  const wide = matchMedia(WIDE).matches;
  // Laptop widths: panels sit in a grid below the scene and arrive one by one.
  const band = wide && !matchMedia('(min-width: 1600px)').matches;
  const below_ = (el: HTMLElement) => band && el.classList.contains('pnl');
  const stages = Array.from(document.querySelectorAll<HTMLElement>('.stage'));

  /* --- arrival ------------------------------------------------------- */
  const arrive = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const stage = entry.target as HTMLElement;
        arrive.unobserve(stage);
        stage.dataset['in'] = '';
        show(wideTargets(stage).filter((el) => 'rv' in el.dataset && !below_(el)));
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

  // A phone card's pinned labels light in turn once the card itself is in view.
  const pinsIn = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        pinsIn.unobserve(entry.target);
        show(Array.from(entry.target.children) as HTMLElement[]);
      }
    },
    { rootMargin: '0px 0px -15% 0px' },
  );

  const below = innerHeight;
  for (const stage of stages) {
    // Only the section's own box is read here; see visual-world.ts on why.
    if (stage.getBoundingClientRect().top < below) {
      stage.dataset['in'] = '';
      continue;
    }
    if (wide) {
      for (const el of wideTargets(stage)) {
        el.dataset['rv'] = kind(el);
        if (below_(el)) piece.observe(el);
      }
      // The whole frame — artwork and overlay together — settles as it arrives.
      stage.dataset['armed'] = '';
      arrive.observe(stage);
    } else {
      stage.dataset['in'] = '';
      for (const el of mobileTargets(stage)) {
        el.dataset['rv'] = 'e';
        piece.observe(el);
      }
      const pins = stage.querySelector<HTMLElement>('.stage__pins');
      if (pins) {
        for (const pin of Array.from(pins.children) as HTMLElement[]) pin.dataset['rv'] = 'pin';
        pinsIn.observe(pins);
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
}
