/**
 * The WebSocket gateway.
 *
 * Every visitor to a public demo can open a socket, so the shape of this file is
 * decided as much by the single-VM constraint as by the product: bounded
 * connections overall, bounded per address, bounded subscriptions per
 * connection, and an idle socket that costs the VM nothing but a heartbeat.
 *
 * There is no polling anywhere. A socket with nothing happening does no work at
 * all — the listener is event-driven off PostgreSQL, and presence is only
 * recomputed when it changes or on a slow tick.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import websocket from '@fastify/websocket';
import { env } from '../config/env.js';
import { resolveCredential } from '../domain/tenant.js';
import { AuditListener, type NotifiedAuditEvent } from './notify.js';
import { PseudonymScope } from './pseudonym.js';
import * as presence from './presence.js';
import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type LiveEvent,
  type ServerMessage,
} from './envelope.js';

type Subscriber = {
  socket: WebSocket;
  ephemeralId: string;
  /** Kept only to decrement the per-address cap on close. Never persisted. */
  ephemeralAddress: string;
  orgId: string | null;
  scopes: Set<'self' | 'world'>;
  pseudonyms: PseudonymScope;
  alive: boolean;
};

export async function registerGateway(app: FastifyInstance): Promise<void> {
  await app.register(websocket, {
    options: {
      // A control message never approaches this. The cap exists because an
      // unauthenticated peer chooses the frame size.
      maxPayload: 4 * 1024,
    },
  });

  const subscribers = new Set<Subscriber>();
  const perAddress = new Map<string, number>();

  const listener = new AuditListener((level, message, fields) => {
    app.log[level]({ ...fields }, message);
  });

  /* ---- delivery ------------------------------------------------------- */

  function send(subscriber: Subscriber, message: ServerMessage): void {
    if (subscriber.socket.readyState !== subscriber.socket.OPEN) return;
    try {
      subscriber.socket.send(JSON.stringify(message));
    } catch {
      // A failed write means a socket on its way out; the close handler cleans
      // up. Nothing is retried — a retried event would arrive late and be
      // rendered as if it had just happened.
      closeSubscriber(subscriber);
    }
  }

  function fanout(notified: NotifiedAuditEvent, receivedAt: Date): void {
    const publishedAt = receivedAt.toISOString();
    void presence.markTenantActive(notified.tenantId);

    for (const subscriber of subscribers) {
      const isSelf = subscriber.orgId === notified.tenantId;
      if (isSelf ? !subscriber.scopes.has('self') : !subscriber.scopes.has('world')) continue;

      const label = subscriber.pseudonyms.labelFor(notified.tenantId);

      const event: LiveEvent = {
        id: notified.id,
        orgRef: label.ref,
        isSelf: label.isSelf,
        action: notified.action,
        outcome: notified.outcome,
        resourceType: notified.resourceType,
        occurredAt: notified.occurredAt,
        /*
         * Only your own events carry their correlation id. It is the handle a
         * visitor quotes to look an event up, and handing out another tenant's
         * would let one visitor query the audit trail of a stranger's session.
         */
        correlationId: label.isSelf ? notified.correlationId : null,
        traceId: label.isSelf ? notified.traceId : null,
        // Real or null, for everyone. A duration is not identifying, and the
        // render needs it to be true rather than present.
        durationMs: notified.durationMs,
        publishedAt,
      };

      send(subscriber, { type: 'event', event });
    }
  }

  listener.onEvent(fanout);
  await listener.start();

  /* ---- presence ticks -------------------------------------------------- */

  let presenceTimer: NodeJS.Timeout | null = null;

  async function broadcastPresence(): Promise<void> {
    if (subscribers.size === 0) return;
    const snapshot = await presence.snapshot();
    const message: ServerMessage = {
      type: 'presence',
      connections: snapshot.connections,
      measured: snapshot.measured,
      windowSeconds: snapshot.windowSeconds,
      at: new Date().toISOString(),
    };
    for (const subscriber of subscribers) send(subscriber, message);
  }

  /* ---- lifecycle ------------------------------------------------------- */

  function closeSubscriber(subscriber: Subscriber): void {
    if (!subscribers.delete(subscriber)) return;
    const address = subscriber.ephemeralAddress;
    const count = (perAddress.get(address) ?? 1) - 1;
    if (count <= 0) perAddress.delete(address);
    else perAddress.set(address, count);
    void presence.leave(subscriber.ephemeralId);
    try {
      subscriber.socket.close();
    } catch {
      /* already closing */
    }
  }

  app.get('/v1/live', { websocket: true }, async (socket: WebSocket, request: FastifyRequest) => {
    const address = request.ip;

    if (subscribers.size >= env.LIVE_MAX_CONNECTIONS) {
      socket.send(
        JSON.stringify({
          type: 'error',
          code: 'live.at_capacity',
          message:
            'The live plane is at its connection ceiling. This is a single VM and the limit ' +
            'is real — try again shortly.',
        } satisfies ServerMessage),
      );
      socket.close(1013, 'at capacity');
      return;
    }

    const existing = perAddress.get(address) ?? 0;
    if (existing >= env.LIVE_MAX_CONNECTIONS_PER_ADDRESS) {
      socket.send(
        JSON.stringify({
          type: 'error',
          code: 'live.too_many_from_origin',
          message: 'Too many concurrent live connections from this address.',
        } satisfies ServerMessage),
      );
      socket.close(1013, 'too many connections');
      return;
    }

    /*
     * Identity, if any. The socket is authenticated the same way every other
     * route is — from a credential, never from anything the client asserts
     * about which tenant it is. An unauthenticated socket is allowed and sees
     * the pseudonymised world only, because §2.3 has the world visible before
     * the visitor has provisioned anything.
     */
    let orgId: string | null = null;
    const presentedKey = bearerFrom(request);
    if (presentedKey) {
      const resolved = await resolveCredential(presentedKey);
      if (resolved && resolved.tenantStatus === 'active' && resolved.revokedAt === null) {
        orgId = resolved.tenantId;
      }
    }

    const subscriber: Subscriber = {
      socket,
      ephemeralId: presence.newEphemeralId(),
      ephemeralAddress: address,
      orgId,
      scopes: new Set(),
      pseudonyms: new PseudonymScope(orgId),
      alive: true,
    };

    subscribers.add(subscriber);
    perAddress.set(address, existing + 1);
    await presence.join(subscriber.ephemeralId);

    send(subscriber, {
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      serverTime: new Date().toISOString(),
      identity: { authenticated: orgId !== null, orgRef: orgId },
      limits: {
        maxSubscriptions: 2,
        heartbeatSeconds: env.LIVE_HEARTBEAT_MS / 1000,
      },
      disclosure:
        'Live events from the demo plane. Every event here is a committed audit row — the ' +
        'database emits them on commit, so nothing is shown that did not happen. Other ' +
        'tenants appear under a pseudonym generated for this connection alone; it cannot be ' +
        'linked to them or to any other session.',
    });

    void broadcastPresence();

    socket.on('message', (raw: Buffer) => {
      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(raw.toString('utf8')) as ClientMessage;
      } catch {
        send(subscriber, { type: 'error', code: 'live.bad_message', message: 'Malformed JSON.' });
        return;
      }
      handleClientMessage(subscriber, parsed);
    });

    socket.on('pong', () => {
      subscriber.alive = true;
      void presence.heartbeat(subscriber.ephemeralId);
    });

    socket.on('close', () => closeSubscriber(subscriber));
    socket.on('error', () => closeSubscriber(subscriber));
  });

  function handleClientMessage(subscriber: Subscriber, message: ClientMessage): void {
    switch (message?.type) {
      case 'subscribe': {
        if (message.scope !== 'self' && message.scope !== 'world') {
          send(subscriber, {
            type: 'error',
            code: 'live.bad_scope',
            message: 'Scope must be "self" or "world".',
          });
          return;
        }
        if (message.scope === 'self' && subscriber.orgId === null) {
          send(subscriber, {
            type: 'error',
            code: 'live.unauthenticated',
            message: 'Subscribing to "self" needs a tenant credential on the connection.',
          });
          return;
        }
        subscriber.scopes.add(message.scope);
        send(subscriber, {
          type: 'subscribed',
          scope: message.scope,
          at: new Date().toISOString(),
        });
        return;
      }
      case 'unsubscribe': {
        subscriber.scopes.delete(message.scope);
        return;
      }
      case 'ping': {
        subscriber.alive = true;
        void presence.heartbeat(subscriber.ephemeralId);
        return;
      }
      default:
        send(subscriber, {
          type: 'error',
          code: 'live.unknown_message',
          message: 'Unrecognised message type.',
        });
    }
  }

  /* ---- heartbeat ------------------------------------------------------- */

  const heartbeatTimer = setInterval(() => {
    for (const subscriber of subscribers) {
      if (!subscriber.alive) {
        // Missed a whole interval. A half-open TCP connection would otherwise
        // sit in the count forever, inflating presence with somebody who left.
        closeSubscriber(subscriber);
        continue;
      }
      subscriber.alive = false;
      try {
        subscriber.socket.ping();
      } catch {
        closeSubscriber(subscriber);
      }
    }
  }, env.LIVE_HEARTBEAT_MS);

  presenceTimer = setInterval(() => void broadcastPresence(), env.LIVE_PRESENCE_INTERVAL_MS);

  app.addHook('onClose', async () => {
    clearInterval(heartbeatTimer);
    if (presenceTimer) clearInterval(presenceTimer);
    await listener.stop();
    for (const subscriber of [...subscribers]) closeSubscriber(subscriber);
  });

  /** Exposed for the health contract — a disconnected listener is not live. */
  app.decorate('liveSpine', {
    listenerConnected: () => listener.connected,
    connectionCount: () => subscribers.size,
  });
}

function bearerFrom(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header === 'string') {
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (match?.[1]) return match[1];
  }
  /*
   * Browsers cannot set headers on a WebSocket handshake, so the key may also
   * arrive as a query parameter. That puts a credential in the request line and
   * therefore potentially in an access log, which is why the demo's keys are
   * short-lived, single-tenant, and scoped to a plane with nothing real behind
   * it. Recorded as a knowing trade-off rather than an oversight.
   */
  const url = new URL(request.url, 'http://localhost');
  const key = url.searchParams.get('key');
  return key && key.length > 8 ? key : null;
}

declare module 'fastify' {
  interface FastifyInstance {
    liveSpine: {
      listenerConnected: () => boolean;
      connectionCount: () => number;
    };
  }
}
