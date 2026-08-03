// @ts-check
import { defineConfig } from 'astro/config';

// `site` is the production domain (blueprint §7.4). Until the owner binds the
// domain, deploys serve from the Cloudflare Pages URL; nothing built in Phase 1
// emits absolute URLs, so this value is forward-looking rather than load-bearing.
export default defineConfig({
  site: 'https://kishanthorat.dev',
});
