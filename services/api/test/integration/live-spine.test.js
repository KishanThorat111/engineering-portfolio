/**
 * P3 — the live spine.
 *
 * The definition of done is "two browsers see each other's events in real
 * time", so the load-bearing case here is exactly that: two independent
 * WebSocket clients, on a real listening port, one of which acts while the
 * other watches.
 */
import { after, afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  auth,
  provisionViaApi,
  resetRateLimits,
  startListeningApi,
  stopApi,
} from '../helpers/harness.js';
import { LiveClient } from '../helpers/live-client.js';

let app;
let baseUrl;
let wsUrl;

/*
 * Sockets are closed after every test, not at the end of the file.
 *
 * Leaving them open leaked connections into later tests and tripped the
 * per-address ceiling — which defaults to 4 and was doing exactly its job. The
 * first version of this file failed twelve cases for that reason, and the fix
 * belongs here rather than in the cap: every client in a test suite shares
 * 127.0.0.1, and a real browser does not hold a socket open after the visitor
 * has gone.
 */
let openClients = [];

async function connect(apiKey) {
  const client = await LiveClient.connect(wsUrl, apiKey);
  openClients.push(client);
  return client;
}

async function closeAll() {
  const closing = openClients;
  openClients = [];
  await Promise.allSettled(closing.map((c) => c.close()));
  // The server drops its subscriber on the close event; give the event loop a
  // turn so the per-address counter is decremented before the next test.
  await new Promise((r) => setTimeout(r, 50));
}

before(async () => {
  ({ app, baseUrl, wsUrl } = await startListeningApi());
  await resetRateLimits();
});

afterEach(async () => {
  await closeAll();
});

after(async () => {
  await closeAll();
  await stopApi(app);
});

describe('live spine — the transport', () => {
  it('greets a new socket with the protocol, its identity, and the disclosure', async () => {
    const client = await connect(null);
    const hello = await client.waitFor((m) => m.type === 'hello', { label: 'hello' });

    assert.equal(hello.protocol, 1);
    assert.equal(hello.identity.authenticated, false);
    assert.equal(hello.identity.orgRef, null);
    assert.ok(hello.limits.heartbeatSeconds > 0);
    // Rule 11 and the anti-correlation promise, stated on the wire.
    assert.match(hello.disclosure, /demo plane/i);
    assert.match(hello.disclosure, /committed audit row/i);
    assert.match(hello.disclosure, /pseudonym/i);
  });

  it('authenticates from the credential, not from anything the client asserts', async () => {
    const tenant = await provisionViaApi(app, 'live-auth');
    const client = await connect(tenant.apiKey);
    const hello = await client.waitFor((m) => m.type === 'hello');
    assert.equal(hello.identity.authenticated, true);
    assert.equal(hello.identity.orgRef, tenant.orgId);
  });

  it('refuses "self" on an unauthenticated socket', async () => {
    const client = await connect(null);
    await client.waitFor((m) => m.type === 'hello');
    client.send({ type: 'subscribe', scope: 'self' });
    const error = await client.waitFor((m) => m.type === 'error', { label: 'error' });
    assert.equal(error.code, 'live.unauthenticated');
  });

  it('rejects malformed frames and unknown message types without dropping the socket', async () => {
    const client = await connect(null);
    await client.waitFor((m) => m.type === 'hello');

    client.socket.send('not json at all');
    const bad = await client.waitFor((m) => m.type === 'error' && m.code === 'live.bad_message');
    assert.ok(bad);

    client.send({ type: 'demolish-everything' });
    const unknown = await client.waitFor(
      (m) => m.type === 'error' && m.code === 'live.unknown_message',
    );
    assert.ok(unknown);

    // Still usable: a bad frame is a bad frame, not a reason to disconnect.
    client.send({ type: 'subscribe', scope: 'world' });
    assert.ok(await client.waitFor((m) => m.type === 'subscribed'));
  });
});

describe('live spine — DEFINITION OF DONE: two clients see each other', () => {
  it("an action by one tenant reaches another tenant's socket in real time", async () => {
    const actor = await provisionViaApi(app, 'live-actor');
    const watcher = await provisionViaApi(app, 'live-watcher');

    const watcherSocket = await connect(watcher.apiKey);
    await watcherSocket.waitFor((m) => m.type === 'hello');
    watcherSocket.send({ type: 'subscribe', scope: 'world' });
    await watcherSocket.waitFor((m) => m.type === 'subscribed');

    const before = watcherSocket.of('event').length;

    // The actor does something real over HTTP. Nothing tells the socket.
    const created = await fetch(`${baseUrl}/v1/records`, {
      method: 'POST',
      headers: { ...auth(actor.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'seen from another socket' }),
    });
    assert.equal(created.status, 201);

    const event = await watcherSocket.waitFor(
      (m) => m.type === 'event' && m.event.action === 'record.create',
      { label: "the actor's event" },
    );

    assert.ok(watcherSocket.of('event').length > before);
    assert.equal(event.event.outcome, 'allowed');
    assert.equal(event.event.isSelf, false, 'the actor is not the watcher');
  });

  it('the actor sees their own event as their own', async () => {
    const actor = await provisionViaApi(app, 'live-self');
    const socket = await connect(actor.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'self' });
    await socket.waitFor((m) => m.type === 'subscribed');

    await fetch(`${baseUrl}/v1/records`, {
      method: 'POST',
      headers: { ...auth(actor.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'my own' }),
    });

    const event = await socket.waitFor(
      (m) => m.type === 'event' && m.event.action === 'record.create',
    );
    assert.equal(event.event.isSelf, true);
    assert.equal(event.event.orgRef, actor.orgId, 'your own volume carries your real id');
    assert.equal(typeof event.event.correlationId, 'string');
  });

  it('a denied break-out is visible live, as denied', async () => {
    const attacker = await provisionViaApi(app, 'live-attacker');
    const victim = await provisionViaApi(app, 'live-victim');

    const socket = await connect(attacker.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'self' });
    await socket.waitFor((m) => m.type === 'subscribed');

    const list = await fetch(`${baseUrl}/v1/records`, { headers: auth(victim.apiKey) });
    const victimRecord = (await list.json()).records[0].id;

    const denied = await fetch(`${baseUrl}/v1/records/${victimRecord}`, {
      headers: auth(attacker.apiKey),
    });
    assert.equal(denied.status, 403);

    const event = await socket.waitFor((m) => m.type === 'event' && m.event.outcome === 'denied', {
      label: 'the denial',
    });
    assert.equal(event.event.action, 'record.read');
    assert.equal(event.event.isSelf, true);
  });
});

describe('live spine — presence is non-identifying by construction', () => {
  it('reports an honest, measured connection count', async () => {
    const client = await connect(null);
    const presence = await client.waitFor((m) => m.type === 'presence', { label: 'presence' });
    assert.equal(presence.measured, true);
    assert.ok(presence.connections >= 1, 'the reporting socket counts itself');
    assert.ok(presence.windowSeconds > 0);
  });

  it('carries no identifying field about anyone', async () => {
    const client = await connect(null);
    const presence = await client.waitFor((m) => m.type === 'presence');
    // There is no list of who is here, because no such list is kept.
    for (const forbidden of [
      'ip',
      'address',
      'userAgent',
      'members',
      'sessions',
      'ids',
      'tenants',
    ]) {
      assert.equal(presence[forbidden], undefined, `presence must not carry ${forbidden}`);
    }
    assert.deepEqual(
      Object.keys(presence).sort(),
      ['at', 'connections', 'measured', 'type', 'windowSeconds'],
      'presence has exactly these fields and no others',
    );
  });

  it('shows another tenant under a pseudonym, never its real id', async () => {
    const actor = await provisionViaApi(app, 'pseudo-actor');
    const watcher = await provisionViaApi(app, 'pseudo-watcher');

    const socket = await connect(watcher.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'world' });
    await socket.waitFor((m) => m.type === 'subscribed');

    await fetch(`${baseUrl}/v1/records`, {
      method: 'POST',
      headers: { ...auth(actor.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'pseudonymised' }),
    });

    const event = await socket.waitFor(
      (m) => m.type === 'event' && m.event.action === 'record.create' && !m.event.isSelf,
    );
    assert.notEqual(event.event.orgRef, actor.orgId, "the actor's real id must never be sent");
    assert.match(event.event.orgRef, /^vol_[\w-]{12}$/);
    // Another tenant's correlation and trace ids are theirs, not yours.
    assert.equal(event.event.correlationId, null);
    assert.equal(event.event.traceId, null);
  });

  it('TWO SOCKETS SEE DIFFERENT PSEUDONYMS for the same tenant', async () => {
    // This is the anti-correlation property. If the pseudonym were global, two
    // visitors could compare notes and track a stranger across the world.
    const actor = await provisionViaApi(app, 'pseudo-target');
    const watcherA = await provisionViaApi(app, 'pseudo-a');
    const watcherB = await provisionViaApi(app, 'pseudo-b');

    const a = await connect(watcherA.apiKey);
    const b = await connect(watcherB.apiKey);
    for (const socket of [a, b]) {
      await socket.waitFor((m) => m.type === 'hello');
      socket.send({ type: 'subscribe', scope: 'world' });
      await socket.waitFor((m) => m.type === 'subscribed');
    }

    await fetch(`${baseUrl}/v1/records`, {
      method: 'POST',
      headers: { ...auth(actor.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'watched by two' }),
    });

    const seenByA = await a.waitFor(
      (m) => m.type === 'event' && m.event.action === 'record.create' && !m.event.isSelf,
    );
    const seenByB = await b.waitFor(
      (m) => m.type === 'event' && m.event.action === 'record.create' && !m.event.isSelf,
    );

    assert.equal(seenByA.event.id, seenByB.event.id, 'precondition: the same underlying event');
    assert.notEqual(
      seenByA.event.orgRef,
      seenByB.event.orgRef,
      'the same tenant must appear under unrelated names to different watchers',
    );
  });

  it('a pseudonym is STABLE within one socket, so a volume stays itself', async () => {
    const actor = await provisionViaApi(app, 'pseudo-stable');
    const watcher = await provisionViaApi(app, 'pseudo-stable-watcher');

    const socket = await connect(watcher.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'world' });
    await socket.waitFor((m) => m.type === 'subscribed');

    for (const title of ['one', 'two', 'three']) {
      await fetch(`${baseUrl}/v1/records`, {
        method: 'POST',
        headers: { ...auth(actor.apiKey), 'content-type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    }

    await new Promise((r) => setTimeout(r, 400));
    const refs = new Set(
      socket
        .of('event')
        .filter((m) => !m.event.isSelf && m.event.action === 'record.create')
        .map((m) => m.event.orgRef),
    );
    assert.ok(refs.size >= 1);
    assert.equal(refs.size, 1, 'one tenant must be one volume for the life of the socket');
  });
});

describe('live spine — motion is measurement', () => {
  it('every event carries real timings, and null where nothing measured one', async () => {
    const tenant = await provisionViaApi(app, 'timing');
    const socket = await connect(tenant.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'self' });
    await socket.waitFor((m) => m.type === 'subscribed');

    await fetch(`${baseUrl}/v1/records`, {
      method: 'POST',
      headers: { ...auth(tenant.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'timed' }),
    });

    const event = await socket.waitFor(
      (m) => m.type === 'event' && m.event.action === 'record.create',
    );

    // A real measured server duration, not a default.
    assert.equal(typeof event.event.durationMs, 'number');
    assert.ok(event.event.durationMs >= 0 && event.event.durationMs < 30_000);

    // occurredAt is the database's own commit-time value; publishedAt is when
    // the gateway received the notification. Both real, and ordered.
    const occurred = Date.parse(event.event.occurredAt);
    const published = Date.parse(event.event.publishedAt);
    assert.ok(Number.isFinite(occurred) && Number.isFinite(published));
    assert.ok(
      published >= occurred - 1_000,
      'fanout cannot precede the commit it was triggered by',
    );
  });

  it('the purge, which no request timed, reports durationMs as null rather than zero', async () => {
    // The distinction the render depends on: unmeasured is not instant.
    const { withTenant } = await import('../../dist/db/pool.js');
    const { expireTenant } = await import('../helpers/harness.js');
    const { runPurgeSweep } = await import('../../dist/worker/purge.js');

    const doomed = await provisionViaApi(app, 'timing-purge');
    const socket = await connect(null);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'world' });
    await socket.waitFor((m) => m.type === 'subscribed');

    await expireTenant(doomed.orgId);
    await runPurgeSweep({ trigger: 'scheduler' });

    const event = await socket.waitFor(
      (m) => m.type === 'event' && m.event.action === 'tenant.purge',
      { label: 'the purge event' },
    );
    assert.equal(event.event.durationMs, null, 'unmeasured must be null, never 0');
    void withTenant;
  });
});

describe('live spine — the event source cannot diverge from the audit trail', () => {
  it('every delivered event corresponds to a real audit row with the same id', async () => {
    const tenant = await provisionViaApi(app, 'no-divergence');
    const socket = await connect(tenant.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'self' });
    await socket.waitFor((m) => m.type === 'subscribed');

    await fetch(`${baseUrl}/v1/records`, {
      method: 'POST',
      headers: { ...auth(tenant.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'traceable' }),
    });
    await socket.waitFor((m) => m.type === 'event' && m.event.action === 'record.create');
    await new Promise((r) => setTimeout(r, 200));

    const log = await fetch(`${baseUrl}/v1/audit`, { headers: auth(tenant.apiKey) });
    const auditIds = new Set((await log.json()).events.map((e) => e.id));

    const delivered = socket.of('event').filter((m) => m.event.isSelf);
    assert.ok(delivered.length > 0);
    for (const message of delivered) {
      assert.ok(
        auditIds.has(message.event.id),
        `event ${message.event.id} has no audit row — the two sources have diverged`,
      );
    }
  });

  it('a rolled-back transaction emits NO event', async () => {
    /*
     * The reason the trigger is on the table rather than in the application:
     * NOTIFY is delivered only on commit. An application-side publish could
     * announce something that then rolled back — which is the P1 bug that
     * erased an audit row, in reverse.
     */
    const { pool } = await import('../../dist/db/pool.js');
    const tenant = await provisionViaApi(app, 'rollback');

    const socket = await connect(tenant.apiKey);
    await socket.waitFor((m) => m.type === 'hello');
    socket.send({ type: 'subscribe', scope: 'self' });
    await socket.waitFor((m) => m.type === 'subscribed');
    const before = socket.of('event').length;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.current_org', tenant.orgId]);
      await client.query(
        `INSERT INTO audit_event (tenant_id, action, outcome, actor, correlation_id)
         VALUES ($1, 'rolled.back', 'allowed', 'test', 'rollback-correlation')`,
        [tenant.orgId],
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    await new Promise((r) => setTimeout(r, 500));
    assert.equal(
      socket.of('event').length,
      before,
      'a rolled-back audit write must produce no live event',
    );
  });
});

describe('live spine — bounded and honest under failure', () => {
  it('caps concurrent connections from one address', async () => {
    const cap = Number(process.env.LIVE_MAX_CONNECTIONS_PER_ADDRESS ?? '4');
    let rejected = null;
    for (let i = 0; i < cap + 3; i += 1) {
      const client = await connect(null);
      // The rejection arrives immediately on the socket, before hello.
      await new Promise((r) => setTimeout(r, 30));
      const error = client.messages.find(
        (m) => m.type === 'error' && m.code === 'live.too_many_from_origin',
      );
      if (error) {
        rejected = error;
        break;
      }
    }
    assert.ok(rejected, `the per-address ceiling (${cap}) must engage`);
    assert.match(rejected.message, /Too many concurrent live connections/);
  });

  it('/health/ready reports the spine, and livePlaneAvailable reflects it', async () => {
    const response = await fetch(`${baseUrl}/health/ready`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.dependencies.liveSpine.ok, true);
    assert.equal(body.live.listenerConnected, true);
    assert.equal(body.livePlaneAvailable, true);
  });
});
