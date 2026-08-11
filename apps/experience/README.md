# apps/experience — the live experience surface

React 19 + TypeScript + Vite, React Three Fiber, Zustand. Built to `/live/` in the
composed deployment artifact. Dossier §2, §3, §6.1.

**Not indexed.** The static surface is the SEO and machine layer (§6.2); this one
is the world. Two canonical copies of the same claims competing for the same
queries is the divergence rule 10 exists to stop.

## The rule this surface is built around

> If a visual could be produced without the backend being real, it is decoration
> and it is wrong. — dossier §1.3

Everything drawn here derives from an event that actually arrived. There is no
ambient traffic generator, no idle packet spawner, no synthetic tenant, and
nothing that exists because a frame looked empty. When the system is quiet the
world is quiet, and the document says so in words.

## Motion is measurement (§3.6)

| Drawn                     | Is                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Packet speed              | The event's real measured `durationMs`, log-compressed so a real system's range fits an eye's range         |
| Packet drawn **dashed**   | `durationMs` was `null` — unmeasured. Never drawn fast, because that would assert a latency nobody recorded |
| Volume brightness         | Real event rate, decaying on real elapsed time. A quiet tenant is genuinely dark                            |
| Membrane flare, cold cyan | A real policy denial from the control plane. Not hover, not proximity, not a timer                          |

Cyan is the isolation boundary and nothing else, whole surface (§3.4, locked).
It appears once in `shaders.ts` and is used by one material.

## Where events come from

Two modes, and the surface always knows which:

- **live** — `/v1/live`, subscribed to `world`.
- **replay** — after three failed attempts, `src/live/recorded-session.json`
  plays at the intervals it was captured with, behind a `REPLAY` badge that says
  when it was recorded.

That recording is **a real captured session** (A5), not authored fixtures: two
tenants provisioned and seeded, a cross-tenant break-out refused, the isolation
inspector, idempotent activation and its replay, duplicate-evidence rejection,
SQL-first routing and an escalation, rate-limit shedding, and the scheduled TTL
purge — 25 events over 62 seconds, 18 with real durations and 7 genuinely
unmeasured. `recording.ts` validates it at load and throws rather than degrade
into an empty world.

A quiet live plane is **never** topped up from the recording.

## Quality tiers (A8)

Keyed on **sustained** frame time, not a device probe: rolling p95 over 120
frames, downgrade on one bad window, upgrade only after four good ones plus a
cooldown. A mid-range phone holds 60fps for about ninety seconds and then
thermally throttles, so a tier chosen at load is right for the first minute of a
twenty-minute session and wrong for the rest. Downgrades are fast because being
one tier low is invisible; upgrades are slow because oscillation looks worse
than the lower tier.

Tier 3 full · tier 2 half-res bloom, no depth of field · tier 1 no post, reduced
counts, no atmosphere. The visitor is never asked (§11).

## Accessibility

The document is **not a fallback** — it is the authoritative reading, and the
canvas is `aria-hidden` because the text says everything the geometry does.
Real headings, a real event log, a polite live region announcing denials only,
skip link first in tab order, and full information with WebGL absent.

## Copy is data (A4)

Every visitor-facing string is in `src/content/copy.ts` and emitted as
`copy.json` at build. Minified JavaScript cannot be scanned for banned words —
bundled third-party code carries them as identifiers — so copy that reached the
build only as literals would ship past rule 5 unchecked.

## Verify it

```sh
npm run build            # both surfaces into the composed dist/
npm run verify           # every truth gate over that tree
npm run verify:render    # real browser: frames, tiers, reduced motion, degraded, a11y
npm run exp:dev          # local dev; VITE_LIVE_URL points at the Compose stack
```

`verify:render` is local-only for the same reason `cv:pdf` is: `playwright-core`
drives an installed browser and downloads none, so it never becomes a CI
dependency.
