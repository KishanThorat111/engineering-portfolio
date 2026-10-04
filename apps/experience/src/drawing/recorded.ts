/**
 * The RECORDED set: real exchanges, captured by scripts/capture-exchanges.mjs
 * from a running control plane and never edited by hand.
 *
 * Validated on load for the same reason recording.ts validates the event
 * recording: this is what a visitor sees when the plane is down, so a
 * malformed file must be a loud build-time or load-time failure, never a quiet
 * empty sheet.
 */
import raw from '../live/recorded-exchanges.json';
import type * as api from '../live/api.ts';

export type Exchange<T = unknown> = {
  request: { method: string; path: string; body: unknown };
  status: number;
  /** Round trip measured by the capturing client, in milliseconds. */
  ms: number;
  /** When the response arrived. */
  at: string;
  retryAfter?: string;
  body: T;
};

/** An audit row exactly as /v1/audit returns it. */
export type AuditRow = {
  id: string;
  occurred_at: string;
  action: string;
  outcome: 'allowed' | 'denied' | 'error';
  duration_ms: number | null;
};

export type RecordedSet = {
  capturedAt: string;
  environment: string;
  apiVersion: string;
  commit: string;
  timingNote: string;
  visitor: { publicRef: string; ttlSeconds: number; seededRecords: number };
  demos: {
    isolation: {
      neighbourRef: string;
      target: string;
      exchanges: {
        neighbour: Exchange;
        list: Exchange<{ records: api.DemoRecord[] }>;
        attempt: Exchange<{ error?: { code: string; message: string } }>;
        inspect: Exchange<api.Inspection>;
      };
      audit: AuditRow[];
    };
    limits: {
      totalMs: number;
      exchanges: Array<Exchange<api.HammerResult | null>>;
      audit: AuditRow[];
    };
    payments: {
      idempotencyKey: string;
      exchanges: {
        first: Exchange<api.Activation>;
        second: Exchange<api.Activation>;
        key: Exchange<{
          activation: api.Activation['activation'];
          mechanism: { authority: string; statement: string; why: string; redisRole: string };
        }>;
      };
      audit: AuditRow[];
    };
    fraud: {
      exchanges: { first: Exchange<api.Evidence>; second: Exchange<api.Evidence> };
      audit: AuditRow[];
    };
    ai: {
      exchanges: { operational: Exchange<api.AskResult>; creative: Exchange<api.AskResult> };
      audit: AuditRow[];
    };
  };
};

function check(condition: unknown, what: string): asserts condition {
  if (!condition) throw new Error(`recorded-exchanges.json: ${what}`);
}

function parse(value: unknown): RecordedSet {
  const set = value as RecordedSet;
  check(typeof set?.capturedAt === 'string', 'no capturedAt');
  check(typeof set.environment === 'string', 'no environment');
  const d = set.demos;
  check(d?.isolation?.exchanges?.attempt?.status === 403, 'isolation attempt is not a 403');
  check(Array.isArray(d.isolation.exchanges.inspect.body?.policy?.policies), 'no policy');
  check(Array.isArray(d.limits?.exchanges) && d.limits.exchanges.length === 20, 'limits is not 20');
  check(typeof d.payments?.exchanges?.first?.body?.outcome === 'string', 'no payment outcome');
  check(d.fraud?.exchanges?.second?.status === 409, 'second evidence is not a 409');
  check(typeof d.ai?.exchanges?.operational?.body?.route === 'string', 'no AI route');
  for (const demo of Object.values(d)) check(Array.isArray(demo.audit), 'a demo has no audit rows');
  return set;
}

export const RECORDED: RecordedSet = parse(raw);
