/**
 * The scheduled worker. A separate process, on its own timer.
 *
 * This is what makes the lifecycle real. Nothing calls it, nothing triggers it,
 * and if every visitor went away it would keep expiring tenants on schedule.
 * That is the requirement, stated plainly: the purge must not depend on an
 * endpoint somebody manually calls.
 *
 * WHY A TIMER RATHER THAN A CRON LIBRARY OR A REDIS QUEUE
 * The dossier names "queue worker … TTL purge under Postgres advisory locks".
 * The locking is the load-bearing half and it is genuine (worker/lock.ts). For
 * the scheduling half, a fixed interval is enough and correct: the work is
 * idempotent, discovering it is a single indexed query, and the advisory lock
 * already makes concurrent workers safe. A cron parser would add a dependency
 * to express "every fifteen seconds", and a Redis queue would add a broker to
 * distribute work that a `WHERE expires_at <= now()` already distributes. Both
 * were rejected for the reason ADR-0004 rejects new infrastructure: Postgres
 * already does the job.
 *
 * The interval is drift-free by construction — the next tick is scheduled after
 * the previous one finishes, not on a fixed wall-clock cadence — so a slow
 * sweep cannot cause ticks to pile up on top of each other.
 */
import { closePool } from '../db/pool.js';
import { closeRedis } from '../redis/client.js';
import { env } from '../config/env.js';
import { runPurgeSweep } from './purge.js';

const log = (level: 'info' | 'warn' | 'error', message: string, fields: object = {}) => {
  // Structured single-line JSON so the container log is machine-readable and
  // matches what Fastify's pino emits from the API process.
  process.stdout.write(
    `${JSON.stringify({ level, time: new Date().toISOString(), service: 'purge-worker', message, ...fields })}\n`,
  );
};

let stopping = false;
let timer: NodeJS.Timeout | null = null;

async function tick(): Promise<void> {
  if (stopping) return;
  try {
    const result = await runPurgeSweep({ trigger: 'scheduler' });
    if (!result.ran) {
      log('info', 'sweep skipped — another worker holds the lock');
    } else if (result.due > 0) {
      log('info', 'sweep complete', {
        due: result.due,
        purged: result.purged,
        alreadyPurged: result.alreadyPurged,
        failed: result.failed,
        durationMs: result.durationMs,
        correlationId: result.correlationId,
      });
    }
    // A sweep that found nothing is not logged. At a fifteen-second interval
    // that is 5,760 lines a day saying "nothing happened", which buries the
    // lines that matter.
  } catch (error) {
    // The scheduler must survive anything the sweep throws. A worker that dies
    // on a transient database error stops purging silently, which is precisely
    // the failure the published lesson is about.
    log('error', 'sweep failed', { error: (error as Error).message });
  } finally {
    if (!stopping) {
      timer = setTimeout(() => void tick(), env.PURGE_INTERVAL_MS);
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  log('info', 'shutting down', { signal });
  if (timer) clearTimeout(timer);
  // An in-flight sweep is safe to abandon: each tenant is purged in its own
  // transaction, so whatever committed is complete and whatever did not rolls
  // back and is retried by the next process to hold the lock.
  await Promise.allSettled([closePool(), closeRedis()]);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

log('info', 'purge worker started', {
  intervalMs: env.PURGE_INTERVAL_MS,
  batchSize: env.PURGE_BATCH_SIZE,
});

void tick();
