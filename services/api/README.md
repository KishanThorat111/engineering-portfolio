# services/api — the control plane

Fastify over PostgreSQL with genuine row-level security, Redis, a scheduled
purge worker, and OpenTelemetry. Runs on a single VM behind a Cloudflare Tunnel
with no inbound ports open. Dossier §7.

**This is the demo plane.** It is a physically separate database with no path to
any production system, it says so in its own provisioning response, and every
tenant it creates destroys itself on a TTL.

## The two isolation layers

Both are enforced on every tenant-owned query, and they are additive.

| Layer                    | Where       | What it is                                                                                                                                                                     |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server-derived org scope | Application | `tenant_id = $orgId`, where `orgId` comes from the verified credential and never from client input. The pattern the production KodSpot platforms run — ADR-0003.               |
| Row-level security       | PostgreSQL  | Policies on all five tenant-owned tables, `FORCE` enabled, enforced against a role with no `BYPASSRLS`. **The production platforms do not have this layer.** The demo adds it. |

That second sentence matters and is stated everywhere it could be misread —
including in the `/v1/tenants/me` payload, where P2's inspector reads it rather
than re-asserting it. The demo is stronger than the systems it demonstrates, and
saying so is the honest version of showing it.

The distinction is observable, not just documented:
`test/integration/tenant-isolation-rls-enforcement.test.js` removes layer 1 and
asserts the database still refuses. Every other isolation test passes if either
layer works, which is exactly how a broken policy hides for months.

## Cross-tenant capabilities

Exactly two, both `SECURITY DEFINER` functions with fixed signatures, neither
reachable from any route:

- `auth_resolve_credential(hash)` — authentication cannot scope itself to a
  tenant it has not identified yet.
- `lifecycle_due_tenants(limit)` — the purge worker needs ids of expired
  tenants. Having found one it scopes itself to that tenant and deletes _under
  RLS_, so a bug in the purge cannot reach another tenant's rows.

They are owned by `demo_definer`, a `NOLOGIN` role holding `BYPASSRLS` and
owning nothing else. `demo_app` — what the API and worker connect as — owns
nothing, cannot bypass RLS, and cannot alter the schema.

## The lifecycle

`provision → seed → operate → expire → purge`, and the purge is a **real
scheduled worker** (`src/worker/`), not an endpoint anyone calls. It runs on its
own timer, takes a Postgres advisory lock (`runExclusive`, mirroring ADR-0004),
and purges each tenant in its own transaction. Idempotent, atomic, and safe
against duplicate workers, restarts, and partial completion.

Dossier §7.2 is why this matters: one of the subject's published lessons is that
he documented a retention behaviour before automating it. Here the job exists
and runs.

**Audit rows survive the purge.** The tenant's data is destroyed; the record of
what happened to it is kept, because §2.8 and A14 have the visitor leaving with
exactly that.

`POST /internal/purge/run` exists for operating the thing and is blocked at
Caddy, guarded by a token, and calls the same sweep the scheduler calls. It is
not what proves the lifecycle.

## The five demonstrations (P2)

`GET /v1/demonstrations` is the unauthenticated catalogue: what each one proves,
the curl that reproduces it, and the mechanism behind it. Every one writes a
real audit row and emits a real OpenTelemetry span.

| #   | Demonstration            | Mechanism                                                                                                                                                                                                                                 |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Isolation break-out**  | 403 on a cross-tenant read, then `/v1/demos/isolation/inspect/:id` returns the live policy predicate from `pg_policies` and a real `EXPLAIN` plan with the policy inlined as a One-Time Filter.                                           |
| 2   | **Payments idempotency** | `INSERT ... ON CONFLICT DO NOTHING` on a unique constraint. Four simultaneous webhooks produce one activation and three counted replays. HMAC-SHA256 over the raw body, `timingSafeEqual`. Dual path: webhook and client-verify converge. |
| 3   | **Duplicate photo**      | SHA-256 with a per-tenant unique constraint. The image is never stored.                                                                                                                                                                   |
| 4   | **SQL-first AI routing** | A fixed intent table, each entry owning one hand-written parameterised statement. Matched → answered from SQL at zero tokens. Unmatched → escalates and decrements the budget. Exhaustion is a designed state, not an error.              |
| 5   | **Rate limiting**        | Redis-backed, keyed per credential, behind Cloudflare's edge limiter.                                                                                                                                                                     |

**The model plane is real but optional.** With `MODEL_API_URL`/`MODEL_API_KEY`
set it makes a real call. Without them it says so — the routing decision, token
accounting, span, and audit record are real either way, and the reply is
reported absent rather than invented.

**The take-away** (A14, §2.10): `POST /v1/receipt` issues a signed permalink
carrying the session's audit log, the predicate that blocked you, and the
reproduction commands. It is stateless, so it keeps rendering after the tenant
is purged. Email is opt-in behind a confirmation and is never the default path.

## Running it locally

```sh
npm run api:up        # Postgres, Redis, and an OTel collector on loopback
npm run api:build
npm run api:migrate
npm run api:test      # 103 tests against a real database
npm run api:down
```

The whole stack, in its production shape:

```sh
docker build -f services/api/Dockerfile -t control-plane-api:local .
docker compose --env-file infra/.env -f infra/compose.yml up -d
```

Nothing publishes a port. Reach it from inside the network the way the tunnel
does:

```sh
docker run --rm --network control-plane_edge curlimages/curl -s http://caddy/health/ready
```

## Deployment

`.github/workflows/deploy-api.yml`, manually dispatched. Builds and pushes to
GHCR, pins the image **by digest**, writes `infra/.env` over SSH, migrates,
rolls, health-checks, and rolls back automatically if the release does not
become ready. `workflow_dispatch` with `rollback: true` re-pins the previous
digest. Nothing is ever edited on the VM by hand.

Secrets live in GitHub Actions secrets and are written at release time — never
in git, never in the image. See `infra/.env.example` for the full list.
