/**
 * The PostgreSQL LISTEN side of the spine.
 *
 * One dedicated connection per process, held outside the pool. A pooled client
 * cannot be used: LISTEN is session state, and a pool would hand the socket to
 * the next caller mid-subscription and silently stop delivering.
 *
 * The listener is the ONLY thing that turns a committed audit row into a live
 * event. Nothing else in the codebase publishes to subscribers, which is what
 * keeps the row and the event from ever disagreeing.
 */
import { Client } from 'pg';
import { env } from '../config/env.js';

export const CHANNEL = 'control_plane_events';

/** Exactly the shape migration 004's trigger builds. */
export type NotifiedAuditEvent = {
  id: string;
  tenantId: string;
  action: string;
  outcome: 'allowed' | 'denied' | 'error';
  resourceType: string | null;
  occurredAt: string;
  correlationId: string;
  traceId: string | null;
  durationMs: number | null;
};

type Handler = (event: NotifiedAuditEvent, receivedAt: Date) => void;
type Logger = (level: 'info' | 'warn' | 'error', message: string, fields?: object) => void;

export class AuditListener {
  #client: Client | null = null;
  #handlers = new Set<Handler>();
  #stopping = false;
  #retry: NodeJS.Timeout | null = null;
  #connected = false;
  #onLog: Logger;

  constructor(onLog: Logger = () => {}) {
    this.#onLog = onLog;
  }

  get connected(): boolean {
    return this.#connected;
  }

  onEvent(handler: Handler): () => void {
    this.#handlers.add(handler);
    return () => this.#handlers.delete(handler);
  }

  async start(): Promise<void> {
    if (this.#stopping) return;
    const client = new Client({ connectionString: env.DATABASE_URL });
    this.#client = client;

    client.on('notification', (message) => {
      // Timestamp FIRST, before any parsing, so the recorded arrival time is
      // the arrival time rather than the arrival time plus our own work.
      const receivedAt = new Date();
      if (!message.payload) return;
      let parsed: NotifiedAuditEvent;
      try {
        parsed = JSON.parse(message.payload) as NotifiedAuditEvent;
      } catch {
        this.#onLog('warn', 'unparseable notification payload');
        return;
      }
      for (const handler of this.#handlers) {
        try {
          handler(parsed, receivedAt);
        } catch (error) {
          // One bad subscriber must not stop delivery to the others.
          this.#onLog('error', 'event handler threw', { error: (error as Error).message });
        }
      }
    });

    client.on('error', (error) => {
      this.#connected = false;
      this.#onLog('warn', 'listener connection error', { error: error.message });
      this.#scheduleReconnect();
    });

    client.on('end', () => {
      this.#connected = false;
      if (!this.#stopping) this.#scheduleReconnect();
    });

    try {
      await client.connect();
      await client.query(`LISTEN ${CHANNEL}`);
      this.#connected = true;
      this.#onLog('info', 'listening for control plane events', { channel: CHANNEL });
    } catch (error) {
      this.#connected = false;
      this.#onLog('warn', 'listener failed to connect', { error: (error as Error).message });
      this.#scheduleReconnect();
    }
  }

  /*
   * Reconnect, but never pretend.
   *
   * While disconnected the gateway reports the live plane as unavailable rather
   * than buffering or replaying. §6.3 is explicit: a degraded transport says it
   * is degraded. Events missed during a gap are genuinely missed — they remain
   * in the audit table, and a client that wants the gap reads /v1/audit. What
   * must not happen is a silent replay presented as live.
   */
  #scheduleReconnect(): void {
    if (this.#stopping || this.#retry) return;
    this.#retry = setTimeout(() => {
      this.#retry = null;
      void this.#reconnect();
    }, 2_000);
  }

  async #reconnect(): Promise<void> {
    if (this.#stopping) return;
    try {
      await this.#client?.end();
    } catch {
      /* already gone */
    }
    this.#client = null;
    await this.start();
  }

  async stop(): Promise<void> {
    this.#stopping = true;
    this.#connected = false;
    if (this.#retry) clearTimeout(this.#retry);
    this.#retry = null;
    this.#handlers.clear();
    try {
      await this.#client?.end();
    } catch {
      /* already gone */
    }
    this.#client = null;
  }
}
