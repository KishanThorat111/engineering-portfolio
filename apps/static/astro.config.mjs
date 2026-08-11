// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import origin from '../../content/origin.json' with { type: 'json' };

/**
 * `site` is the origin every absolute URL on this site derives from, and since
 * Phase 7 it is load-bearing: canonical links, Open Graph URLs, sitemap
 * entries, JSON-LD identifiers, the Sitemap line in robots.txt, and every
 * absolute URL in /api/profile.json all come from here.
 *
 * The value itself now lives in `content/origin.json`, which is still the ONLY
 * place it is written down — it moved there when the experience surface arrived
 * and needed the same origin for its own canonical. Two configs reading one
 * file keeps the swap a one-line change; a second hardcoded copy would have
 * gone stale silently while every gate carried on passing.
 *
 * ⚠ INTERIM ORIGIN — Phase 8 changes this line to the production domain.
 *
 * DEFECT FIXED HERE, AND HOW IT WAS FOUND
 * ---------------------------------------
 * This line previously read `https://kishanthorat-portfolio.pages.dev`, which
 * has never existed. The site itself was live and healthy the whole time, so
 * every gate passed and every page served — while the canonical, the OG URL,
 * the sitemap entries, the JSON-LD @ids, and every absolute URL in
 * /api/profile.json and /llms.txt named a host that returns NXDOMAIN. The
 * machine layer, the one surface built specifically for agent readers, pointed
 * them all at nothing.
 *
 * The value below was not taken on trust either. It was fetched: it returns
 * 200, and the HTML it returns is this site's own home page. That check is the
 * whole lesson — CI proves the artifact is internally consistent, and only a
 * network request proves the address in it is real (dossier §9.7).
 *
 * PHASE 8, WHEN THE DOMAIN EXISTS
 * The ratified production domain is kishanthorat.com and it is not purchased
 * yet. Swapping it is this one line, then rebuild, re-run every gate, and
 * FETCH the deployed site to confirm /api/profile.json, /llms.txt,
 * /sitemap-index.xml, and at least one /og/*.png return 200 over the network.
 * The machine-parity gate reads the origin from the artifact rather than
 * hardcoding one, so it keeps working across the swap.
 *
 * Note for whoever does that: blueprint §7.4 names kishanthorat.dev as the
 * primary domain with .com redirecting to it, and the Phase 8 contract repeats
 * .dev. The planning authority has since ratified .com as production. Use .com
 * and treat the blueprint wording as superseded — see docs/PHASE_LOG.md.
 */
export default defineConfig({
  site: origin.site,

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
