/**
 * The wire contract. P4 renders against this; P5 wires it to the live plane.
 *
 * MOTION IS MEASUREMENT (§3.6), AND THAT IS A CONSTRAINT ON THIS FILE.
 * Every timing below is a number the system actually measured, and every one
 * that was not measured is `null` rather than a default. The render draws
 * packet speed from latency, so a zero standing in for "unknown" would draw a
 * fast packet for a request nobody timed — a visual produced without the
 * backend being real, which is exactly what §1.3's corollary rules out.
 *
 * There is deliberately no smoothing, no interpolation, and no synthetic
 * heartbeat carrying fake activity. When nothing is happening, nothing is sent
 * except the transport's own keepalive, and the world should look quiet because
 * it is quiet.
 */

/** Server → client. */
export type ServerMessage =
  HelloMessage | EventMessage | PresenceMessage | SubscribedMessage | ErrorMessage;

export type HelloMessage = {
  type: 'hello';
  protocol: 1;
  /** Server clock at send. Lets a client measure its own offset honestly. */
  serverTime: string;
  /** Whether this socket carries a tenant identity, and which. */
  identity: { authenticated: boolean; orgRef: string | null };
  limits: { maxSubscriptions: number; heartbeatSeconds: number };
  disclosure: string;
};

export type LiveEvent = {
  /** The audit row's own id. One event, one row, same identifier. */
  id: string;
  /** Pseudonymous for other tenants, the real id for your own. */
  orgRef: string;
  isSelf: boolean;
  action: string;
  outcome: 'allowed' | 'denied' | 'error';
  resourceType: string | null;
  /** Real database timestamp of the row. */
  occurredAt: string;
  /** Correlation id — only for your own events; another tenant's is not yours. */
  correlationId: string | null;
  /** Real OpenTelemetry trace id, or null when no span was active. */
  traceId: string | null;
  /**
   * Real measured server duration in milliseconds, or null when unmeasured.
   * NEVER a default. See the note at the top of this file.
   */
  durationMs: number | null;
  /**
   * When the gateway received the notification from PostgreSQL. With
   * `occurredAt` this gives the real commit-to-fanout delay; with the client's
   * own receive time it gives real end-to-end transport latency. Both are
   * measurements, not estimates.
   */
  publishedAt: string;
};

export type EventMessage = { type: 'event'; event: LiveEvent };

export type PresenceMessage = {
  type: 'presence';
  /** Honest count of live sockets. */
  connections: number;
  /**
   * False when Redis is unreachable. `connections` is then 0 meaning UNKNOWN,
   * and a client must not render it as "nobody is here" — that would be the
   * degraded case quietly presenting itself as a fact.
   */
  measured: boolean;
  windowSeconds: number;
  at: string;
};

export type SubscribedMessage = {
  type: 'subscribed';
  scope: 'self' | 'world';
  at: string;
};

export type ErrorMessage = {
  type: 'error';
  code: string;
  message: string;
};

/** Client → server. A small, fixed vocabulary. */
export type ClientMessage =
  | { type: 'subscribe'; scope: 'self' | 'world' }
  | { type: 'unsubscribe'; scope: 'self' | 'world' }
  | { type: 'ping' };

export const PROTOCOL_VERSION = 1 as const;
