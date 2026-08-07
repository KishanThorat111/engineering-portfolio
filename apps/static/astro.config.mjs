// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * `site` is the origin every absolute URL on this site derives from, and since
 * Phase 7 it is load-bearing: canonical links, Open Graph URLs, sitemap
 * entries, JSON-LD identifiers, the Sitemap line in robots.txt, and every
 * absolute URL in /api/profile.json all come from here.
 *
 * It is deliberately the ONLY place the origin is written down. Nothing else
 * hardcodes a host, which is what makes the swap below a one-line change.
 *
 * ⚠ PROVISIONAL ORIGIN — Phase 8 changes this line.
 *
 * The value below is the live Cloudflare Pages URL. The ratified production
 * domain is kishanthorat.com, which is not purchased yet. At launch, Phase 8
 * swaps this one line and re-verifies every emitted URL: canonicals, OG image
 * URLs, sitemap entries, JSON-LD @ids, profile.json, llms.txt, and the Sitemap
 * line in robots.txt. The machine-parity gate reads the origin from the
 * artifact rather than hardcoding one, so it keeps working across the swap.
 *
 * Note for whoever does that: blueprint §7.4 names kishanthorat.dev as the
 * primary domain with .com redirecting to it, and the Phase 8 contract repeats
 * .dev. The planning authority has since ratified .com as production. Use .com
 * and treat the blueprint wording as superseded — see docs/PHASE_LOG.md.
 */
export default defineConfig({
  site: 'https://kishanthorat-portfolio.pages.dev',

  /*
   * The deployment artifact is the repository-root `dist/`, not this
   * workspace's own folder, and that is deliberate.
   *
   * One Cloudflare Worker serves one assets directory (wrangler.jsonc), so the
   * origin that a visitor reaches is a single composed tree. From Phase 5 that
   * tree carries two surfaces — this static app and the experience bundle —
   * under one host, sharing one set of truth gates. Root `dist/` is therefore
   * the composed deployment artifact, and each workspace builds into it.
   *
   * The practical consequence today: `wrangler.jsonc`, `lighthouserc.json`,
   * and every gate in `scripts/` keep pointing at the same path they pointed
   * at before the monorepo split, so the split could not change what deploys.
   */
  outDir: '../../dist',

  integrations: [
    sitemap({
      /*
       * /dev/components is an internal gallery, excluded from discovery in
       * three places now: this filter, the page's own noindex, and the
       * Disallow rule in robots.txt. Phase 5's log records that all three must
       * survive; this is the sitemap half of that promise.
       */
      filter: (page) => !page.includes('/dev/'),
    }),
  ],
});
