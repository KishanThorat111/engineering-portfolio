/**
 * Test runner that keeps the output.
 *
 * WHY THIS EXISTS
 * One P2 suite run reported four failures that could not be reproduced across
 * four subsequent runs, and its output was gone by the time anyone looked. A
 * green run that might have been red once is worth slightly less than a green
 * run that was always green, and the difference between those two states is
 * whether the failure was diagnosable. It was not. Now it is.
 *
 * Every run writes the full stdout and stderr to `test-output.log`, whether it
 * passes or fails, along with a header recording when it ran and against what.
 * The log is gitignored and overwritten each run; CI uploads it as an artifact
 * when the job fails.
 *
 * This captures rather than retries. Nothing here re-runs a failing test to see
 * if it passes the second time — that would convert a real intermittent defect
 * into a green tick, which is the opposite of the point.
 */
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const logPath = join(root, 'test-output.log');
const log = createWriteStream(logPath, { flags: 'w' });

const started = new Date();
log.write(
  [
    `# control-plane test run`,
    `# started:  ${started.toISOString()}`,
    `# node:     ${process.version}`,
    `# platform: ${process.platform}`,
    `# database: ${process.env['DATABASE_URL'] ?? '(default)'}`,
    `# redis:    ${process.env['REDIS_URL'] ?? '(default)'}`,
    '',
  ].join('\n'),
);

const child = spawn(process.execPath, ['--test', '--test-concurrency=1', 'test/**/*.test.js'], {
  cwd: root,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

// Tee: the developer still sees it live, and the file keeps it.
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  log.write(chunk);
});
child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  log.write(chunk);
});

child.on('close', (code) => {
  const finished = new Date();
  log.write(`\n# finished: ${finished.toISOString()} (${finished - started}ms)\n# exit: ${code}\n`);
  log.end(() => {
    if (code !== 0) {
      process.stderr.write(`\nFull output retained at ${logPath}\n`);
    }
    process.exit(code ?? 1);
  });
});
