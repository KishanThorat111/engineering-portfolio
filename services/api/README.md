# services/api — the control plane

**Empty by design. Lands in Phase 1, and Phase 1 is gated on owner action.**

This directory has a specification (`docs/MASTER_IMPLEMENTATION_DOSSIER.md` §7) and a
blocker, not an absence of intent. The blocker is recorded in dossier §15: **the VM is the
owner's action and gates Phase 1.** Until a host exists, there is nothing here that could be
honestly said to run.

## What lands here

Fastify over PostgreSQL with row-level security, Redis for rate limits, idempotency keys,
presence and pub/sub fanout, a queue worker running the TTL purge under Postgres advisory
locks, OpenTelemetry emitting the spans that visitors walk, and a WebSocket gateway. Docker
Compose on a single VM behind a Cloudflare Tunnel, with Caddy terminating TLS.

## The property this service exists to hold up

The demonstration and the skill are the same object (dossier §1.3). A visitor is provisioned
as a real tenant, invited to attack it, and stopped by a real policy denial with a real audit
record. If any part of that is simulated, the entire portfolio is a claim rather than
evidence — which is the exact failure mode it was built to escape.

## The demo plane is labelled the demo plane

Dossier §7.4. This service is a physically separate database with no path to anything real,
and it says so, visibly. It is an exhibit inside a real estate, not a pretend production
system.
