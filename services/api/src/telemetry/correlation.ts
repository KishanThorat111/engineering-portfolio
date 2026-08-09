/**
 * The correlation strategy, fixed here so P2 can add five demonstrations
 * without inventing a sixth convention.
 *
 * Three identifiers travel together and mean different things:
 *
 *   trace_id / span_id  — OpenTelemetry's. Real, taken from the active span.
 *                         Null when no span is active, never a placeholder.
 *   correlation_id      — one request, one value, returned to the caller in
 *                         `x-correlation-id` and written on every audit row the
 *                         request produces. This is what a visitor pastes to
 *                         ask "what happened when I did that".
 *
 * The reason both exist: a trace id is only useful to someone holding the
 * trace backend, and the visitor is not. The correlation id is the handle we
 * hand out. They are recorded side by side so one can always be resolved to
 * the other.
 */
import { randomUUID } from 'node:crypto';
import { trace } from '@opentelemetry/api';

export type SpanIds = { traceId: string | null; spanId: string | null };

/**
 * The REAL ids of the currently active span, or nulls.
 *
 * The null case is deliberate and load-bearing. An audit row whose trace_id was
 * filled in with something invented would be a fabricated trace, and the whole
 * point of P5 is that the traces are not fabricated.
 */
export function currentSpanIds(): SpanIds {
  const span = trace.getActiveSpan();
  if (!span) return { traceId: null, spanId: null };
  const ctx = span.spanContext();
  const valid = ctx.traceId && ctx.traceId !== '0'.repeat(32);
  return valid ? { traceId: ctx.traceId, spanId: ctx.spanId } : { traceId: null, spanId: null };
}

export function newCorrelationId(): string {
  return randomUUID();
}

/**
 * Accept an inbound correlation id only if it is a plausible one.
 *
 * A client-supplied value is convenient for stitching a session together and is
 * also attacker-controlled, so it is length-capped and character-restricted
 * before it is allowed anywhere near a log line or a database row.
 */
export function normaliseCorrelationId(supplied: unknown): string {
  if (typeof supplied === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(supplied)) return supplied;
  return newCorrelationId();
}
