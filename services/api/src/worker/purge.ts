/**
 * The TTL purge sweep.
 *
 * Dossier §7.2: "Note the loop this closes. One of the subject's published
 * lessons is that he documented a data-retention behaviour before automating it
 * — the purge existed in docs and schema, but no job ever ran it. Here, the
 * purge *is* a real job."
 *
 * So the honesty requirement on this file is unusually specific: it has to
 * actually run, on its own, without anyone calling it. The scheduler in
 * index.ts is what does that. This is the work it performs.
 *
 * FAILURE HANDLING IS PER-TENANT, NOT PER-SWEEP. One tenant that cannot be
 * purged — a lock contention, a transient database error — must not abort the
 * sweep and leave the rest of the backlog untouched. Each tenant is attempted
 * independently, failures are counted and logged, and the next tick retries
 * them, because nothing was marked purged that was not purged.
 */
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { dueTenantIds, purgeTenant, type PurgeOutcome } from '../domain/tenant.js';
import { env } from '../config/env.js';
import { LOCK, runExclusive } from './lock.js';
import { newCorrelationId } from '../telemetry/correlation.js';

/*
 * The worker has no inbound request, so nothing creates a span for it and every
 * purge audit row carried a null trace id. That was honest — correlation.ts
 * records null rather than inventing one — but it also meant the consequence
 * beat, the moment §2.1 calls the ache, would be the one event in the system
 * P5 could not trace.
 *
 * The fix is a REAL span, not a fabricated id: the sweep genuinely is a unit of
 * work with a start, a duration, and an outcome, so instrumenting it produces a
 * span that means what it says.
 */
const tracer = trace.getTracer('control-plane-worker');

export type SweepResult = {
  ran: boolean;
  trigger: 'scheduler' | 'admin';
  correlationId: string;
  due: number;
  purged: number;
  alreadyPurged: number;
  failed: number;
  durationMs: number;
  outcomes: Array<{ tenantId: string; outcome: PurgeOutcome | 'error' }>;
};

export async function runPurgeSweep(opts: {
  correlationId?: string;
  trigger: 'scheduler' | 'admin';
}): Promise<SweepResult> {
  const correlationId = opts.correlationId ?? newCorrelationId();
  const started = performance.now();

  const exclusive = await runExclusive(LOCK.purgeSweep, async () =>
    tracer.startActiveSpan('lifecycle.purge_sweep', async (sweepSpan) => {
      sweepSpan.setAttribute('purge.correlation_id', correlationId);
      sweepSpan.setAttribute('purge.trigger', opts.trigger);
      try {
        const due = await dueTenantIds(env.PURGE_BATCH_SIZE);
        sweepSpan.setAttribute('purge.due_count', due.length);

        const outcomes: SweepResult['outcomes'] = [];
        let purged = 0;
        let alreadyPurged = 0;
        let failed = 0;

        for (const tenantId of due) {
          // A child span per tenant. The audit row written inside picks up
          // these ids, so a purge event is joinable to the work that did it.
          await tracer.startActiveSpan('lifecycle.purge_tenant', async (span) => {
            span.setAttribute('tenant.id', tenantId);
            try {
              const result = await purgeTenant(tenantId, correlationId);
              span.setAttribute('purge.outcome', result.outcome);
              span.setAttribute('purge.deleted_records', result.deletedRecords);
              outcomes.push({ tenantId, outcome: result.outcome });
              if (result.outcome === 'purged') purged += 1;
              else alreadyPurged += 1;
            } catch (error) {
              // Left unpurged and unmarked, so the next tick picks it up again.
              // One tenant failing must not abandon the rest of the backlog.
              span.recordException(error as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              failed += 1;
              outcomes.push({ tenantId, outcome: 'error' });
            } finally {
              span.end();
            }
          });
        }

        sweepSpan.setAttribute('purge.purged_count', purged);
        sweepSpan.setAttribute('purge.failed_count', failed);
        return { due: due.length, purged, alreadyPurged, failed, outcomes };
      } finally {
        sweepSpan.end();
      }
    }),
  );

  if (!exclusive.ran) {
    // Another worker holds the sweep lock. Not an error — it is the lock doing
    // its job, and reporting it as a failure would make a healthy two-worker
    // deployment look broken.
    return {
      ran: false,
      trigger: opts.trigger,
      correlationId,
      due: 0,
      purged: 0,
      alreadyPurged: 0,
      failed: 0,
      durationMs: Math.round(performance.now() - started),
      outcomes: [],
    };
  }

  return {
    ran: true,
    trigger: opts.trigger,
    correlationId,
    ...exclusive.value,
    durationMs: Math.round(performance.now() - started),
  };
}
