/**
 * The chapter rail's "you are here". Navigation state, not motion, so it runs
 * whatever the motion preference: the station crossing the middle of the
 * screen is the current one.
 */
export function trackChapters(): void {
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
