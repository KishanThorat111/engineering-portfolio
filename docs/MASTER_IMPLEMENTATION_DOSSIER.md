# MASTER IMPLEMENTATION DOSSIER

**Project:** A live, interactive digital experience demonstrating production engineering
**From:** Product Architect
**To:** Lead Implementation Engineer (Claude Code)
**Status:** Single source of truth for the remainder of the project. Supersedes nothing; sits above everything.
**Repository:** `KishanThorat111/engineering-portfolio`
**Live today:** `portfolio.kishanthorat.workers.dev`

---

## HOW TO USE THIS DOCUMENT

You are about to spend a long time building something. This document is everything I learned designing it, written so you do not have to rediscover it.

Read it completely before touching code. It is long because the reasoning matters more than the instructions — an engineer who understands *why* makes correct decisions in situations I failed to anticipate, and an engineer who only has instructions does not.

Sections 1–4 are the product. Sections 5–8 are the architecture and the reasoning behind it. Sections 9–13 are the principles that constrain every decision. Section 14 is how I expect you to think. Section 15 is addressed to you directly, and contains your first task.

Store this file at `docs/MASTER_IMPLEMENTATION_DOSSIER.md`. Every phase prompt will assume you have read it.

---

# PART I — THE PRODUCT

## 1. What we are building

### 1.1 The one-sentence version

**A visitor is provisioned as a real tenant inside a real running system, invited to attack it, stopped by real defences, and shown exactly why — rendered in a live spatial environment where every visual is driven by real telemetry.**

### 1.2 The problem this solves

The subject is a software engineer who designs, builds, and personally operates multi-tenant SaaS platforms. One is in daily production at a hospital. One is live with subscription billing. One is pre-launch. Alongside that, he delivers enterprise AI workflow automation for a UK client.

His problem is structural, not presentational. His strongest work is private — it lives in closed repositories, behind NDAs, inside a hospital. His public evidence is weak by comparison. A skeptical CTO reading his CV and then checking his public footprint concludes the CV is inflated, when the truth is the exact opposite.

Every portfolio in existence responds to this problem by making claims. Claims cost nothing to make, so they transfer no confidence. The entire hiring apparatus — interviews, take-homes, reference checks — exists precisely because portfolios are assertions.

**Our response: where code must stay private, behaviour can be public.** You cannot show the hospital's codebase. You can build a system that *behaves* the way that codebase behaves, hand the visitor the controls, and let them verify it themselves.

### 1.3 What makes it unfakeable

This is the load-bearing property of the entire project. Protect it above all else.

A designer can build a beautiful animation of a request being blocked. They cannot build a system that actually blocks a request, logs it, and shows you the query plan — because to build that, you must already be able to ship multi-tenant isolation, idempotent payments, hash-based fraud detection, cost-routed AI, and rate limiting.

**The demonstration and the skill are the same object.** An AI cannot generate this from a prompt. A design agency cannot produce it. A stronger engineer with no operational experience cannot produce it. That is the moat, and every implementation decision must preserve it.

**Corollary — the rule you will apply hundreds of times:** if a visual could be produced without the backend being real, it is decoration and it is wrong. If it can only be produced because something really happened, it is evidence and it is right.

### 1.4 What success looks like

Success is a sentence a visitor says to another person, unprompted, months later:

> *"I tried to break into another tenant on his portfolio. It stopped me. Then it showed me the audit log entry for my own attempt."*

Nobody has ever said that sentence. If people remember this as "a portfolio," we failed. If they remember it as "something I have never experienced before," we succeeded.

### 1.5 Who it is for

**Primary — the technical hiring authority.** CTO, VP Engineering, founding engineer at a product SaaS company, UK-focused. Skeptical, time-poor, allergic to marketing. Spectacle-resistant by training: the more impressive the presentation, the more they suspect the presentation *is* the product. They will spend twenty minutes if the first ten seconds earn it.

**Secondary — recruiters.** Ninety seconds. Need role, stack, evidence, location, availability. Served by the static fast lane, not the experience. This is a design decision, not a compromise (§6.2).

**Tertiary — AI screening agents.** A growing share of first "visits" are automated. Served by a structured machine layer that provably cannot diverge from the human pages.

---

## 2. The experience, beat by beat

This is the approved emotional and cinematic design. It is locked. You implement it; you do not redesign it.

### 2.1 The five-beat arc

| Beat | Feeling | What happens |
|---|---|---|
| **Arrival** | Curiosity | A room lighting up because you walked in |
| **Recognition** | Orientation | "This is real, and other people are in it right now" |
| **Ownership** | Investment | Your tenant ignites, carries your ID, responds to you |
| **Confrontation** | The peak | You attack. You are stopped. You are logged. |
| **Consequence** | The ache | Your tenant expires on a real TTL and goes dark |

The final beat is what converts a demo into a memory. It ends, and the visitor watches it end.

### 2.2 Arrival (0–3s)

Black. No spinner, no logo, no loading bar.

A single line of monospace text resolves the visitor's actual edge PoP and round-trip time. Then the TLS handshake. Then `provisioning tenant…`, and a real tenant ID lands. These numbers are real and specific to that visitor.

Geometry begins assembling out of the dark, its timing driven by the visitor's actual handshake latency. **The site renders its own request.** This is the first proof, delivered before the visitor has scrolled anything.

### 2.3 Recognition (3–8s)

The camera pulls back. The visitor is inside a volumetric lattice with three planes — edge, application, data — with real depth and scale.

It is already busy. Light moves through it because other people are genuinely present. Distant tenant volumes: bright where active this second, dim where recent, dark where expired. **The visitor can see multi-tenancy**, not read about it.

### 2.4 Ownership (8–12s)

One volume near the camera ignites, carrying the visitor's tenant ID. Seeding it flows rows in as light; the volume densifies. Real inserts, real latency, rendered.

Nobody has given this visitor a piece of their infrastructure before.

### 2.5 Confrontation — the peak

The interface offers another tenant's ID and a live API console. **It does not instruct.** It invites, and says nothing more. A visitor who *chooses* to attack owns the memory of being stopped.

The choreography is cinematic and precisely timed:

1. The request travels through the lattice toward the other tenant's volume
2. **Time dilates** as it approaches the boundary — everything else slows
3. **Impact.** The isolation membrane flares cyan and holds. `403`
4. **Silence and stillness for one beat.** Nothing moves
5. The world resumes at normal speed
6. ~200ms later an audit pulse returns to the visitor's own volume

*Slow, stop, hold, resume.* That is the shape of a moment people describe to other people.

Then — and this is what elevates it from theatre to explanation — the visitor can **peel the membrane open** and see the actual row-scope predicate, the real query plan, and the branch that returned 403, with their own attempted query beside it. Not a diagram of isolation. The mechanism itself.

### 2.6 The four stations

Each is a real capability, exposed as something the visitor can attempt to defeat. All directly addressable by URL (§2.9).

**Payments — idempotency.** Fire the webhook twice, simultaneously. Two packets race. One activates, one no-ops. Open the idempotency key that decided it.

**Fraud — duplicate detection.** Upload the same photo twice. Watch the hash collide and the second submission get rejected.

**AI cost — SQL-first routing.** Ask an operational question. Watch the packet never leave the data plane — answered by SQL at *zero model cost*. Then ask something SQL cannot handle: watch it escalate to the model plane and the token budget decrement in real time.

**Limits — rate limiting.** Hammer an endpoint until throttling engages and the visitor watches their own request shed.

Every action emits a real trace, walkable.

### 2.7 The scale reveal

Zoom out. The system the visitor has been playing inside resolves into **one node of four** — beside the hospital platform, the menu platform, the electrical platform.

The thing they just tried to break is the smallest of them.

The other three carry real signals where permission allows, and are explicitly *not* attackable. The contrast is the point: *this one is yours to break; those three are load-bearing and I am not letting you near them.*

### 2.8 The record and the exit

Any node opens into its case study — but the visitor reads the disclosed limitations *after* having operated the system. "No automated test suite" lands differently once you have been inside.

Then the visitor's tenant purges on a real TTL, executed by a real scheduled job. They watch the countdown. They can request their session's audit log by email — and leave with a trace of their own attempted break-in sitting in their inbox.

### 2.9 Access over ceremony

The arc is for first-time visitors. It must never become a toll booth.

- Every station is **directly addressable by URL**
- The cold open plays **once per visitor**, then never again
- Returning visitors land in the world already provisioned
- Any moment must be shareable as a link that opens *there*

### 2.10 What the visitor takes away

Not a feeling and an email. Something real and reproducible:

- Their session's audit log
- The actual predicate that blocked them
- **A working `curl` command** that reproduces the isolation failure against the live demo API

Shareable, pasteable, verifiable by a colleague who never visits the site.

---

## 3. The visual and sensory language

Locked. Implement faithfully.

### 3.1 The world

**Not a dashboard. Not space. A structure at night that someone is still awake inside.**

The governing image is an operations floor after hours — the one person still on call, systems humming, the quiet competence of a place that works because someone is watching it. Warmth in a cold room. Order under load. Evidence of care.

This is what makes it *his* rather than a template with a name on it.

### 3.2 Aesthetic register: operational evidence, not sci-fi glass

**This is a correction made during design review and it is important.** Volumetric glowing shapes in darkness is the visual language of every AI product since 2023. It is genre, and genre is forgettable.

The world is built from **the aesthetic of operational documents** — the visual language of runbooks, query plans, audit rows, terminal output — rendered with real depth and real light, but never glowing for its own sake.

**Restraint is the differentiator.** A world made of *evidence* rather than *effects* is one no design team would produce, because only an operator would think of it.

### 3.3 Materials

One idea: **glass under stress.**

- Tenant volumes are thin translucent shells with refraction and interior light
- Load raises their internal temperature
- The isolation membrane is **invisible until struck** — a soap-film interference shimmer, iridescent, flaring only on contact
- Data is light in glass, not particles on black

### 3.4 Palette

| Token | Meaning | Notes |
|---|---|---|
| Deep blue-slate | The dark | Not black. 4am, not outer space. |
| Accent green | **Things working** | Healthy load, successful traces, live systems. Inherited from the existing site. |
| Amber | Caution, pre-launch | |
| **Cold electric white-cyan** | **The isolation boundary — nothing else, ever** | One colour, one meaning, whole experience. When you see it, you are being stopped. |

The membrane is the only cold light in a warm world. It should feel slightly unwelcoming, because it is refusing you.

### 3.5 Typography

Monospace throughout, rendered **in the world** — labels floating in depth beside volumes, telemetry ticking on the edge plane. Text is part of the machine, not a layer on top of it.

### 3.6 Motion language

**Motion is measurement.** This is the rule that makes motion unfakeable:

- Packet speed **is** latency — a slow request looks slow because it *was* slow
- Brightness **is** load
- The membrane flare **is** the policy denial

Nothing is eased for prettiness. The easing carries data.

**Idle is alive.** Untouched, the world drifts, breathes, flickers with other people's traffic. It is never waiting for you.

**Latency becomes atmosphere.** While a real query runs, the world holds its breath — a subtle tension that resolves on response. Waiting stops being dead time and becomes drama.

### 3.7 Lighting

**Everything is lit from within.** No sun, no key light. The only illumination is the system's own activity.

**Load is light.** A busy system is a bright one — not as metaphor, but because the render reads real telemetry. When idle, the world is genuinely darker.

Bloom and volumetrics: restrained. Light scatters through the lattice so distance reads as haze. Depth of field keeps focus where the story is.

### 3.8 Camera and cinematics

**One continuous take.** No cuts, no page transitions, no loading screens. The camera moves and the world reorganises. One unbroken shot from arrival to exit — that alone places it outside the category of "website."

**The camera has weight.** Slight lead-in and settle. Never linear. Never snappy. It behaves like a physical rig, not a lerp.

### 3.9 Interaction philosophy

**Invite, never instruct.** No tooltips, no onboarding, no "click here."

**Every input has physical consequence.** Nothing is a button that changes a state. Firing a webhook launches an object that travels and arrives. Cause and effect are visible in space.

**The system responds before it confirms.** Optimistic light leaves the moment you act; truth arrives when the span does. If reality contradicts, the world corrects visibly — which is itself honest.

### 3.10 Sound (optional, off by default)

One unobtrusive control. Not music — **room tone**: the low hum of a machine floor, so quiet you notice only when it stops.

Interactions are physical, not UI-chirpy.

The peak beat is where sound earns its place: the hum drops to near-silence on impact with the membrane, holds, and returns. **Silence is the most memorable sound available, and it is free.**

### 3.11 Identity

**The subject's name appears once, quietly, and never again.** The world is the introduction. The final frame, after the tenant purges, is the only place the claim is stated — and by then the visitor does not need convincing.

The signature that makes it unmistakably his: the world is built out of the actual patterns he works in. It could not be rebuilt by someone who does not operate systems, because there would be nothing real underneath to render.

---

## 4. The story

A design review by an imagined panel (§16.4) surfaced a flaw worth stating explicitly, because it changes how you implement several things.

**The protagonist is not the system. The protagonist is the engineer who is not in the room.**

Nobody retells a story about infrastructure. But "someone was here before you, and thought about this" is a story.

Every defence the visitor hits was a decision someone made at some hour. The world carries that evidence:

- The audit log the visitor lands in is **his** audit log, with his prior decisions in it
- The thing that blocks them **has an author**
- The predicate they peel open was written by a person, and reads like it

The emotional register shifts from *impressive machine* to *someone was here, and cared*. That costs nothing architecturally and changes everything about how it feels.

---

# PART II — THE ARCHITECTURE

## 5. System overview

```
                    ┌─────────────────────────────────┐
                    │         Cloudflare              │
                    │  DNS · CDN · WAF · DDoS         │
                    └───────┬─────────────────┬───────┘
                            │                 │
              ┌─────────────▼──────┐   ┌──────▼────────────────┐
              │  Workers Static    │   │  Cloudflare Tunnel    │
              │  Assets            │   │  (no inbound ports)   │
              │                    │   └──────┬────────────────┘
              │  apps/static       │          │
              │  (Astro)           │   ┌──────▼────────────────┐
              │                    │   │      THE VM           │
              │  fast lane         │   │                       │
              │  SEO surface       │   │  Fastify (services/   │
              │  machine layer     │   │           api)        │
              │  fallback          │   │  PostgreSQL + RLS     │
              └────────────────────┘   │  Redis                │
                                       │  Queue worker         │
              ┌────────────────────┐   │  OpenTelemetry        │
              │  apps/experience   │◄──┤  WebSocket gateway    │
              │  React + R3F SPA   │   │                       │
              └────────────────────┘   │  Docker Compose       │
                                       │  Caddy (TLS)          │
                                       └───────────────────────┘
```

## 6. Frontend architecture

### 6.1 The experience app

| Concern | Decision |
|---|---|
| Framework | React 19 + TypeScript strict + Vite |
| 3D | React Three Fiber + drei |
| Shaders | Custom GLSL — isolation membrane, volumetric light, packet field |
| Instancing | Instanced rendering for tenant volumes and packets |
| Choreography | GSAP for camera and beat timing |
| State | Zustand |
| Quality | Three adaptive tiers with automatic downgrade |

**60fps on a mid-range device is a budget, not an aspiration.**

### 6.2 Two surfaces, and why that is not a compromise

The static Astro site survives as the fast lane, SEO surface, machine layer, and fallback.

This was challenged in review — "you have admitted the experience is not for the people you are trying to reach." **Rejected, and here is the reasoning you should internalise:** the ninety-second recruiter is not the audience for the experience; they are the audience for the fast lane. Having both is correct architecture, not an apology. A single surface that tried to serve both would serve neither.

**One truth, two renderings.** Both generate from one content source. They cannot disagree — a CI gate enforces it.

### 6.3 Degradation is designed, not accidental

Live plane down → the experience plays **recorded real traces** and says so plainly.

Honesty is the constitution, and it applies to the site's own health. Never fake liveness. A visitor who discovers the "live" system was a canned animation has learned the opposite of what we intended.

## 7. Backend architecture

### 7.1 The control plane

| Component | Choice | Reasoning |
|---|---|---|
| HTTP | **Fastify** | The site must be built in his own stack. That is part of the proof. |
| Database | **PostgreSQL with genuine RLS** | Row-level security enforcing tenant scope — real isolation, not application-layer filtering |
| Cache/limits | **Redis** | Rate limiting, idempotency keys, presence, pub/sub fanout |
| Realtime | **WebSocket gateway** | Live telemetry to connected clients |
| Jobs | **Queue worker** | TTL purge under Postgres advisory locks — his own resilience pattern |
| Telemetry | **OpenTelemetry** | The traces visitors walk are **real spans**, not animations of imagined ones |
| Runtime | Docker Compose | |
| CI/CD | GitHub Actions → VM | |
| TLS | Caddy | |

### 7.2 The tenant lifecycle

Provision on arrival (real row, real API key, real scoped data) → seed → operate → **purge on TTL by a real scheduled job**.

**Note the loop this closes.** One of the subject's published lessons is that he documented a data-retention behaviour before automating it — the purge existed in docs and schema, but no job ever ran it. Here, the purge *is* a real job. The lesson becomes operational rather than merely disclosed. Protect this; it is one of the most meaningful details in the project.

### 7.3 Security — we are inviting attack

- The demo plane is a **physically separate database** with no path to anything real
- Fixed endpoint surface — **no arbitrary SQL execution**, ever
- Size-capped uploads
- Per-IP and per-tenant rate limits
- Circuit breakers
- The demo database can be dropped and rebuilt in under a minute
- **The VM sits behind a Cloudflare Tunnel — no inbound ports open**

The attack surface *is* the demo. That is intentional, and it is why the isolation must be genuine rather than simulated.

### 7.4 The terrarium problem — and its resolution

Review raised the sharpest objection in the project: *"Every number Cloudflare Radar renders belongs to the real world. Every number you render is generated by the visitor's own clicking, in a sandbox that touches nothing real. Your world is a terrarium — it looks like production and it is a toy, and any engineer sharp enough to matter will notice within ninety seconds."*

**This is correct, and the fix is not more realism. It is honesty as a design feature.**

- The demo plane is **labelled the demo plane**, visibly and proudly
- It sits inside a world where the other three volumes carry **real signals from real systems**
- The contrast becomes the point

The terrarium stops pretending and becomes an exhibit inside a real estate. **Never let the implementation drift back toward pretending.**

---

# PART III — THE PRINCIPLES

## 8. Honesty principles (highest authority)

These override everything, including the experience. If an experience decision and an honesty principle conflict, honesty wins and you escalate.

1. **Every published claim traces to a source document.**
2. **Every figure carries the date it was true.** A number without its qualifier is a claim about today.
3. **Every system discloses at least one honest limitation.**
4. **Unknown facts are unstated — never estimated, never placeholdered.** Unpublished figures are unpublished, not zero.
5. **Banned words never ship.** Enforced by CI against built HTML.
6. **Engineer, never founder.** The subject is presented exclusively as an engineer. Never founder, CEO, owner, sole proprietor, startup, entrepreneur.
7. **The hospital is never named.** Approved phrasing: "a NABH-accredited hospital." No customer names. No tenant counts, user counts, revenue, or uptime figures — they do not exist in evidence.
8. **Client work is described at CV level and never beyond.** Enforced by a build gate.
9. **No placeholder content ships.**
10. **Machine and human layers generate from one source and cannot disagree.**
11. **The demo is labelled as a demo.** Never implies production.
12. **Liveness is never faked.** Degraded means degraded, and says so.

**These are enforced by CI gates, not by intention.** The build fails if they are violated. Never weaken a gate to make a build pass. If a gate is awkward, fix the code or the gate's path handling — never its strictness.

**A rule may be moved to where the data model puts it. A rule may never be loosened.** When you change a schema constraint, state in the commit body which case it is.

## 9. Engineering principles

1. **Never patch the lockfile incrementally.** Dependencies change → delete `node_modules` and the lockfile, install fresh, verify `npm ci` reproduces the tree. *(This rule exists because an incrementally-built lockfile passed local installs and broke CI — local green proved the source was correct, not that the lockfile was complete.)*
2. **Read the artifact in front of you, not your memory of it.** Read the installed library's own types and schema before writing against its API. *(This rule exists because a major version shipped a different validation library than assumed; reading the installed types caught it before it caused failures in several places at once.)*
3. **Verify against built output, not source.** What shipped is the only thing a reader sees. *(This rule exists because markers that were correct in source vanished from built HTML.)*
4. **A phase is complete when remote CI is green** — verified at step level, not by the run's overall conclusion.
5. **Prove claims by breaking things.** Deliberately violate the rule, observe the failure, revert uncommitted. Every gate in this repository was proven this way.
6. **A gate that silently checks nothing is worse than one that fails.** Gates should fail loudly when their target disappears.
7. **Reachability and correctness are different claims.** CI proves the artifact; only a network fetch proves it is reachable. *(This rule exists because a deploy target that did not exist passed every gate.)*
8. **Read an error as evidence about the artifact it names**, not about the nearest familiar-looking cause. *(This rule exists because a misdiagnosis was pushed, failed identically, and had to be corrected in the git history.)*
9. **No refactors of shipped phases except defect fixes.**
10. **Every new dependency justified in the commit body.**
11. **Conventional commits. Append-only phase log — corrections are new entries, never edits.**
12. **When you cannot meet an acceptance criterion, stop and report.** Do not work around it.

## 10. Experience principles

1. **Unfakeable over impressive.** If it could exist without the backend being real, it is wrong.
2. **Motion is measurement.** Never ease for prettiness.
3. **Invite, never instruct.**
4. **Access over ceremony.** Everything directly addressable; cold open once per visitor.
5. **The visitor leaves with something reproducible.**
6. **The author is present in the world.**
7. **The block is inspectable** — the mechanism, not a diagram of it.
8. **One continuous take.** No page transitions, no loading screens.
9. **Idle is alive.**
10. **Restraint over spectacle.** Evidence, not effects.

## 11. Performance principles

| Budget | Target |
|---|---|
| Frame rate | 60fps mid-range device, tier 2 quality |
| Static page weight | < 90KB gz excluding images and fonts |
| Static client JS | < 15KB gz |
| LCP (static) | < 1.8s on mid-range mobile, 4G |
| CLS | < 0.05 |
| INP | < 200ms |
| Accessibility | WCAG 2.2 AA |

- Adaptive quality tiers with **automatic** downgrade — never ask the user to choose
- `prefers-reduced-motion` collapses all transform animation to opacity/instant
- Reduced motion is invisible to every gate — **verify it by execution, in the conditions it claims to handle**
- The static surface's budgets are already met and must never regress

## 12. What is locked vs. flexible

### 12.1 LOCKED — never change without explicit owner approval

- The five-beat emotional arc and its order
- The break-out moment as the peak, including its choreography (slow, stop, hold, resume)
- The five demonstrations and what each proves
- Motion is measurement
- The palette's semantics — especially cyan meaning isolation-boundary and nothing else
- Operational-evidence register, not sci-fi glass
- One continuous take
- Two surfaces: experience + static fast lane
- The demo plane being labelled as a demo
- The tech stack: React, R3F, GSAP, Zustand, Fastify, PostgreSQL with RLS, Redis, OpenTelemetry, Docker, Cloudflare Tunnel
- All twelve honesty principles
- The phase order in §13

### 12.2 FLEXIBLE — your judgement, and I want your judgement

- Every implementation detail inside the above
- File and module organisation
- Component decomposition
- Shader technique, provided the visual outcome matches
- Rendering optimisation approach
- Which specific libraries within an approved category
- Testing strategy and framework
- Database schema shape, provided RLS is genuine
- API surface design, provided it is fixed and safe
- Error handling patterns
- Instancing, batching, LOD, culling strategy
- Build tooling improvements
- CI structure improvements that do not weaken gates

### 12.3 The distinction, stated plainly

**Product decisions are mine. Implementation decisions are yours.**

If it changes what the visitor experiences → mine. If it changes how that experience is produced → yours, and I want you exercising it aggressively.

## 13. Phase roadmap

Nine phases. Each ships independently, leaves the repository production-safe, and is reviewable before the next.

| Phase | Name | Delivers | Done when |
|---|---|---|---|
| **P0** | Foundation split | Monorepo: `apps/static`, `apps/experience`, `services/api` | Existing site deploys from new structure; build output byte-identical; all gates green |
| **P1** | Control plane | VM, Postgres + RLS, Redis, Fastify, Docker, CI/CD, Tunnel, tenant provisioning + TTL purge | Tenant provisionable and purgeable via curl; purge proven by a real scheduled job |
| **P2** | Proof engine | All five demonstrations as real endpoints emitting real OTel spans and audit records. Headless. | Each provable by curl; each writes an auditable trace; break-out demonstrably fails |
| **P3** | Live spine | WebSocket telemetry, presence, event fanout | Two browsers see each other's events in real time |
| **P4** | Render layer | R3F scene, lattice, volumes, packets, camera, shaders — against fixtures | 60fps mid-range at tier 2; quality tiers verified |
| **P5** | Fusion | Render wired to live telemetry. Cold open, provisioning, break-out, four stations | Every visual state traces to a real backend event |
| **P6** | Estate and record | Four-system zoom-out, case studies in context, honest health | |
| **P7** | Fast lane and machine layer | Static surface reconciled, SEO, no-JS, low-power, agent layer | |
| **P8** | Hardening and launch | Adversarial and load testing, WAF, Lighthouse enforcing, accessibility, domain, runbook | |

**Sequencing rationale:** backend before frontend, because the frontend renders real data and building it against imagined data would produce a beautiful thing wired to nothing. Fixtures in P4 are a deliberate decoupling so render work is not blocked on telemetry, and P5 is the explicit integration phase where every fixture is replaced by a real event.

---

# PART IV — HOW TO WORK

## 14. Implementation philosophy

### 14.1 How I expect you to think

**Like a Principal Engineer who has inherited a system they will own for years.** Not like a contractor completing tickets. You will find things I got wrong. Say so.

**Read before you write.** Read the repository, the existing gates, the phase log. The gates encode lessons that were learned expensively.

**Prove, do not assert.** Every claim in the phase log of this project is backed by a demonstration. Continue that. "The gate works" is not a statement; "I injected a violation, it failed with this output, I reverted uncommitted" is.

**Be suspicious of your own success.** When something passes on the first try, ask what it would look like if the check were silently doing nothing.

**Escalate rather than improvise.** If an instruction conflicts with a principle, or with reality, stop and report. Silent adaptation is the failure mode that destroys projects like this.

### 14.2 Optimise for

- **Truthfulness of the artifact** — above all
- Maintainability by one person, part-time, for years
- The unfakeability property (§1.3)
- Frame rate on mid-range devices
- Reviewability — the repository is itself an exhibit; its history, CI, and docs will be read
- Failure legibility — errors should name the artifact and the reason

### 14.3 Never optimise for

- Lines of code, or cleverness
- Visual impressiveness at the cost of truth
- Premature abstraction — three workspaces with genuinely different targets do not need a shared base config yet
- Speed at the cost of a gate
- Novelty for its own sake

### 14.4 When you are uncertain

| Situation | Action |
|---|---|
| Implementation detail unclear | **Decide.** Document the decision in the phase log. |
| Product/experience decision unclear | **Stop and ask.** Never invent product. |
| A fact is missing | Insert `<!-- OWNER-INPUT: what is needed -->`, halt that block, log it. **Never invent a fact.** |
| Repository contradicts the prompt | **Stop.** Produce a difference report. Wait. |
| A principle conflicts with an instruction | **Stop.** The principle wins pending clarification. |

## 15. Known open items

These are unresolved and must not be guessed at.

- **Hospital telemetry permissions.** What live, aggregated, non-PII signals from the hospital deployment may be published is unanswered. Until answered, the estate layer shows only already-published facts for the hospital and menu platforms. The portfolio's own system is fully live from day one.
- **The production domain.** `kishanthorat.com` is the ratified production domain; it is not yet purchased. The current origin is provisional. Phase 8 performs the swap and re-verifies every emitted URL.
- **Owner-supplied assets.** A headshot and sanitised demo-tenant screenshots remain outstanding; markers exist in the built output.
- **The VM.** Provisioning is the owner's action and gates Phase 1.
- **404 self-canonical.** The 404 page emits a canonical it arguably should not. Phase 8.
- **Wrangler dev-tree advisories.** Build-time-only tool, never ships to a visitor; the production audit gate correctly does not see them. Reasoning to be recorded in the maintenance runbook so a future reader does not mistake this for negligence.

## 16. Rejected alternatives, and why

Recorded so you do not re-propose them.

### 16.1 Paradigms rejected during research

| Rejected | Why |
|---|---|
| **The World** (explorable 3D game) | Exists, aging, screams "creative developer," orthogonal to the evidence |
| **The Performance** (cinematic scroll spectacle) | Engineering theatre; the target audience discounts it hardest |
| **The Oracle** (AI chatbot over a corpus) | Commoditised; worse, it *increases* the trust burden |
| **The Swarm** (visitors as WebRTC nodes in a live consensus mesh) | The most seductive idea in the search, and killed deliberately: evidence of the wrong thing, empty-room failure mode, and memorable mainly because it is hard |
| **The Gift** (a free useful tool) | Redundant — he already ships real products |
| **The Review** (public code review) | Empty comment threads read as failure |

### 16.2 Architectural alternatives rejected

**Static-only hosting.** The original blueprint assumed static hosting and deferred the live layers. That produced an excellent static site and *the wrong product*. The constraint was imaginary. This is the single most important lesson in the project's history: **architecture follows experience, never the reverse.**

**Cloudflare Pages.** Cloudflare merged Pages into Workers for new projects. Deployment config now lives in `wrangler.jsonc` in the repository — which is better for a repository that is itself an exhibit.

**Application-layer tenant filtering.** Rejected in favour of genuine Postgres RLS. The demonstration must be real isolation or the entire project is a lie.

**Arbitrary SQL execution for the AI demo.** Rejected. Fixed endpoint surface only.

**A shared TypeScript base config at Phase 0.** Rejected as premature; the three workspaces have genuinely different targets.

### 16.3 Visual alternatives rejected

**Parallax, scroll-jacking, typewriter effects, particle backgrounds.** These were in the site being replaced, and the founding brief rejected them explicitly: memorable *"not because it has pretty animations."*

**Sci-fi volumetric glass as the primary register.** Corrected to operational evidence (§3.2).

**Any animation library for the static surface.** CSS plus a sub-1KB IntersectionObserver utility. The performance budget is the design.

### 16.4 The design review that shaped the final form

An adversarial panel review — Ive, Bret Victor, Stripe, Linear, Cloudflare Radar, Pixar — produced six changes now baked into this dossier: the terrarium labelled and contrasted (§7.4), the author present in the world (§4), the block made inspectable (§2.5), stations directly addressable (§2.9), reproducible take-aways (§2.10), and the palette moved from sci-fi to operational evidence (§3.2).

Two objections were rejected with reasoning: that the fast lane is an admission of failure (§6.2), and that inviting attack is adversarial toward someone you want to like you — inviting someone to try to break your work is the highest form of confidence, and engineers read it as such.

---

# 17. TO CLAUDE CODE — YOUR FIRST TASK

This document contains my complete understanding of the product.

**Read every section. Then review it adversarially.**

Challenge every assumption. Review every architecture decision. Review every technology choice. Review every rendering approach. Review every animation approach. Review every backend decision. Review every deployment decision. Review every security decision. Review every performance decision. Review every implementation strategy.

**If you discover a better implementation while preserving the approved vision, architecture, philosophy, and experience — improve it.** If you discover a better library, framework, rendering technique, deployment strategy, optimisation, animation system, shader technique, backend structure, testing approach, or engineering practice, explain it and adopt it.

I want that. I am not a designer defending a document; I am an architect who wants the strongest possible build. You will know things about implementation that I do not.

**However:**

- You are **not** allowed to redesign the product
- You are **not** allowed to change the experience
- You are **not** allowed to change the emotional journey
- You are **not** allowed to simplify the vision
- You are **not** allowed to replace the architecture without explicit approval

**You are reviewing implementation, not redefining the product.**

Section 12 is the boundary. If your improvement lives in §12.2, adopt it and tell me. If it touches §12.1, propose it and wait.

**Your first task, before writing a single line of code:**

1. Read this dossier completely
2. Read `CLAUDE.md` and every document in `docs/`
3. Inspect the repository as it actually exists — structure, configuration, CI, gates, build tooling, deployment, git history
4. Produce a written review containing:
   - **Assumptions in this dossier that do not match the repository.** Be precise. This has caught real problems before.
   - **Implementation improvements you intend to make**, each with its reasoning, and each mapped to §12.2 to show it is within your authority
   - **Anything you believe is wrong** that falls inside §12.1 — proposed, not adopted, with your reasoning
   - **Risks I have not accounted for**, particularly around the render layer's performance, the security surface of a publicly attackable demo, and anything about the live plane's failure modes
   - **Questions that genuinely require owner input**, distinguished clearly from things you have decided yourself

Do not begin implementation. Do not write code. Produce the review.

Only after that review has been read and accepted will Phase 0 begin.

---

**End of dossier.**
