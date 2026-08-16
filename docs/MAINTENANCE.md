# MAINTENANCE — running and operating this system

The runbook for the person on call, who is currently also the person who built
it. Written for the version of me who has not looked at this in six months.

**Authority:** this document describes operations only. It never overrides
`docs/MASTER_IMPLEMENTATION_DOSSIER.md`, and where an operational convenience
would weaken a gate or an honesty rule, the rule wins and the inconvenience
stands.

---

## 1. What is running

Three deployable things, two of which are the same artifact.

| Thing | Where it runs | What it is |
|---|---|---|
| Static surface | Cloudflare Workers static assets | `apps/static` → `dist/`. The SEO, machine and no-JS layer. Authoritative for every published claim. |
| Live surface | the same Cloudflare deployment, under `/live/` | `apps/experience` → `dist/live/`. WebGL. `noindex`. Degrades to a recording when the control plane is unreachable. |
| Control plane | one small VM, reached only through a Cloudflare Tunnel | `services/api` + PostgreSQL + Redis + a worker + an OTel collector, all under `infra/compose.yml`. |

**There is no inbound port on the VM.** `cloudflared` makes an outbound
connection and pulls requests in through Caddy. This is the single most
important fact about the deployment: if you ever find yourself opening a
firewall port to fix something, stop, because you are about to undo the design.

```
internet → Cloudflare (TLS, WAF, edge rate limiting) → tunnel → Caddy → api
                                                                        ├→ postgres  (internal network, no route off host)
                                                                        └→ redis     (internal network, no route off host)
```

---

## 2. Running it locally

### The fast path — static surface only

```bash
npm ci
npm run dev            # apps/static on :4321
```

### The full path — production-shaped

This is the primary integration environment, and it is deliberately the same
compose file the VM runs.

```bash
cp infra/.env.example infra/.env     # then fill in real local values
npm run stack:up                     # compose.yml + compose.local.yml
curl -s localhost:8080/health
npm run stack:down
```

`infra/compose.local.yml` publishes Caddy on **127.0.0.1:8080 only** and stubs
out `cloudflared`. It exists so the adversarial and load suites can attack the
real container behind the real Caddy config. It is never deployed — the deploy
workflow copies `compose.yml`, `Caddyfile` and `otel-collector.yaml` and
nothing else.

**`infra/.env` is gitignored and must stay that way.** No secret in this system
has ever been committed, and the deploy workflow writes the VM's `.env` over
SSH at release time rather than baking it into the image.

---

## 3. The gates, and what each one actually proves

Run everything before declaring anything done:

```bash
npm run verify        # typecheck, build, then seven offline gates over the BUILT artifact
npm run api:verify    # typecheck, build, 121 control-plane tests
```

| Command | Proves | Runs in CI |
|---|---|---|
| `npm run gate:copy` | banned words absent from built output, for people *and* machines | yes |
| `npm run gate:links` | every internal link resolves to a built file | yes |
| `npm run gate:html` | the markup validates | yes |
| `npm run gate:contrast` | WCAG contrast on the real token values | yes |
| `npm run gate:confidential` | the hospital is never named, clients never named | yes |
| `npm run gate:machine` | the machine layer and the human layer tell one story | yes |
| `npm run gate:fastlane` | the live surface is reachable and honestly described | yes |
| `npm run gate:headers` | regenerates `dist/_headers` from the built inline scripts | yes, inside `build` |
| Lighthouse CI | ≥95 perf/SEO/best-practices on Home and the flagship case study; **a perfect accessibility audit on every indexed route** | yes, enforcing |
| `npm run verify:render` | 35 browser checks: frames, quality tiers, reduced motion, degraded mode, a11y structure, CSP | **no — local only** |
| `npm run verify:adversarial` | 47 attacks against a running control plane, all refused | no — needs a stack |
| `npm run verify:load` | sustained concurrency, zero errors, limiter behaviour | no — needs a stack |

**Why three suites are not in CI.** `verify:render` needs a real GPU; a
software rasteriser would make every frame-time number describe the wrong
thing. The other two need a running control plane. Running them is a release
step, not a push step — see §7.

### Running the ones that need a stack

```bash
npm run stack:up
LIVE_API=http://127.0.0.1:8080 npm run verify:adversarial
LIVE_API=http://127.0.0.1:8080 npm run verify:load
LIVE_API=http://127.0.0.1:8080 npm run verify:render     # also runs the fusion checks
```

Provisioning is rate limited to 10/hour per address **by design**. If the
adversarial suite fails to provision, you have run it four times in an hour;
wait, do not raise the limit.

---

## 4. Deploying

### Static and live surfaces

Push to `main`. Cloudflare builds with `npm run build` at root directory `/`.
`dist/_headers` is regenerated by that build, so the security headers can never
go stale relative to the inline scripts they hash.

### Control plane

`.github/workflows/deploy-api.yml`, manually dispatched. It publishes an image,
ships the compose files, writes `.env` over SSH, and releases.

**Rollback:** dispatch the same workflow with mode `rollback`. The host records
the outgoing image in `.previous-image` *before* replacing it, so a release that
dies halfway is still reversible.

### Required `production` environment secrets

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_DB_PASSWORD`, `IP_HASH_PEPPER`,
`ADMIN_TOKEN`, `PAYMENT_WEBHOOK_SECRET`, `RECEIPT_SIGNING_KEY`,
`CLOUDFLARE_TUNNEL_TOKEN`.

Eight. There is **no registry credential**: the VM authenticates to GHCR with
the deploy job's own `GITHUB_TOKEN`, which is minted for that run, carries
`packages: read`, and expires with the job.

Generate each from base64url or hex. The env heredoc in the workflow is
unquoted, so a value containing `$`, a backtick or `$(…)` would be expanded or
executed rather than written literally.

### Required `production` environment variables

One required:

```
API_PUBLIC_URL=https://kishanthorat.com
```

It is the origin the deploy workflow fetches `/health` from after the release,
through Cloudflare — the step that distinguishes "the container is healthy" from
"the deployment is reachable". It is the production hostname, not an `api.`
subdomain: the live surface calls the control plane same-origin, and a separate
host would be refused by the `/live/*` CSP and by the absence of CORS headers.

Optional: `TENANT_TTL_SECONDS` (default 1800), `PURGE_INTERVAL_MS`
(default 15000).

The GCP project, zone, instance, Workload Identity provider and deployment
service account are written literally in the workflow. None of them authorises
anything — the federation trust policy does, and it is bound by attribute
condition to this repository — so keeping them in source makes the deployment
reviewable in a pull request instead of hidden in a settings page.

**There is no SSH key secret and no GCP service-account key.** The deploy job
authenticates with GitHub OIDC through Workload Identity Federation and reaches
the VM over an IAP tunnel with OS Login, so every credential it holds is minted
per run and expires with it. `VM_HOST`, `VM_USER`, `VM_SSH_KEY` and
`VM_SSH_KNOWN_HOSTS` were removed when that path replaced raw SSH.

---

## 5. Routine operations

**Is it alive?**

```bash
curl -s https://<origin>/health          # liveness — answers even while throttled
curl -s https://<origin>/health/ready    # readiness — actually touches Postgres and Redis, 503 if either is down
```

`/health` is deliberately exempt from rate limiting. Throttling the
truth-teller would make the system least honest exactly when it is least
healthy.

**Tenant lifecycle.** Every demo tenant carries a TTL (`TENANT_TTL_SECONDS`,
1800 in production shape). The worker polls every `PURGE_INTERVAL_MS` and
destroys what is due. Purging is a real scheduled job, not a cron entry someone
remembers to add — if tenants are accumulating, check the worker container
first.

**Forcing a purge** (debugging aid, not routine):

```bash
# from ON the VM only — /internal/* is 404'd at Caddy, and the token is the
# second lock rather than the first
docker compose exec api curl -s -XPOST localhost:8080/internal/purge/run \
  -H "x-admin-token: $ADMIN_TOKEN"
```

**Reading telemetry.** Spans go to the OTel collector container. `OTEL_ENABLED`
turns it off without touching code if it is ever the thing that is broken.

---

## 6. When something breaks

**The live surface shows REPLAY.** That is the system working. The control
plane is unreachable and the surface says so rather than pretending. Check, in
order: the `api` container, the tunnel, then Cloudflare status. Do not "fix" it
by hiding the badge — principle 12 is that liveness is never faked.

**The API returns 5xx.** Caddy is configured with `fail_duration 10s` and
returns a real 5xx rather than a body that could be mistaken for health.
`docker compose logs api --tail=200`. If Postgres is the cause,
`/health/ready` will already be saying 503.

**Everything is 429.** Expected under load: the limiter is 120/minute per
credential. Confirm with `x-ratelimit-limit` on any response. If legitimate
traffic is being throttled, the fix is Cloudflare edge rate limiting doing more
work, not raising this number — this limiter is the last line, not the first.

**The database is full.** Demo tenants are small and purged on TTL, so growth
means the purge worker has stopped. Check the worker, then
`lifecycle_due_tenants()` for a backlog.

**Rotating a secret.** Update the GitHub secret, re-dispatch the deploy. The
`.env` is rewritten on every release, so there is no drift to reconcile. Note
that `IP_HASH_PEPPER` rotation invalidates existing IP hashes by design.

---

## 7. Release checklist

1. `npm run verify` and `npm run api:verify` — green.
2. Remote CI green, verified **at step level**, not just the badge.
3. `npm run stack:up`, then the adversarial, load and render suites.
4. Deploy the control plane; confirm `/health/ready` from outside.
5. Push the surfaces; confirm the deployed origin actually serves the new
   build — CI proves the artifact, only a fetch proves it is reachable.
6. Check `_headers` arrived: `curl -sI https://<origin>/ | grep -i content-security`.

---

## 8. Quarterly

- **External links.** `profile.links` points at LinkedIn and GitHub, which are
  somebody else's to serve and are deliberately not gate-checked. Open them.
- **Date qualifiers.** Every published number carries "as of <date>" (rule 2).
  Numbers do not expire, but their qualifiers get old and start to mislead.
  Re-read them and update the dates or remove the claims.
- **Dependencies.** `npm audit`; update deliberately. If dependencies change,
  **delete `node_modules` and the lockfile, install fresh, and verify `npm ci`
  reproduces on Linux** — a Windows-only success is not sufficient and has
  broken CI twice (the `@emnapi/runtime` incident, `docs/PHASE_LOG.md`).
- **Cloudflare edge.** Confirm WAF and edge rate limiting are still configured;
  they are console-side settings and are not in this repository.

---

## 9. What this document does not claim

Honesty applies to the runbook too.

- **The Cloudflare WAF and edge rate limiting are configured in the Cloudflare
  console, not here.** They are part of the design (dossier A13) and are not
  reproducible from this repository. Until they are configured on a real zone,
  the edge tier of the defence is a plan, not a fact.
- **Load numbers in `verify:load` are a ceiling for the machine that ran them**,
  with the generator sharing a CPU with the service. They are not a production
  capacity prediction, and no production capacity figure is published anywhere.
- **The mid-range-device frame budget has not been measured on a mid-range
  device.** `verify:render` measures a real GPU — the one in the machine that
  ran it. The dossier §11 claim of 60fps on a mid-range device at tier 2
  remains unverified, and is recorded as outstanding rather than asserted.
- **No production incident has been handled with this runbook**, because the
  control plane has not yet been deployed to a real VM. The procedures follow
  from the compose files and the workflow; they are not yet battle-tested, and
  the first real incident should be used to correct this document.
