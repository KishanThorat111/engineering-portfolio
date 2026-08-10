/**
 * The audit foundation.
 *
 * Audit rows are the evidence the whole product rests on: §2.5 ends with the
 * visitor reading the log entry for their own attempt, and A14 makes that log
 * the thing they leave with. So these rows are written inside the same
 * transaction as the thing they describe wherever the outcome is security-
 * relevant — an isolation denial that failed to log would be an isolation
 * denial nobody can prove happened.
 *
 * They are also written UNDER RLS, in the acting tenant's scope. A tenant
 * cannot write an audit row against another tenant even by passing the wrong
 * id, because the WITH CHECK clause on the policy refuses it.
 */
import { createHash } from 'node:crypto';
import type { Tx } from '../db/pool.js';
import { currentSpanIds } from '../telemetry/correlation.js';
import { env } from '../config/env.js';

export type AuditOutcome = 'allowed' | 'denied' | 'error';

export type AuditInput = {
  orgId: string;
  action: string;
  outcome: AuditOutcome;
  actor: string;
  correlationId: string;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  ip?: string | undefined;
  detail?: Record<string, unknown> | undefined;
  /**
   * Real elapsed milliseconds from the start of the request to this write.
   *
   * Motion is measurement (§3.6): the render draws packet speed from this, so
   * omit it rather than estimate it. Undefined becomes NULL, and the renderer
   * is required to treat NULL as "unmeasured" rather than "instant".
   */
  durationMs?: number | undefined;
};

/**
 * Hash the address with a deployment pepper, or record nothing.
 *
 * Returning null when no pepper is configured is the honest failure: an
 * unsalted hash of an IPv4 address is reversible by brute force in seconds, so
 * writing one would be storing personal data while appearing not to.
 * Production refuses to boot without the pepper (config/env.ts), so this path
 * is development-only.
 */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const pepper = env.IP_HASH_PEPPER;
  if (!pepper) return null;
  return createHash('sha256').update(`${pepper}:${ip}`).digest('hex').slice(0, 32);
}

export async function writeAudit(tx: Tx, input: AuditInput): Promise<string> {
  const { traceId, spanId } = currentSpanIds();

  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO audit_event
       (tenant_id, action, outcome, actor, resource_type, resource_id,
        correlation_id, trace_id, span_id, ip_hash, detail, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      input.orgId,
      input.action,
      input.outcome,
      input.actor,
      input.resourceType ?? null,
      input.resourceId ?? null,
      input.correlationId,
      traceId,
      spanId,
      hashIp(input.ip),
      JSON.stringify(input.detail ?? {}),
      input.durationMs ?? null,
    ],
  );

  const id = rows[0]?.id;
  if (!id) throw new Error('audit insert returned no row');
  return id;
}

export type AuditRow = {
  id: string;
  occurred_at: string;
  action: string;
  outcome: AuditOutcome;
  actor: string;
  resource_type: string | null;
  resource_id: string | null;
  correlation_id: string;
  trace_id: string | null;
  span_id: string | null;
  duration_ms: number | null;
  detail: Record<string, unknown>;
};

export async function listAudit(tx: Tx, orgId: string, limit: number): Promise<AuditRow[]> {
  const { rows } = await tx.query<AuditRow>(
    `SELECT id, occurred_at, action, outcome, actor, resource_type, resource_id,
            correlation_id, trace_id, span_id, duration_ms, detail
       FROM audit_event
      WHERE tenant_id = $1
      ORDER BY occurred_at DESC, id DESC
      LIMIT $2`,
    [orgId, limit],
  );
  return rows;
}
