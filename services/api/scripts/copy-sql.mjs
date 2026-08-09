/**
 * Copy migration SQL into dist.
 *
 * tsc emits .ts and nothing else, so without this the built image contains a
 * migration runner and no migrations — which fails at container start rather
 * than at build time, on the VM rather than in CI. Copying them makes dist a
 * complete, self-contained artifact, which is also what lets the runtime image
 * carry no source.
 *
 * It fails loudly on finding nothing, for the same reason the copy gate does.
 */
import { cp, readdir, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const from = join(root, 'src', 'db', 'migrations');
const to = join(root, 'dist', 'db', 'migrations');

const files = (await readdir(from)).filter((f) => f.endsWith('.sql'));
if (files.length === 0) {
  console.error(`copy-sql: no .sql files in ${from} — the built image would have no migrations.`);
  process.exit(1);
}

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log(`copy-sql: ${files.length} migration(s) → dist/db/migrations`);
