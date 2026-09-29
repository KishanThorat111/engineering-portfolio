/**
 * Visual-world asset pipeline: PNG masters → optimised production plates.
 *
 * The ten plates are ~5.8MB each as PNG, ~57MB total. Shipping that in the
 * static payload is not a design decision, it is a download — so production
 * serves optimised copies from R2 and the masters stay in the repository as
 * source.
 *
 * WHY THIS BENCHMARKS RATHER THAN PICKING A NUMBER
 * "Quality 80 is usually fine" is a guess, and these plates are the worst case
 * for a guess: they are almost entirely dark gradients, thin technical lines,
 * and small bloomed highlights. Dark smooth gradients are exactly where lossy
 * codecs band, and one-pixel lines are exactly what they smear. So the script
 * encodes every candidate, measures the result against the master, and reports
 * the numbers. The choice is then made from evidence.
 *
 * WHAT IS MEASURED, AND WHY EACH ONE
 *   meanErr   average absolute channel error. Overall fidelity.
 *   p99Err    99th-percentile error. Catches damage concentrated in a small
 *             region — a smeared line or a crushed highlight — that a mean
 *             hides completely.
 *   darkErr   mean error restricted to pixels below 12% luma. This is the
 *             banding measure. These plates are mostly dark, so an encoder
 *             that scores well overall can still visibly band the environment.
 *   edgeLoss  loss of high-frequency energy, from a Sobel magnitude compared
 *             against the master's. This is the thin-technical-line and
 *             fine-grid measure — the detail the art direction depends on.
 *
 * Usage:
 *   node scripts/optimize-visual-world.mjs --benchmark   report only
 *   node scripts/optimize-visual-world.mjs               emit production files
 */
import sharp from 'sharp';
import { readdir, mkdir, writeFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';

/*
 * THE MASTERS LIVE OUTSIDE THE SERVED DIRECTORY.
 *
 * They used to sit in `apps/static/public/visual-world/`, which Astro copies
 * verbatim into `dist/` — so 57MB of source PNG shipped in the deployed
 * payload. They moved to `visual-world-masters/` at the repository root, and
 * this constant did not move with them: the script then read the directory it
 * now WRITES, found zero `.png` files there, and exited 1. The pipeline was
 * unrunnable a second time for the whole of its life after the move.
 */
const MASTERS = resolve('visual-world-masters');

/*
 * ONE OUTPUT DIRECTORY, AND IT IS THE ONE THE SITE SERVES.
 *
 * This wrote to `build/visual-world` and relied on a human copying the result
 * into `apps/static/public/visual-world/`. That copy was a manual step in a
 * pipeline whose whole purpose is that nothing about the artwork is manual,
 * and it is exactly the kind of step that silently does not happen — the two
 * directories can disagree, and the one the site reads is not the one the
 * script reports. Encoding straight into the served directory removes the step
 * and the disagreement. The R2 uploader reads this same directory, so a plate
 * served locally and a plate served from the bucket are the same bytes by
 * construction rather than by discipline.
 */
const OUT = resolve('apps/static/public/visual-world');

/* Benchmark encodings are test output and stay in the ignored work directory. */
const BENCH = resolve('build/visual-world-bench');

/** Candidates. AVIF is included because it is usually better on dark gradients. */
const CANDIDATES = [
  { id: 'webp-q90', format: 'webp', options: { quality: 90, effort: 6 } },
  { id: 'webp-q85', format: 'webp', options: { quality: 85, effort: 6 } },
  { id: 'webp-q80', format: 'webp', options: { quality: 80, effort: 6 } },
  { id: 'webp-q75', format: 'webp', options: { quality: 75, effort: 6 } },
  { id: 'avif-q65', format: 'avif', options: { quality: 65, effort: 5 } },
  { id: 'avif-q55', format: 'avif', options: { quality: 55, effort: 5 } },
];

/** Sobel magnitude mean — a proxy for how much fine detail survives. */
function edgeEnergy(data, width, height) {
  let total = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -data[i - width - 1] +
        data[i - width + 1] +
        -2 * data[i - 1] +
        2 * data[i + 1] +
        -data[i + width - 1] +
        data[i + width + 1];
      const gy =
        -data[i - width - 1] -
        2 * data[i - width] -
        data[i - width + 1] +
        data[i + width - 1] +
        2 * data[i + width] +
        data[i + width + 1];
      total += Math.abs(gx) + Math.abs(gy);
    }
  }
  return total / ((width - 2) * (height - 2));
}

async function grey(buffer) {
  return sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
}

async function compare(masterPath, encodedBuffer) {
  /*
   * Compared at half resolution. Full-resolution comparison of ten 2528x1696
   * images is minutes of CPU for no extra signal — every artefact these codecs
   * produce is a regional effect that survives a 2x downsample, and the
   * measures below are all averages.
   */
  const opts = { width: 1264 };
  const [a, b] = await Promise.all([
    sharp(masterPath).resize(opts).greyscale().raw().toBuffer({ resolveWithObject: true }),
    sharp(encodedBuffer).resize(opts).greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);

  const n = a.data.length;
  const errs = new Uint8Array(n);
  let sum = 0;
  let darkSum = 0;
  let darkCount = 0;

  for (let i = 0; i < n; i += 1) {
    const e = Math.abs(a.data[i] - b.data[i]);
    errs[i] = e;
    sum += e;
    // Below 12% luma: the region where banding is visible and common.
    if (a.data[i] < 31) {
      darkSum += e;
      darkCount += 1;
    }
  }

  const sorted = Uint8Array.prototype.slice.call(errs).sort();
  const p99 = sorted[Math.floor(n * 0.99)];

  const edgeA = edgeEnergy(a.data, a.info.width, a.info.height);
  const edgeB = edgeEnergy(b.data, b.info.width, b.info.height);

  return {
    meanErr: sum / n,
    p99Err: p99,
    darkErr: darkCount > 0 ? darkSum / darkCount : 0,
    edgeLoss: ((edgeA - edgeB) / edgeA) * 100,
  };
}

const kb = (bytes) => (bytes / 1024).toFixed(0);
const mb = (bytes) => (bytes / 1048576).toFixed(2);

async function main() {
  const benchmarkOnly = process.argv.includes('--benchmark');

  if (!existsSync(MASTERS)) {
    console.error(`optimize-visual-world: no masters at ${MASTERS}`);
    process.exit(1);
  }

  const files = (await readdir(MASTERS)).filter((f) => f.endsWith('.png')).sort();
  if (files.length === 0) {
    // A pipeline that silently produces nothing is worse than one that fails.
    console.error('optimize-visual-world: no PNG masters found — nothing to optimise.');
    process.exit(1);
  }

  let masterTotal = 0;
  for (const f of files) masterTotal += (await stat(join(MASTERS, f))).size;

  if (benchmarkOnly) {
    await mkdir(BENCH, { recursive: true });

    /*
     * Benchmarked on a SAMPLE, not all ten. Three plates chosen for what they
     * stress: 01 is dark gradients and thin lines, 06 carries the Earth's
     * continental detail, 09 is machined metal and edge-lit acrylic. Encoding
     * sixty full-resolution candidates to learn the same thing is an hour of
     * CPU for no additional information.
     */
    const sample = ['01-enter.png', '06-live.png', '09-proof.png'].filter((f) => files.includes(f));

    console.log(`\nBenchmark on ${sample.length} plates: ${sample.join(', ')}\n`);
    const totals = new Map();

    for (const file of sample) {
      const path = join(MASTERS, file);
      const original = (await stat(path)).size;
      console.log(`── ${file}  (master ${mb(original)}MB)`);
      console.log('   candidate    size     saving   meanErr   p99Err   darkErr   edgeLoss');

      for (const c of CANDIDATES) {
        const buf = await sharp(path)[c.format](c.options).toBuffer();
        const m = await compare(path, buf);
        const saving = ((1 - buf.length / original) * 100).toFixed(1);

        const prev = totals.get(c.id) ?? { bytes: 0, meanErr: 0, darkErr: 0, edgeLoss: 0, n: 0 };
        totals.set(c.id, {
          bytes: prev.bytes + buf.length,
          meanErr: prev.meanErr + m.meanErr,
          darkErr: prev.darkErr + m.darkErr,
          edgeLoss: prev.edgeLoss + m.edgeLoss,
          n: prev.n + 1,
        });

        console.log(
          `   ${c.id.padEnd(11)} ${(kb(buf.length) + 'KB').padStart(7)} ${(saving + '%').padStart(8)}` +
            `   ${m.meanErr.toFixed(3).padStart(7)}  ${String(m.p99Err).padStart(6)}` +
            `  ${m.darkErr.toFixed(3).padStart(8)}  ${(m.edgeLoss.toFixed(2) + '%').padStart(8)}`,
        );
        await writeFile(join(BENCH, `${basename(file, '.png')}-${c.id}.${c.format}`), buf);
      }
      console.log('');
    }

    console.log('── averages across sample');
    console.log('   candidate    total    meanErr   darkErr   edgeLoss');
    for (const [id, t] of totals) {
      console.log(
        `   ${id.padEnd(11)} ${(kb(t.bytes) + 'KB').padStart(7)}` +
          `   ${(t.meanErr / t.n).toFixed(3).padStart(7)}  ${(t.darkErr / t.n).toFixed(3).padStart(8)}` +
          `  ${((t.edgeLoss / t.n).toFixed(2) + '%').padStart(8)}`,
      );
    }
    console.log(`\nMasters total: ${mb(masterTotal)}MB across ${files.length} plates`);
    console.log(`Bench encodings written to ${BENCH} for visual inspection.\n`);
    return;
  }

  /* ---- production emit ------------------------------------------------ */

  /*
   * BOTH FORMATS, CHOSEN BY MEASUREMENT.
   *
   * AVIF q65 beat every WebP candidate on every axis at roughly half the size
   * (mean error 0.787 vs 1.320, dark-region banding 0.719 vs 0.993, edge loss
   * 2.37% vs 7.03%, and a 99th-percentile error of 3 against 10-12). On plates
   * that are almost entirely dark gradients and one-pixel technical lines that
   * is not a marginal win, so AVIF is primary.
   *
   * WebP q85 ships alongside it for Safari before 16.4, which cannot decode
   * AVIF. Both together are ~1.6MB for twenty files — the fallback costs
   * nothing to store and removes a whole class of "blank background on an old
   * iPhone" report.
   */
  const PRIMARY = { format: 'avif', options: { quality: 65, effort: 5 } };
  const FALLBACK = { format: 'webp', options: { quality: 85, effort: 6 } };

  /*
   * THREE WIDTHS, BECAUSE ONE WIDTH COST 1.6 SECONDS OF LCP.
   *
   * The plates shipped at their master width only. On the homepage the first
   * plate is the largest contentful element, so Lighthouse measured LCP at
   * **3.4s** against the §11 budget of 1.8s — a real budget breach, not a
   * threshold quibble, and every other metric on that run was perfect (FCP
   * 0.9s, SI 0.9s, TBT 0, CLS 0). A 2560-wide plate decoded on a 390-wide
   * phone is most of a second of pure waste before a single pixel of it is
   * visible.
   *
   * 768 is the rung a phone actually takes: a 412px viewport at DPR 1.75 needs
   * 721 device pixels, and without this rung the smallest thing on offer was
   * 1280 — nearly double the bytes, on the one device where the budget is
   * measured. 1280 covers laptops at 1x and phones at 3x; 1920 covers desktop
   * and retina laptops; the master's own width is the top rung so a large or
   * retina desktop still gets every pixel that was rendered. The browser picks by
   * `srcset`/`sizes` before any script runs, which is the entire point: the
   * preload scanner can start the right fetch from the raw HTML.
   *
   * The ladder is built PER PLATE and clamped to the master, so a plate is
   * never upscaled and a narrower master simply gets fewer rungs.
   */
  const BASE_WIDTHS = [768, 1280, 1920];
  const ladder = (masterWidth) =>
    [...new Set([...BASE_WIDTHS.filter((w) => w < masterWidth), masterWidth])].sort(
      (a, b) => a - b,
    );

  /*
   * THE FALLBACK LADDER STOPS AT 1920, AND THAT IS NOT A CORNER CUT.
   *
   * WebP exists here for exactly one audience: Safari before 16.4, which cannot
   * decode AVIF. That is a closing tail, and the full ladder for it cost 2.5MB
   * of repository and deployed weight to give a legacy browser a retina rung it
   * will render on a display most of that cohort does not have. AVIF — what
   * essentially every current browser actually fetches — keeps every rung up to
   * the master's own width.
   *
   * The fallback is complete, not degraded: the same plate, the same crop, at a
   * width that is still larger than the viewport of the devices still running
   * that Safari.
   */
  const FALLBACK_MAX_WIDTH = 1920;

  /*
   * PER-PLATE CROPS, AND WHY TWO PLATES HAVE ONE.
   *
   * Two masters were rendered with a photorealistic generated human figure in
   * frame: 07 (seated at the desk, face forward, in focus) and 08 (at the
   * window, three-quarter from behind). On a personal portfolio a photorealistic
   * person in the artwork reads as a photograph of the subject. No owned
   * photograph of the subject exists — `/about` still carries the OWNER-INPUT
   * marker asking for one — so shipping these would have published a fabricated
   * image of a real person.
   *
   * The repository had already ruled on exactly this, in the other medium:
   * PHASE_LOG 04–10 records that a placeholder figure was tried at the subject's
   * position in the 3D `ThinkScene` and removed, and that the frame was composed
   * as "a recently-vacated desk instead". The plates were generated from the
   * references afterwards and quietly reintroduced what that ruling removed, so
   * the two surfaces disagreed about the same fact — which is what rule 10
   * exists to catch, arriving through a channel no gate watches.
   *
   * These crops apply the same ruling to the plates. They are composed, not
   * merely cut: 07 becomes the monitor, the architecture sketches and the empty
   * desk, which is the vacated desk the log asked for; 08 becomes the city, the
   * cube and the desk, which is the whole composition minus the figure. Both
   * were checked by rendering them, not by arithmetic.
   *
   * A crop is applied BEFORE the width ladder, so every rung is cropped and no
   * uncropped pixel of either figure exists anywhere in the output.
   */
  const CROPS = {
    '07-think': { left: 0, top: 430, width: 1260, height: 840 },
    '08-build': { left: 0, top: 400, width: 1750, height: 1167 },
  };

  await mkdir(OUT, { recursive: true });
  const manifest = {};
  let outTotal = 0;

  console.log(`
Encoding ${files.length} plates: avif q65 primary, webp q85 fallback
`);

  for (const file of files) {
    const path = join(MASTERS, file);
    const stem = basename(file, '.png');
    manifest[stem] = {};

    const crop = CROPS[stem];
    // The width available AFTER any crop, so a plate is never upscaled past
    // the pixels that actually survive into the frame.
    const masterWidth = crop ? crop.width : ((await sharp(path).metadata()).width ?? 1280);

    for (const variant of [PRIMARY, FALLBACK]) {
      manifest[stem][variant.format] = {};

      const rungs =
        variant === FALLBACK
          ? ladder(Math.min(masterWidth, FALLBACK_MAX_WIDTH))
          : ladder(masterWidth);

      for (const width of rungs) {
        const pipeline = sharp(path);
        if (crop) pipeline.extract(crop);
        const buf = await pipeline
          .resize({ width, withoutEnlargement: true })
          [variant.format](variant.options)
          .toBuffer();

        /*
         * CONTENT-HASHED FILENAMES, not a versioned directory.
         *
         * These plates are finalised artwork that changes rarely and
         * individually. A hash in the name means every URL can be served
         * immutable for a year with no purge step, and a re-encoded plate gets a
         * new URL automatically — so a changed image can never be served stale,
         * which is the failure a long max-age on a stable filename guarantees.
         * A versioned directory would force all ten to move whenever one
         * changed, and would need a manual bump nobody remembers.
         */
        const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8);
        const name = `${stem}-${width}.${hash}.${variant.format}`;
        await writeFile(join(OUT, name), buf);
        manifest[stem][variant.format][String(width)] = name;
        outTotal += buf.length;

        console.log(`  ${name.padEnd(36)} ${(kb(buf.length) + 'KB').padStart(8)}`);
      }
    }
  }

  /*
   * REMOVE ORPHANS FROM A PREVIOUS ENCODE.
   *
   * Filenames are content-hashed, so re-encoding a plate writes a NEW file and
   * leaves the old one behind. In a directory Astro copies verbatim that is not
   * untidiness, it is artwork nothing references being deployed forever. Only
   * files this run did not just write are removed, and only encoded variants —
   * nothing else in the directory is touched.
   */
  const keep = new Set(
    Object.values(manifest).flatMap((formats) =>
      Object.values(formats).flatMap((w) => Object.values(w)),
    ),
  );
  let pruned = 0;
  for (const f of await readdir(OUT)) {
    if (!/\.(avif|webp)$/.test(f) || keep.has(f)) continue;
    await rm(join(OUT, f));
    pruned += 1;
  }

  /*
   * The manifest is what the site reads. It is committed, so a build never
   * needs the masters present and CI never runs sharp.
   */
  await writeFile(
    resolve('apps/static/src/config/visual-world-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}
`,
  );

  console.log(
    `
  masters ${mb(masterTotal)}MB → production ${mb(outTotal)}MB` +
      `  (${((1 - outTotal / masterTotal) * 100).toFixed(1)}% reduction)
`,
  );
  console.log(`  Files:    ${OUT}`);
  if (pruned > 0) console.log(`  Pruned:   ${pruned} orphaned file(s) from a previous encode`);
  console.log(`  Manifest: apps/static/src/config/visual-world-manifest.json
`);
}

await main();
