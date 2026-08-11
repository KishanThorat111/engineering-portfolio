/**
 * The experience app's build.
 *
 * TWO THINGS HERE ARE LOAD-BEARING RATHER THAN CONFIGURATION.
 *
 * 1. `@contract` aliases the API's own envelope module. The wire types are
 *    single-sourced from services/api/src/live/envelope.ts rather than copied,
 *    because rule 10 says the layers generate from one source and cannot
 *    disagree — and a copied type declaration is precisely a second source that
 *    drifts silently. The module is types plus one const, so it carries no Node
 *    dependency into the browser bundle.
 *
 * 2. The build emits `copy.json` alongside the bundle (A4). Every
 *    visitor-facing string lives in one content module, and that module is
 *    written out as data so the repository's copy gate can scan it. Minified
 *    JavaScript cannot be scanned — third-party code contains the banned words
 *    as identifiers — so copy that reached the build only as bundled literals
 *    would ship past rule 5 unchecked.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import origin from '../../content/origin.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

/**
 * The origin, read from the ONE place it is written down.
 *
 * `content/origin.json` is shared with the static surface's Astro config.
 * Hardcoding it here would create a second copy that goes stale silently — and
 * the machine-parity gate would keep passing while the canonical on this page
 * pointed somewhere the rest of the site had left behind.
 */
function siteOrigin(): string {
  if (!origin.site) {
    throw new Error('content/origin.json has no `site` — cannot emit a canonical');
  }
  return origin.site.replace(/\/$/, '');
}

/**
 * Emit the canonical into the built HTML.
 *
 * Every page this repository publishes carries one, including the pages
 * excluded from discovery, and a CI gate asserts it. That gate is the reason
 * this plugin exists rather than a line in index.html.
 */
function injectCanonical() {
  return {
    name: 'inject-canonical',
    transformIndexHtml(html: string) {
      return html.replace(
        '</head>',
        `  <link rel="canonical" href="${siteOrigin()}/live/">
  </head>`,
      );
    },
  };
}

/** Writes the visitor-facing copy out as data so the truth gates can read it. */
function emitCopyArtifact() {
  return {
    name: 'emit-copy-artifact',
    async generateBundle(this: { emitFile: (f: unknown) => void }) {
      const module = await import('./src/content/copy.js').catch(() => null);
      const copy = module?.COPY ?? null;
      if (!copy) {
        // Fail the build rather than ship an unscannable surface. A gate that
        // silently has nothing to scan is worse than one that fails.
        throw new Error(
          'emit-copy-artifact: could not load src/content/copy.ts — the copy gate would have ' +
            'nothing to scan and rule 5 would go unenforced on this surface.',
        );
      }
      this.emitFile({
        type: 'asset',
        fileName: 'copy.json',
        source: JSON.stringify(copy, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), injectCanonical(), emitCopyArtifact()],
  resolve: {
    alias: {
      '@contract': resolve(repoRoot, 'services/api/src/live/envelope.ts'),
    },
  },
  /*
   * Built into the composed deployment artifact, under /live/.
   *
   * P0 established root dist/ as the single tree one Cloudflare Worker serves.
   * The path is /live/ and NOT /experience/ because the static surface already
   * publishes a page at /experience — building here overwrote it, which the
   * link, confidential-parity, and machine-parity gates all caught within one
   * run. `/live` also matches the socket the surface consumes (/v1/live), so
   * the two halves of the live plane read as one thing.
   */
  base: '/live/',
  build: {
    outDir: resolve(repoRoot, 'dist/live'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        /*
         * three is ~600KB and changes rarely; the app changes constantly.
         * Splitting them means a content edit does not invalidate the engine in
         * every returning visitor's cache.
         */
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
