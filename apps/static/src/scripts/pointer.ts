/**
 * THE POINTER: A RING THAT FOLLOWS, AND A LIGHT THAT FALLS WHERE IT IS.
 *
 * It replaced a 54vmax blue haze that tracked the pointer one-to-one: a fog
 * over the whole scene rather than a light on any part of it, and it jumped
 * with every event. Now one smoothed position drives everything:
 *
 *   ring    a thin ring that trails the system cursor (which is never hidden)
 *           and opens over anything that can be clicked, pressing in on click
 *   light   on artwork that asks for it (`data-light`), a small bright pool
 *           where the pointer is and a gentle falling-off of the scene around
 *           it — the way a lamp lights a thing, not a tint over all of it
 *   depth   the scene's haze and grid shift against the pointer at their own
 *           depths, from the same smoothed position
 *   edges   a panel's border catches the light where the pointer is
 *   pull    a call to action leans a few pixels toward the pointer
 *
 * All of it is decoration over pages that are complete without it. It runs
 * only with a real pointer (mouse or trackpad) and never under reduced motion;
 * the loop stops itself the moment the ring has caught up, so an idle page
 * spends nothing. `data-light` may name a descendant to measure from
 * (`data-light=".vw"`), because the element under the pointer and the artwork
 * it lights are not always the same box.
 */

const FINE = '(hover: hover) and (pointer: fine)';
const CALM = '(prefers-reduced-motion: reduce)';
const HOT = 'a[href], button, summary, [role="button"], label[for]';
const PULL = '.cta, .enter__cta--primary, .button';

export function initPointer(): void {
  if (!matchMedia(FINE).matches) return;
  const calm = matchMedia(CALM);

  const ring = document.createElement('div');
  ring.className = 'cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);

  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;
  let seen = false;
  let lit: HTMLElement | null = null;
  let box: HTMLElement | null = null;
  let pulled: HTMLElement | null = null;

  const release = () => {
    if (pulled) pulled.style.translate = '';
    pulled = null;
  };

  const tick = () => {
    raf = 0;
    // The ring and the light ease toward the pointer: close in a few frames,
    // never a jump.
    x += (tx - x) * 0.24;
    y += (ty - y) * 0.24;
    ring.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    if (lit && box) {
      const r = box.getBoundingClientRect();
      const lx = x - r.left;
      const ly = y - r.top;
      lit.style.setProperty('--lx', `${lx.toFixed(0)}px`);
      lit.style.setProperty('--ly', `${ly.toFixed(0)}px`);
      lit.style.setProperty('--lpx', ((lx / r.width) * 2 - 1).toFixed(3));
      lit.style.setProperty('--lpy', ((ly / r.height) * 2 - 1).toFixed(3));
    }
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.4) raf = requestAnimationFrame(tick);
  };
  const run = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const unlight = () => {
    if (lit) delete lit.dataset['lit'];
    lit = null;
    box = null;
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (calm.matches || e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        // First sight: place the ring under the pointer instead of sliding in
        // from the corner.
        x = tx;
        y = ty;
        seen = true;
      }
      ring.dataset['on'] = '';

      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest(HOT)) ring.dataset['hot'] = '';
      else delete ring.dataset['hot'];

      const host = t?.closest<HTMLElement>('[data-light]') ?? null;
      if (host !== lit) {
        unlight();
        if (host) {
          lit = host;
          const sel = host.dataset['light'];
          box = (sel ? host.querySelector<HTMLElement>(sel) : null) ?? host;
          host.dataset['lit'] = '';
        }
      }

      const panel = t?.closest<HTMLElement>('.pnl') ?? null;
      if (panel) {
        const q = panel.getBoundingClientRect();
        panel.style.setProperty('--mx', `${(tx - q.left).toFixed(0)}px`);
        panel.style.setProperty('--my', `${(ty - q.top).toFixed(0)}px`);
      }

      const cta = t?.closest<HTMLElement>(PULL) ?? null;
      if (cta !== pulled) release();
      if (cta) {
        pulled = cta;
        const c = cta.getBoundingClientRect();
        const dx = Math.max(-8, Math.min(8, (tx - (c.left + c.width / 2)) * 0.16));
        const dy = Math.max(-5, Math.min(5, (ty - (c.top + c.height / 2)) * 0.3));
        cta.style.transition =
          'translate 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background 0.2s ease';
        cta.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      }
      run();
    },
    { passive: true },
  );

  // The page moves under a still pointer when it scrolls; the light follows.
  addEventListener('scroll', () => lit && run(), { passive: true });
  addEventListener('pointerdown', () => (ring.dataset['press'] = ''));
  addEventListener('pointerup', () => delete ring.dataset['press']);
  document.addEventListener('pointerleave', () => {
    delete ring.dataset['on'];
    unlight();
    release();
  });
}
