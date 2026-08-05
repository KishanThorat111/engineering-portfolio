// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * `site` is the production origin (blueprint §7.4) and, since Phase 7, it is
 * load-bearing: every canonical link, Open Graph URL, sitemap entry, JSON-LD
 * identifier, and absolute URL in /api/profile.json is derived from it.
 *
 * It is deliberately the ONLY place the origin is written down. Changing the
 * production domain is a one-line change here followed by a rebuild — nothing
 * else hardcodes a host.
 */
export default defineConfig({
  site: 'https://kishanthorat.dev',
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
