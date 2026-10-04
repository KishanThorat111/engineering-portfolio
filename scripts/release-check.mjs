/**
 * The B-203 gate: the release script must run to completion on the VM.
 *
 * 3ed473e (17 Aug 2026): Deploy API run #3 pulled the image, ran the
 * migration and brought the whole stack up — then reported failure. The
 * release script reaches the VM on `bash -s`'s stdin, and bash reads it
 * incrementally. `docker compose exec -T` inherits that same stdin and
 * streams it into the container, so the first readiness attempt swallowed
 * every unexecuted line below it: the rest of the loop, the rollback branch,
 * and the completion marker. bash hit EOF and exited 0.
 *
 * That commit's own verification extracted the script verbatim from the
 * workflow and piped it through `bash -s` in a sandbox. This makes that
 * permanent and runs it in CI: the script is taken from
 * .github/workflows/deploy-api.yml AS COMMITTED, run under `bash -s` exactly
 * as the workflow runs it, with `sudo` and `docker` stubbed — and the
 * `compose exec` stub reads its stdin, as the real one does. The marker must
 * print. Then the negative control: the same script with the `< /dev/null`
 * fix removed must NOT print it, or this check has stopped reproducing the
 * failure it guards.
 *
 * Nothing here touches a VM, a registry or a cloud account.
 * usage: node scripts/release-check.mjs
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';

const MARKER = '__RELEASE_SCRIPT_COMPLETED__';
const workflow = readFileSync('.github/workflows/deploy-api.yml', 'utf8');
const match = /bash -s" <<'REMOTE' \| tee \/tmp\/release\.log\n([\s\S]*?)\n\s*REMOTE\n/.exec(
  workflow,
);
if (!match) {
  console.error('release-check: FAILED — the release heredoc was not found in deploy-api.yml.');
  process.exit(1);
}
// Dedent as the YAML block scalar does, and fill Actions expressions with inert values.
const lines = match[1].split('\n');
const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
const script = lines
  .map((l) => l.slice(indent))
  .join('\n')
  .replace(/\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/g, 'stub-token')
  .replace(/\$\{\{\s*github\.actor\s*\}\}/g, 'stub-actor')
  .concat('\n');

// The redirect itself — the code line, not the comment that explains it.
const REDIRECT = /^(\s*)< \/dev\/null; then$/m;
if (!script.includes(MARKER) || !REDIRECT.test(script)) {
  console.error(
    'release-check: FAILED — the script no longer carries the marker or the stdin redirect.',
  );
  process.exit(1);
}

function run(source) {
  const home = mkdtempSync(join(tmpdir(), 'release-check-'));
  try {
    const infra = join(home, 'control-plane', 'infra');
    mkdirSync(infra, { recursive: true });
    writeFileSync(join(infra, '.env.partial'), 'POSTGRES_DB=control_plane\n');
    writeFileSync(join(infra, 'compose.yml'), 'services: {}\n');
    const bin = join(home, 'bin');
    mkdirSync(bin);
    // sudo runs its arguments; docker succeeds, and `compose … exec` drains
    // stdin exactly as the real `exec -T` streams it into the container.
    writeFileSync(join(bin, 'sudo'), '#!/usr/bin/env bash\n"$@"\n');
    writeFileSync(
      join(bin, 'docker'),
      '#!/usr/bin/env bash\nfor a in "$@"; do [ "$a" = exec ] && { cat >/dev/null; exit 0; }; done\n' +
        'case "$1" in login) cat >/dev/null ;; esac\nexit 0\n',
    );
    chmodSync(join(bin, 'sudo'), 0o755);
    chmodSync(join(bin, 'docker'), 0o755);
    const result = spawnSync('bash', ['-s'], {
      input: source,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        MODE: 'release',
        NEW_IMAGE: 'ghcr.io/example/control-plane-api@sha256:0000',
      },
      timeout: 60_000,
    });
    return { code: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

const real = run(script);
if (real.code !== 0 || !real.out.includes(MARKER)) {
  console.error(
    `release-check: FAILED — the committed release script did not complete (exit ${real.code}).`,
  );
  console.error(real.out.split('\n').slice(-12).join('\n'));
  process.exit(1);
}

const broken = run(script.replace(REDIRECT, '$1; then'));
if (broken.out.includes(MARKER)) {
  console.error(
    'release-check: FAILED — negative control: with the stdin redirect removed the marker still printed, ' +
      'so this check no longer reproduces the 3ed473e failure.',
  );
  process.exit(1);
}

console.log(
  `release-check: OK — the committed release script runs to completion under bash -s; ` +
    `without the 3ed473e redirect it stops silently (exit ${broken.code}, no marker), as it did in run #3.`,
);
