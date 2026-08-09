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

## Running it locally

```sh
npm run api:up        # Postgres, Redis, and an OTel collector on loopback
npm run api:build
npm run api:migrate
npm run api:test      # 52 tests against a real database
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
