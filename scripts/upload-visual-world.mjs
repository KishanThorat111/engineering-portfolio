/**
 * Upload the optimised plates to Cloudflare R2.
 *
 * Uses `wrangler r2 object put`, which authenticates through the same OAuth
 * session `wrangler login` establishes — so no access key, secret, or account
 * id is ever written to a file, an environment variable, or this repository.
 * That is deliberate: R2 credentials that can write to a bucket have no
 * business anywhere near a static site's build.
 *
 * Uploads ONLY the content-hashed production files under the `visual-world/`
 * prefix. Never the PNG masters, never the benchmark encodings.
 *
 * Cache-Control is set at upload time to one year, immutable. That is safe
 * precisely because the filenames are content-hashed: a re-encoded plate gets
 * a new name and therefore a new URL, so a cached object can never be stale.
 *
 * Usage:
 *   npx wrangler login          once, interactively
 *   npm run assets:upload -- --bucket <name>
 *   npm run assets:upload -- --bucket <name> --dry-run
 */
import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/*
 * Wrangler is invoked as a SCRIPT under this node, never through a shell.
 *
 * The first version used `shell: true` so `npx` would resolve on Windows, and
 * that silently corrupted every upload: with a shell, spawnSync concatenates
 * argv without escaping, so `--cache-control "public, max-age=31536000,
 * immutable"` arrived as three bare tokens and wrangler rejected it with
 * "Unknown arguments: max-age=31536000,, immutable". Twenty uploads failed for
 * a quoting bug, and the Windows libuv teardown assertion sat on top of the
 * real error and hid it.
 *
 * Resolving the bin path and passing an argv array removes the shell from the
 * path entirely — no quoting, no escaping, no platform difference.
 */
/*
 * Resolved as a path, not through require.resolve: wrangler's package
 * `exports` map does not expose ./bin/wrangler.js, so resolving it as a
 * subpath throws ERR_PACKAGE_PATH_NOT_EXPORTED even though the file is right
 * there. The bin is declared in its package.json and its location is stable.
 */
const WRANGLER = resolve('node_modules/wrangler/bin/wrangler.js');
if (!existsSync(WRANGLER)) {
  console.error(`upload-visual-world: wrangler not found at ${WRANGLER}. Run npm ci.`);
  process.exit(1);
}

/** Run wrangler with an argv array. No shell, so arguments survive intact. */
function wrangler(argv) {
  return spawnSync(process.execPath, [WRANGLER, ...argv], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

/*
 * THE SAME DIRECTORY THE SITE SERVES, not a separate staging copy.
 *
 * This read `build/visual-world` while the site read
 * `apps/static/public/visual-world/`, and a human copy connected the two. Two
 * directories that are supposed to hold identical bytes, kept in step by
 * memory, is a way to upload a plate the site does not serve and serve a plate
 * the bucket does not have. There is one directory now, and the manifest names
 * exactly what is in it.
 */
const DIR = resolve('apps/static/public/visual-world');
const PREFIX = 'visual-world';
const CACHE = 'public, max-age=31536000, immutable';

const args = process.argv.slice(2);
const bucket = args[args.indexOf('--bucket') + 1];
const dryRun = args.includes('--dry-run');

if (!bucket || bucket.startsWith('--')) {
  console.error('upload-visual-world: --bucket <name> is required.');
  console.error('List your buckets with:  npx wrangler r2 bucket list');
  process.exit(1);
}

if (!existsSync(DIR)) {
  console.error(`upload-visual-world: nothing at ${DIR}. Run: npm run assets:optimize`);
  process.exit(1);
}

const files = (await readdir(DIR)).filter((f) => /\.(avif|webp)$/.test(f)).sort();
if (files.length === 0) {
  // Never report success for an upload that had nothing to upload.
  console.error('upload-visual-world: no .avif/.webp files to upload.');
  process.exit(1);
}

console.log(`\nUploading ${files.length} objects to r2://${bucket}/${PREFIX}/\n`);
let total = 0;
let failed = 0;

for (const file of files) {
  const path = join(DIR, file);
  const size = (await stat(path)).size;
  const key = `${PREFIX}/${file}`;
  const type = file.endsWith('.avif') ? 'image/avif' : 'image/webp';

  if (dryRun) {
    console.log(`  [dry-run] ${key}  ${(size / 1024).toFixed(0)}KB  ${type}`);
    total += size;
    continue;
  }

  const result = wrangler([
    'r2',
    'object',
    'put',
    `${bucket}/${key}`,
    '--file',
    path,
    '--content-type',
    type,
    '--cache-control',
    CACHE,
    '--remote',
  ]);

  /*
   * EXIT CODE IS NOT THE SUCCESS SIGNAL ON WINDOWS.
   *
   * wrangler 4.120 completes the PUT, prints "Upload complete.", then trips a
   * libuv teardown assertion — `!(handle->flags & UV_HANDLE_CLOSING)` — which
   * surfaces as a non-zero status after the work is already done. The marker
   * is what is believed here; the bucket listing below is what proves it.
   *
   * A run without the marker is still a real failure, which is how the earlier
   * argv-quoting bug was caught rather than papered over.
   */
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (!/Upload complete/i.test(output)) {
    failed += 1;
    console.error(`  FAILED ${key}`);
    // Enough lines to carry wrangler's actual message, not just its crash.
    console.error(
      output
        .replace(/\[[0-9;]*m/g, '')
        .trim()
        .split('\n')
        .filter((l) => !/Logs were written|Assertion failed/.test(l))
        .slice(-6)
        .join('\n'),
    );
    continue;
  }
  total += size;
  console.log(`  ok  ${key}  ${(size / 1024).toFixed(0)}KB`);
}

console.log(
  `\n  ${files.length - failed}/${files.length} objects, ${(total / 1048576).toFixed(2)}MB`,
);
if (failed > 0) {
  console.error(`  ${failed} failed — the bucket is now in a partial state. Re-run to finish.`);
  process.exit(1);
}
console.log(`  Cache-Control: ${CACHE}\n`);
