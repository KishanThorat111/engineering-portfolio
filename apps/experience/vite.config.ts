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
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

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
    transformIndexHtml(html: string, ctx: { path: string }) {
      // The archive shell is its own destination, so it names itself.
      const path = ctx.path.startsWith('/archive/') ? '/live/archive/' : '/live/';
      return html.replace(
        '</head>',
        `  <link rel="canonical" href="${siteOrigin()}${path}">
  </head>`,
      );
    },
  };
}

/**
 * The stations, as real pages.
 *
 * §2.9 requires every station to be directly addressable by URL and shareable
 * as a link that opens there. A hash would technically be a URL and would fail
 * the spirit of it: no crawlable shell, no per-station title, and a link that
 * cannot be served by a static host as its own document.
 *
 * So each station gets its own built HTML file carrying the same bundle and its
 * own title and description. `/live/payments/` is a real page the Worker serves
 * with no SPA fallback and no route rewriting, which is also why this needed no
 * change to wrangler.jsonc — the static host already knows how to serve a
 * directory with an index.html in it.
 */
const STATION_PAGES = [
  /*
   * The ten narrative stations. Each is a real page a static host serves, so a
   * link to /live/dissection/ opens AT that station rather than opening at the
   * start and travelling — which is what §2.9 means by shareable. `enter` is
   * /live/ itself and needs no entry.
   *
   * These sit alongside the five demonstration routes below. The two schemes
   * are different things: a station is a place the camera stands; a
   * demonstration is a mechanism the visitor operates.
   */
  {
    path: 'systems',
    title: 'Systems',
    description: 'Four systems, three of them load-bearing, each disclosing what it does worst.',
  },
  {
    path: 'dissection',
    title: 'Dissection',
    description: 'Seven architecture layers, exploded, with the tenancy boundary visible.',
  },
  {
    path: 'data',
    title: 'Data',
    description: 'One request crossing every boundary, at the speed it actually took.',
  },
  {
    path: 'lab',
    title: 'Lab',
    description: 'The renderer measuring itself, and the experiments that did not ship.',
  },
  {
    path: 'live',
    title: 'Live',
    description: 'The control plane, and the one latency reading that is genuinely yours.',
  },
  {
    path: 'think',
    title: 'Think',
    description: 'Systems are half the story. The other half is judgment.',
  },
  {
    path: 'build',
    title: 'Build',
    description: 'The next system. State: undefined.',
  },
  {
    path: 'proof',
    title: 'Proof',
    description: 'The engineering archive, holding what this repository actually contains.',
  },
  {
    path: 'end',
    title: 'End',
    description: 'The estate at rest, and the next problem — unknown.',
  },
  {
    path: 'isolation',
    title: 'Isolation',
    description: 'Attempt a cross-tenant read and watch two independent layers refuse it.',
  },
  {
    path: 'payments',
    title: 'Payments',
    description: 'Fire the same activation twice at once and watch exactly one take effect.',
  },
  {
    path: 'fraud',
    title: 'Fraud',
    description: 'Submit the same photo twice and watch the hash collide.',
  },
  {
    path: 'ai',
    title: 'AI cost',
    description: 'Watch a question answered by SQL at zero model cost, then one that escalates.',
  },
  {
    path: 'limits',
    title: 'Limits',
    description: 'Hammer an endpoint until it sheds your requests.',
  },
];

/**
 * S15: TWO SHELLS, TWO SETS OF PAGES.
 *
 * The working drawing is the public /live/, and each of its five sheets is a
 * real page (/live/limits/ and so on) carrying the drawing's own title. The
 * ten-station world is preserved at /live/archive/, and every page it could
 * address — its nine narrative stations and its five demonstration routes —
 * is emitted under that prefix from ITS shell, so the archive stays a working
 * site rather than a folder of files. The old narrative URLs (/live/systems/
 * and the rest) are redirected to /live/ by dist/_redirects.
 */
const SHEET_PAGES = [
  {
    path: 'isolation',
    title: 'Isolation',
    description: 'Try to read another tenant’s record and watch two independent layers refuse it.',
  },
  {
    path: 'limits',
    title: 'Rate limits',
    description: 'Send twenty requests and watch the limiter shed the ones past its limit.',
  },
  {
    path: 'payments',
    title: 'Payments',
    description: 'Send one payment twice at once and watch exactly one take effect.',
  },
  {
    path: 'fraud',
    title: 'Duplicate evidence',
    description: 'Submit the same photo twice and watch the fingerprints collide.',
  },
  {
    path: 'ai',
    title: 'AI routing',
    description: 'Ask a question SQL can answer at zero cost, then one that is charged.',
  },
];

function writePage(
  shellPath: string,
  dir: string,
  title: string,
  description: string,
  canonical: string,
) {
  const shell = readFileSync(shellPath, 'utf8');
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${description}">`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${siteOrigin()}${canonical}">`,
    );
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), html);
}

function emitStationPages() {
  return {
    name: 'emit-station-pages',
    closeBundle() {
      const outDir = resolve(repoRoot, 'dist/live');
      for (const sheet of SHEET_PAGES) {
        writePage(
          resolve(outDir, 'index.html'),
          resolve(outDir, sheet.path),
          `${sheet.title} — live system`,
          sheet.description,
          `/live/${sheet.path}/`,
        );
      }
      for (const station of STATION_PAGES) {
        writePage(
          resolve(outDir, 'archive', 'index.html'),
          resolve(outDir, 'archive', station.path),
          `${station.title} — archive`,
          station.description,
          `/live/archive/${station.path}/`,
        );
      }
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
  plugins: [react(), injectCanonical(), emitCopyArtifact(), emitStationPages()],
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
    /*
     * 'hidden', not true.
     *
     * `sourcemap: true` appends a `//# sourceMappingURL=` comment to every
     * bundle, so the maps were requested and served in production: 5.4MB of
     * them, and `/live/assets/index-*.js.map` returned 200 to anyone who asked.
     * This repository is public, so nothing secret leaked — but 5.4MB of deploy
     * weight was being carried for a debugging aid no visitor uses.
     *
     * 'hidden' still EMITS the maps, so they remain in `dist/live/assets/` for
     * local debugging and for an error reporter given them out of band. It only
     * removes the comment that tells every browser to go and fetch one.
     *
     * This is the ONLY intentional difference between this file and 065f51e.
     */
    sourcemap: 'hidden',
    rollupOptions: {
      input: {
        main: resolve(here, 'index.html'),
        archive: resolve(here, 'archive/index.html'),
      },
      output: {
        /*
         * three is ~600KB and changes rarely; the app changes constantly.
         * Splitting them means a content edit does not invalidate the engine in
         * every returning visitor's cache.
         */
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          // Exactly react, react-dom and scheduler. A bare `node_modules/react`
          // prefix also matches react-reconciler, the archive's 3D renderer,
          // which the public drawing must never download (S15).
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
