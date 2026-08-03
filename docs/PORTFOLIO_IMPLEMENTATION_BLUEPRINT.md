# PORTFOLIO IMPLEMENTATION BLUEPRINT
**Subject:** Kishan Thorat — Software Engineer
**Version:** 1.0 · 3 August 2026
**Status:** FINAL. This is the single source of truth for implementation. All future work follows this document. Changes require an explicit amendment, not a new planning session.
**Companion documents:** `ENGINEERING_IDENTITY_REPORT.md` (ratified identity), `PROJECT_KNOWLEDGE_BASE_WTMS.md`, `PROJECT_KNOWLEDGE_BASE_MENUSAAS.md`, `PROJECT_KNOWLEDGE_BASE_ELES.md` (content source material — reference only, never published verbatim).

---

## 0. Authority, Amendments & Conflict Rulings

This blueprint inherits the ratified Engineering Identity Report and applies four rulings that resolve every conflict between the final planning brief, the ratified constitution, and the evidence.

**Ruling 1 — Positioning amendment (ACCEPTED, constitutional).** The subject is presented exclusively as an engineer. The words **founder, CEO, owner, business owner, sole proprietor, startup, entrepreneur, my company, my business** never appear anywhere on the portfolio, in metadata, in alt text, in the machine layer, or in the repo README. Approved framing: *"Independent product engineering"*, *"sole engineer"*, *"systems I designed, built, and operate"*, *"production systems I'm personally accountable for."* KodSpot is referred to as *"the KodSpot platform suite"* — a body of engineering work, never a venture.
> ⚠ Known external inconsistency (flagged, out of portfolio scope): `kodspot.com/about` publicly identifies the subject as founder of a registered sole proprietorship. The portfolio never links to that page and never uses that language. Recommended (owner's decision, post-launch): soften that page's wording. The portfolio itself is fully compliant regardless.

**Ruling 2 — Paradigm scope.** The ratified "evidence-first" philosophy is retained in full; the ambitious live-telemetry layers are **deferred, not deleted**. Core build (Phases 0–6) = a world-class, evidence-driven engineering portfolio with a machine-readable layer. Post-launch (Phase 7, optional) = live status/uptime layer. Rationale: the brief's "do not overengineer" constraint, the unanswered time-budget question, and the truth that an unshipped masterpiece loses to a shipped excellent one.

**Ruling 3 — Evidence corrections (binding on all content).** Cross-referencing the CV against the knowledge bases surfaced facts that content MUST respect:
- The **256 CI-gated tests / 21 tenant-isolation test files / 17-work-package readiness programme belong to the Electrical platform only** (point-in-time figure, Jul 2026 audit — always qualified "as of Jul 2026").
- The **WTMS (hospital) platform has no automated test suite** — documented in its own KB as a known high-priority gap. This is never hidden, never blurred into the Electrical numbers, and is instead used deliberately (see §4.2 and §4.5) as the portfolio's most credible growth story: the lesson that produced the Electrical readiness programme.
- The **Electrical platform is pre-launch** — always labeled `PRE-LAUNCH`, never implied live.
- Menu's **30-day purge policy is documented but not yet automated** (manual superadmin endpoint only) — usable as an honest-limitation entry, never claimed as automated.
- AI cost/rate-limit state is **in-process, single-instance** — scaling claims are never made beyond what ADRs and `SCALING.md` support.

**Ruling 4 — Conservative disclosure tier (default until upgraded in writing).** The hospital is **never named**; approved phrasing: *"a NABH-accredited hospital"* / *"in daily production at a hospital."* No customer names, no tenant counts, no revenue, no user counts, no uptime percentages — none of these exist in the evidence, so none appear. OPS360/Vedha content never exceeds the CV's exact wording. If information is unknown, the site says nothing or says "not published" — it never estimates.

**The Truth Constitution (applies to every sentence on the site):** every factual claim must be traceable to the CV or a knowledge base; quantitative claims carry their qualifier ("as of Jul 2026"); known limitations are disclosed in every case study; no placeholder content ships ("lorem", "coming soon" pages, empty sections are build-blockers); superlatives and hype adjectives are banned (see §3.4).

---

## 1. Portfolio Strategy

**Primary audience:** the technical hiring authority — CTO, VP Engineering, engineering manager, or founding engineer — at product/SaaS companies (UK-focused, worldwide-valid). They are skeptical, time-poor, and allergic to marketing.
**Secondary audience:** recruiters and talent partners — need role fit, stack, location/availability in 90 seconds.
**Tertiary audience:** AI screening agents parsing the site on a human's behalf — served by the machine layer (§7.6).

**Positioning statement (the spine of every page):**
> Software engineer who takes systems from design through to operated production — multi-tenant SaaS platforms serving real organizations, including one a hospital relies on every day, built and run end-to-end: architecture, security, tenant isolation, payments, compliance, deployment, and operations.

**The one-sentence claim (hero, title tag, OG description — locked wording):**
> **"I design, build, and operate production systems."**
> Sub-line: *"Three multi-tenant SaaS platforms — one in daily use at a hospital, one live with subscription billing — engineered and operated end-to-end as sole engineer, alongside enterprise AI workflow automation for a UK client."*

**Value-proposition pillars (the five things every journey must land):**
1. **Production operation, not just delivery** — systems with real users, real consequences, personally operated.
2. **Multi-tenant security as a discipline** — server-derived org scoping, isolation regression suites, documented threat handling.
3. **Cost-first AI engineering** — SQL-first routing before any model call, token budgets, provider circuit breakers, injection defense.
4. **Compliance as a design input** — DPDP-aligned PII encryption, audit trails, NABH reporting, GDPR/DPDP audit experience.
5. **Engineering judgment, shown honestly** — ADRs, an enforced charter, disclosed limitations, and lessons that changed how the next system was built.

**Professional narrative (About-page arc, condensed):** engineering degree → operations supervision and teaching (the roots of the operator mentality and the documentation habit) → deliberate transition into software (2022–23) → freelance full-stack delivery for a UK company → enterprise AI workflow automation for a UK client → independent product engineering: three production-grade multi-tenant platforms built and operated solo. AI-assisted development is owned openly: *"I use AI tools to accelerate implementation; architecture, security, tenant isolation, compliance, and production operations are decisions I make and own."* The human color (four languages, national-stage acrobatic yoga, community festival PWA) appears once, briefly, on the About page only.

**What the visitor must leave thinking:** *"This engineer has built and runs real production systems."* Explicit anti-goals: "this person owns a startup"; "this is a template portfolio"; "these claims are inflated."

---

## 2. Information Architecture

**Site map (7 public pages + machine layer + utilities):**

```
/                       Home — claim, proof strip, featured systems, experience snapshot, CTA
/systems                Systems index — the three platforms + "more systems" strip
/systems/hospital-operations     Case study: KodSpot Housekeeping (WTMS)   [flagship]
/systems/menu-platform           Case study: KodSpot Menu
/systems/electrical-platform     Case study: KodSpot Electrical (pre-launch)
/experience             Professional experience — Vedha/OPS360, Avant Data, earlier career
/engineering            How I work — principles, decision records, lessons learned
/about                  Narrative, human layer, languages, location & availability
/cv                     HTML CV + PDF download (stable URL /cv.pdf)
─ machine layer ─
/llms.txt               Agent guidance file
/api/profile.json       Versioned structured profile (schema in §7.6)
/sitemap.xml, /robots.txt, JSON-LD embedded per page
─ utilities ─
/404                    Styled, with navigation recovery
```

**Navigation (desktop & mobile, same 5 items):** Systems · Experience · Engineering · About · CV. Logo → home. One persistent CTA in header on desktop: "Contact" (mailto + LinkedIn — no contact form in core build; forms are Phase 7+ if ever). Footer: email, LinkedIn, GitHub, CV download, "Built and operated by Kishan Thorat — source on GitHub" (the repo is public and linked: the portfolio's own code is an exhibit).

**Section ordering, Home (top → bottom):**
1. Hero: claim + sub-line + status chips (`3 platforms` · `1 in hospital production` · `1 live with billing` · `1 pre-launch`) + two buttons: "See the systems" / "Download CV".
2. Proof strip: 4–6 evidence chips in mono type, each traceable (e.g., `21 tenant-isolation test files (Electrical, Jul 2026)` · `Idempotent dual-path payment activation` · `SQL-first AI router — most queries at zero model cost` · `AES-256-GCM PII encryption at rest` · `4 ADRs · enforced engineering charter`).
3. Featured systems: three case-study cards (status badge, one-line problem, 3 stack tags, "Read the engineering →").
4. Current role snapshot: two-line Vedha/OPS360 summary (CV wording) → /experience.
5. How I work teaser: the five pillars as one line each → /engineering.
6. Closing CTA: availability line ("Open to relocation — UK · available immediately") + contact.

**The three journeys:**
- **Recruiter (≤90s):** Home hero → proof strip → CV button. Everything needed (role, stack, seniority signals, location, availability) is above the fold or one click away. /cv is print-clean.
- **Technical authority (10–20 min):** Home → flagship case study (hospital) → /engineering (decisions & lessons) → /experience → contact. Depth increases with each click; nothing gates the depth.
- **AI agent:** /llms.txt → /api/profile.json → structured case-study pages (semantic HTML + JSON-LD). All claims machine-consistent with human pages — one content source generates both.

---

## 3. Content Strategy

**3.1 Voice.** First person, plain, specific, calm. Short sentences. Every paragraph earns its place with a fact, a decision, or a trade-off. The register of a senior engineer's design doc, not a marketer's landing page.

**3.2 Depth layering (every case study, same pattern):** Layer 1 — headline + 3-sentence summary any recruiter understands. Layer 2 — architecture, decisions, security (the CTO layer). Layer 3 — linked deep artifacts (diagrams, decision records). Never force Layer 3 on Layer 1 readers.

**3.3 What appears:** everything specified in §4; evidenced counts with qualifiers; honest limitations; the AI-assisted-development ownership statement (once, on /engineering); "What I'd do differently" in every case study.

**3.4 What NEVER appears (enforced by CI copy-check, §7.7):**
- Banned identity words (Ruling 1 list) — plus "my startup", "our customers", "clients" for KodSpot work.
- Banned hype words: passionate, ninja, rockstar, guru, cutting-edge, revolutionary, world-class, blazing, seamless, innovative, magic.
- Certificates (all four are omitted from the site entirely; they remain CV-only, one line). Education grades/percentages. Tutorial-era projects (e-comm store, FoodCorner, TrendNest, 3D parallax, coursehub) — these are decommissioned with the old site.
- Hospital name, customer names, tenant counts, user counts, revenue, pricing tiers, uptime percentages (no evidence base — Ruling 4).
- OPS360 details beyond the CV's exact bullets. Screenshots of OPS360/n8n internals: prohibited.
- Fake urgency, testimonials (none exist in evidence), stock photography, decorative illustrations.

**3.5 Writing rules:** claims in active first person ("I designed…"); numbers in mono-type evidence chips; every metric qualified; British English (UK audience); dates absolute ("Jul 2026"), never "recently".

---

## 4. Project Case Studies

**4.0 Shared template (identical structure across all three — consistency is itself a signal):**
1. **Header:** title · status badge (`IN PRODUCTION — HOSPITAL` / `LIVE` / `PRE-LAUNCH`) · role line: "Sole engineer — architecture, build, security, deployment, operations" · stack tags.
2. **Context** (3–5 sentences): the operational problem, who uses it, why it exists.
3. **Constraints** (what made it hard): budget, solo operation, compliance, adversarial users.
4. **Architecture:** one custom SVG diagram (from KB mermaid sources, redrawn in the design system) + a request-lifecycle paragraph.
5. **Engineering decisions** (3–4 cards): Decision → Why → Trade-off accepted. Sourced from ADRs/KB.
6. **Security & tenancy:** the isolation model, authn/authz, PII handling, abuse prevention.
7. **Reliability & operations:** deployment, health gates, backups, runbook flavor.
8. **Honest limitations** (2–3 items, from KB "Known Risks" sections): stated plainly, each with "addressed by / planned".
9. **Outcomes & takeaways:** evidenced facts only + a 3-bullet "what this demonstrates" recruiter box.
10. **Gallery:** 3–5 sanitized screenshots (demo tenant only — checklist §8.3).

**4.1 KodSpot Housekeeping (WTMS) — flagship. URL `/systems/hospital-operations`. Status: `IN PRODUCTION — HOSPITAL`.**
- Context: multi-tenant platform for hospital/facility housekeeping operations — QR-anchored cleaning verification with photo evidence, maintenance ticketing with public QR reporting, staff attendance (three tracking modes), leave management, NABH accreditation reporting. In daily production at a NABH-accredited hospital (unnamed).
- Decision cards: (a) QR-scoped identity instead of accounts for patients/nurses/workers — access via location identity + rate limiting; (b) duplicate-photo fraud detection (hash-based) because photo evidence is only evidence if it can't be faked; (c) cost-first AI: regex SQL-router answers most operational questions at zero model cost; per-org token budgets (default 500k/month) with 80% alerts; per-user daily caps; Vertex keyless metadata-server auth with signed-JWT fallback; prompt-injection detection; (d) DPDP-first: AES-256 PII at rest, guest-contact auto-anonymisation, export, audit trails.
- Honest limitations (mandatory): no automated test suite at time of writing (the lesson that produced the Electrical readiness programme — cross-link); AI cost controls are in-process, single-instance by design (ADR-level trade-off).
- Recruiter takeaways: production accountability in a clinical environment · adversarial design · AI cost engineering.
- Assets: architecture SVG; screenshots — scan/cleaning submission flow, supervisor dashboard, ticket lifecycle, NABH report sample (redacted), attendance kiosk.

**4.2 KodSpot Menu — URL `/systems/menu-platform`. Status: `LIVE`.**
- Context: multi-tenant digital-menu platform — public QR menus (`/m/XXXXXX`), owner dashboard, platform console; subscription billing with a 14-day trial lifecycle.
- Decision cards: (a) **dual-path idempotent payment activation** — client-verify and webhook race safely; HMAC `timingSafeEqual` verification; already-captured no-op (the flagship payments content — include the sequence diagram redrawn); (b) privacy-by-design analytics — hashed+salted visitor identifiers, no raw IP storage, DPDPA-aligned retention incl. 6-year payment records for GST; (c) modular monolith serving product + static frontends from one Fastify process (61 routes), Astro marketing site separate behind shared Caddy; (d) plan-entitlement matrix with soft caps on analytics, not traffic.
- Honest limitations: 30-day purge documented but currently manual-only (automation planned); cron/cache are process-local — correct at current single-replica scale, listed as the scaling boundary.
- Recruiter takeaways: payments engineering with real money · privacy-first analytics · pragmatic monolith discipline.
- Assets: architecture SVG; payment-flow SVG; screenshots — public menu, owner dashboard, QR card generator, platform console (demo tenant).

**4.3 KodSpot Electrical — URL `/systems/electrical-platform`. Status: `PRE-LAUNCH (Q3 2026)`.**
- Framing: *the engineering-maturity case study* — "what I now do before a system meets its first user."
- Context: multi-tenant electrical-inspection and facility-ticket platform; five roles from unauthenticated guest complainant to cross-tenant operator; four selectively-enabled feature modules.
- Decision cards (from real ADRs — present as ADR summaries): 0002 modular monolith over microservices (with rejected alternatives); 0003 shared-DB `orgId` row-scoping over db-per-tenant (with the "discipline-only scoping is unsafe" rationale); 0004 resilience as shared primitives — circuit breakers via Prisma client extension, `runExclusive` Postgres advisory-lock scheduling, so new code inherits protection; 0001 R2 offsite backups reusing existing credentials.
- The readiness programme: 17 work packages; enforced engineering charter (sample rules quoted: migrations-only schema changes; docs ship in the same PR; breaking-change policy); **256 tests passing as of the Jul 2026 audit** incl. **21 tenant-isolation regression files**, tiered unit → in-memory HTTP → DB-integration (skip-clean without a DB, real Postgres service container in CI); health-gated deploys.
- Honest limitations: pre-launch — no production users yet (say it plainly); SSE is the stated single-instance boundary; no external APM/pager yet (documented known gap).
- Recruiter takeaways: test architecture · governance as code · resilience primitives · honest pre-launch labeling.
- Assets: architecture SVG; test-tier diagram; screenshots — inspection checklist, public complaint flow, asset registry (staging).

**4.4 /experience page.** Vedha IT Solutions / Delisys OPS360 (Nov 2025–present): CV bullets verbatim-or-tighter, presented as an experience card with a `CONFIDENTIAL CLIENT WORK — described at CV level` note (turns the NDA into a professionalism signal). Avant Data Ltd (Jun 2023–Dec 2025): two CV bullets. Earlier career: the one-line arc, framed as transfer ("operations supervision taught me to run systems; teaching taught me to document them"). **More systems** strip (compact cards, no case-study pages): AI Court Bundle Generator; AI lead-qualification agents; Ganesh Chaturthi festival donations PWA (community project — offline-capable, multilingual, fuzzy donor matching).

**4.5 /engineering page.** (a) The five pillars, each with one concrete evidence line. (b) The AI-native ownership statement. (c) **Decision records** — 4 ADR summary cards (from ELES) + 2 cross-system decisions (SQL-first router; dual-path idempotent activation). (d) **Lessons learned** (the credibility anchor — two entries, evidence-backed):
1. *"I shipped a hospital-production system without an automated test suite."* Cost: every deploy depends on manual verification; documented as the platform's top risk. Rule changed: the next platform launched behind a 17-work-package readiness programme with 256 CI-gated tests and a tenant-isolation suite before its first user.
2. *"I documented a compliance behavior before automating it."* Menu's 30-day purge existed in docs and schema (`purgeAfter`) but no job executed it — documentation described intent, not reality. Rule changed: a compliance claim isn't "done" until a scheduled job enforces it and a test proves it.
(Owner may substitute alternatives at content time; entries must meet the failure-quality rule.)

---

## 5. Design System

**Direction:** "engineering evidence" — the calm confidence of a well-run operations console. Dark, precise, typographic. Zero decoration that doesn't carry information. Distinct from both template-portfolio gloss and terminal-cosplay.

**Color tokens (single dark theme; light theme deliberately out of scope for core build):**
```
--bg:            #0B0E14   (near-black blue-slate)
--bg-raised:     #12161F   (cards, code, chips)
--border:        #232936
--text:          #E8EAF0   (primary)
--text-muted:    #9AA3B2
--accent:        #4ADE80   (production green — links, LIVE badge, focus states)
--accent-warm:   #FBBF24   (amber — PRE-LAUNCH badge, caution notes)
--accent-danger: #F87171   (limitations markers only, sparingly)
```
All pairings must pass WCAG 2.2 AA (checked in CI). Accent used for meaning, never mood.

**Typography:** Inter (400/500/650) for UI and prose; JetBrains Mono (400/500) for evidence chips, metrics, code, labels, status badges. Scale (rem): 0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.25 / 3. Prose measure ≤ 72ch; line-height 1.65 body, 1.15 headings. Fonts self-hosted, subset (latin), `font-display: swap`.

**Spacing & layout:** 4px base scale (4–96). Max content width 1120px; case-study prose column 720px. 12-col fluid grid on desktop, single column < 768px. Generous whitespace — density lives in the chips, not the layout.

**Components (complete set — nothing else gets invented during implementation):**
- **Status badge** — mono, uppercase, dot + label (`● IN PRODUCTION — HOSPITAL` green · `● LIVE` green · `◐ PRE-LAUNCH` amber · `▪ CONFIDENTIAL` muted).
- **Evidence chip** — mono fact + muted qualifier, bordered pill; wraps into the proof strip.
- **System card** — badge, title, one-line problem, 3 stack tags, arrow link. Hover: border→accent, 2px rise.
- **Decision card** — three labeled rows: DECISION / WHY / TRADE-OFF (+ optional AGED: for lessons).
- **Limitation note** — left-bordered (danger token) plain-spoken block with "addressed by" line.
- **Experience card**, **stat block** (mono number + caption + qualifier), **section header** (kicker + title), **figure** (diagram/screenshot + caption + "viewing a demo tenant" note where applicable), **prose block**, **footer**, **skip-link + focus ring** (2px accent, always visible on focus).
- **Buttons:** primary (accent bg, dark text), secondary (bordered). Radius 6px everywhere; 1px borders; shadows almost none (elevation via border+bg shift).

**Iconography:** Lucide, 1.5px stroke, 20px, used sparingly (nav, external-link, download). No emoji anywhere.
**Imagery:** real sanitized product screenshots (device-framed, consistent 16:10 crops) and hand-drawn-in-code SVG architecture diagrams using the token palette. One real headshot on /about (owned asset — Phase 0). No stock, no AI-generated imagery, no illustrations.

---

## 6. Motion Design

Philosophy: motion confirms, never performs. If a visitor notices the animation before the content, it's wrong.
- **Entrances:** single fade + 6px rise, 200ms `cubic-bezier(0.2, 0, 0, 1)`, staggered ≤ 60ms, fire once via IntersectionObserver. No parallax, no typewriter, no scroll-jacking, no marquee, no particle effects — these are constitutionally banned (they are the old portfolio).
- **Micro-interactions:** link underline slide-in 150ms; card hover border/lift 150ms; button press scale 0.98; focus ring instant.
- **Page transitions:** View Transitions API as progressive enhancement (Astro built-in), 180ms cross-fade; full-page reload behavior must be perfect without it.
- **Loading:** none needed (static site); images lazy below fold with correct `width/height` to prevent CLS.
- **Accessibility:** `prefers-reduced-motion: reduce` disables all transforms/transitions globally (opacity-only, instant).
- **Implementation constraint:** CSS + one ≤1KB IntersectionObserver utility. **No animation library** (no GSAP, no Framer Motion). Performance budget is the design.

---

## 7. Technical Stack (decided)

**7.1 Framework: Astro 5 + TypeScript.** Static-first (zero JS by default — the perf budget is nearly free), content collections give typed Markdown/MDX with schema validation (the Truth Constitution becomes a Zod schema: every case-study frontmatter requires `status`, `role`, `limitations[]`, evidence qualifiers), and it's in the subject's own skill set — the portfolio's stack is itself a truthful claim. Rejected: Next.js (SSR machinery with no consumer here), plain HTML (content duplication killed the last site's integrity).

**7.2 Styling: hand-written CSS with custom-property design tokens** (one `tokens.css` + component styles co-located). Rejected Tailwind for this project only: the repo is a public exhibit and hand-crafted CSS at this scale (~7 pages) reads as craft; token names double as design-system documentation.

**7.3 Interactivity:** zero framework islands in core build. The only client JS: reveal-on-scroll utility, mobile nav toggle, copy-email button. Total client JS budget: **< 15KB gzipped** (excluding fonts/images).

**7.4 Hosting & deployment:** GitHub (public repo) → GitHub Actions → **Cloudflare Pages**, custom domain **kishanthorat.dev** (primary; `.com` if available too, 301 → .dev). Rejected Azure SWA: the old site's host carries the old site's associations; CF Pages pairs with the existing Cloudflare footprint. Old Azure site: after launch, replaced by a single-file 301 redirect to the new domain (Phase 6).

**7.5 CI gates (every push to main must pass before deploy):** build · type-check · **banned-words copy check** (greps built HTML for Ruling 1 + §3.4 lists) · internal link check · Lighthouse CI thresholds (≥95 performance, ≥100 accessibility-audit pass, ≥95 SEO on home + flagship case study) · HTML validation. The CI file is part of the exhibit — commented and clean.

**7.6 SEO & machine layer:**
- Per-page `<title>`/description; canonical; OG/Twitter cards with generated static OG images (title + status chips on token background).
- JSON-LD: `Person` (site-wide) + `ProfilePage` (/about, /cv) + `SoftwareApplication` per case study (name, description, operating status honestly reflected).
- `/llms.txt`: short guide for AI agents — who this is, page map, where the structured profile lives, and the line "all claims on this site are evidence-qualified; unpublished figures are unpublished, not zero."
- `/api/profile.json` (static, versioned `"schemaVersion": 1`): identity, headline, location/availability, links, skills (CV taxonomy verbatim), experience entries, systems[] (name, status, role, stack, url, summary, limitations[]). Generated at build from the same content collections as the human pages — **one source of truth, machine and human layers cannot disagree.**
- `robots.txt` allows all including AI crawlers; sitemap auto-generated.

**7.7 Analytics: Cloudflare Web Analytics** (cookieless, no consent banner needed) — the privacy-by-design identity, practiced. No Google Analytics.

**7.8 Accessibility: WCAG 2.2 AA** — semantic landmarks, one `h1`/page, skip link, visible focus, contrast-checked tokens, alt text policy (screenshots get descriptive alts naming the surface shown), reduced-motion support, keyboard-complete nav. Verified via axe in CI + one manual keyboard/screen-reader pass in Phase 6.

**7.9 Performance budget (mid-range Android, 4G):** LCP < 1.8s · CLS < 0.05 · INP < 200ms · HTML+CSS+JS < 90KB gz per page · images AVIF/WebP with srcset, hero-free image policy (no LCP image on home — the claim is text).

**7.10 CMS: none.** Content = MDX in the repo. Docs-as-code is the subject's stated identity; the git history of the content is itself evidence.

---

## 8. Content & Asset Inventory

**8.1 Exists now (source in hand):** both CVs (content source); three KBs (case-study source); ADR summaries, charter excerpts, test-tier description (inside ELES KB); payment-flow and architecture mermaid diagrams (inside KBs — to be redrawn as branded SVGs); this blueprint + identity report (repo `/docs`).

**8.2 To create during implementation (Claude Code):** 4 architecture SVGs (shared-foundation overview + one per platform); payment-sequence SVG; test-tier SVG; monogram logo (`KT`, mono-font-derived, favicon set); OG image template + per-page renders; CV HTML page + regenerated PDF (must match site claims exactly); 404 copy.

**8.3 Owner must supply (Phase 0 checklist — the only human-blocking items):**
1. **Domain**: purchase kishanthorat.dev (+ .com if free) — blocks Phase 1 DNS only, not build.
2. **Headshot**: one owned, plain-background photo (kills the hotlinked-image disgrace permanently).
3. **Screenshots** per §4 asset lists — **from a demo/staging tenant only**, passed through this sanitization checklist: no real names, phone numbers, or photos of people; no real org names/logos; browser chrome cropped or clean profile; consistent viewport (1440×900 desktop, 390×844 mobile); no console/bookmarks visible.
4. **Confirmation of the two Lessons entries** (§4.5) or substitutes meeting the failure-quality rule.
5. **GitHub rehabilitation** (can run parallel to any phase): unpin all six tutorial repos; pin the new portfolio repo; add a profile README (headline claim + links — wording supplied in T2); archive or private the noise repos; keep or archive tutorial repos per preference (archived + honest READMEs "learning project, 2024" is acceptable and honest).
**Missing-by-design (never fabricate, add only if evidence emerges later):** testimonials, usage metrics, uptime history, customer logos, video demos (Storylane embeds are a Phase 7 candidate pending permission review).

---

## 9. Implementation Roadmap

Each phase is independently shippable, testable, and ends with a deploy. No phase begins until the previous phase's acceptance criteria pass.

**Phase 0 — Prerequisites (owner, ~2–4h).** §8.3 items 1–2 minimum; screenshots may trail until Phase 3. *Done when:* domain live on Cloudflare, headshot in hand.

**Phase 1 — Foundation (repo + skeleton).** Public repo `kishanthorat/portfolio` with README (project intent + stack + how to run), MIT license, `/docs` containing this blueprint; Astro scaffold + TypeScript strict; `tokens.css` + base styles + fonts; layout shell (header/nav/footer/skip-link); CI pipeline with all §7.5 gates (Lighthouse thresholds may warn-only until Phase 6); deploy to CF Pages on the real domain with a minimal but real home hero (no "coming soon"). *Done when:* CI green, domain serves the hero, mobile nav works, reduced-motion verified.

**Phase 2 — Core pages.** Home complete (all 6 sections, chips populated from content collections); /about; /cv (HTML + PDF at /cv.pdf); 404; footer finalized. *Done when:* recruiter journey completable in <90s on a phone; copy passes banned-words gate; CV PDF matches site claims.

**Phase 3 — Case studies.** Content-collection schema (Zod: required `status`, `limitations` min 1, qualifier fields); component set (§5); **WTMS first** (flagship — hardest content, sets the bar), then Menu, then Electrical; /systems index; diagrams redrawn as SVGs. *Done when:* all three pass the template checklist §4.0 items 1–10, every screenshot passes the sanitization checklist, every metric carries its qualifier.

**Phase 4 — Experience & Engineering pages.** /experience incl. confidential-client note + more-systems strip; /engineering incl. decision records + the two Lessons (owner-confirmed by now). *Done when:* every decision card traces to a KB/ADR source noted in a content-file comment.

**Phase 5 — Machine layer & SEO.** JSON-LD, OG images, /llms.txt, /api/profile.json generated from collections; sitemap/robots; meta pass on all pages. *Done when:* profile.json validates against its schema in CI and a diff test proves human/machine claim parity (spot-check script).

**Phase 6 — Hardening & launch.** Full accessibility manual pass; Lighthouse gates → enforcing; cross-device QA (Android mid-range, iPhone, 1440p desktop); final copy audit against the Truth Constitution reading every page aloud against the banned lists; **launch**; old Azure site replaced with 301; LinkedIn/GitHub links updated to new domain. *Done when:* CI fully green with enforcing gates, old URL redirects, GitHub profile shows the new pinned repo.

**Phase 7 — Post-launch (optional, explicitly out of core contract):** live status layer (health-badge endpoints / uptime page), Storylane demo embeds (pending permission), light theme, contact form, blog/notes. Each requires its own mini-spec; none may violate the constitution.

---

## 10. Final Coding Plan — the exact Claude Code sequence

Claude Code executes tasks in order; each task ends with a passing build + commit. Conventional commits (`feat:`, `content:`, `chore:`). **Standing rules for Claude Code:** never invent facts — all copy comes from this blueprint, the CVs, and the KBs; if a fact is missing, insert `<!-- OWNER-INPUT: … -->` and halt that content block rather than fabricate; no new dependencies without a stated reason in the commit body; no refactors of shipped phases except via a defect fix; the banned-words gate is never disabled to make a build pass.

- **T1** Repo init: Astro+TS strict scaffold, prettier, README, license, /docs (blueprint + identity report), .github/workflows (build+typecheck only for now). 
- **T2** Design tokens & base: tokens.css, font pipeline (subset+preload), global styles, prose styles; GitHub profile README text delivered to owner.
- **T3** Layout shell: Header/Nav (desktop+mobile), Footer, SkipLink, BaseLayout with meta slots; 404.
- **T4** CI/deploy: CF Pages wiring, link-check, banned-words script (`scripts/copy-check.mjs` reading `content/banned.json`), HTML validate; deploy hero-only home.
- **T5** Content collections: schemas (system, experience, decision, lesson, chip) with Zod constraints encoding the constitution (e.g., `limitations: z.array(...).min(1)` on systems).
- **T6** Component library: StatusBadge, EvidenceChip, SystemCard, DecisionCard, LimitationNote, StatBlock, ExperienceCard, SectionHeader, Figure, Buttons — with a `/dev/components` preview route (excluded from sitemap & robots).
- **T7** Home page complete (all six sections from collections).
- **T8** /about + headshot pipeline (responsive AVIF/WebP) + /cv HTML + PDF generation script (Playwright print-to-PDF from /cv, committed as /public/cv.pdf).
- **T9** Motion utility (IntersectionObserver, ≤1KB) + reduced-motion audit.
- **T10** WTMS case study: content file (from KB §§1,2,8,10,12,15 per blueprint §4.1) + architecture SVG + gallery slots with sanitization-checklist comments.
- **T11** Menu case study (KB §§1,3.4,8,9,15) + payment-sequence SVG.
- **T12** Electrical case study (KB §§1,10,14,16,17,18,19) + test-tier SVG.
- **T13** /systems index + cross-links (incl. the WTMS-lesson → Electrical-programme link).
- **T14** /experience (Vedha card CV-verbatim, Avant, earlier-career line, more-systems strip).
- **T15** /engineering (pillars, ownership statement, 6 decision records, 2 lessons — halt on OWNER-INPUT if lessons unconfirmed).
- **T16** Machine layer: JSON-LD components, profile.json + llms.txt generators, parity spot-check script in CI.
- **T17** OG image generation (satori or static template renders) + full meta pass.
- **T18** Hardening: axe CI, Lighthouse CI enforcing, image audit, final copy audit checklist run.
- **T19** Launch ops: production DNS, old-Azure-site redirect file + deploy instructions for owner, LinkedIn/GitHub update checklist.
- **T20** Handover: `MAINTENANCE.md` (how to add a system, update status, run gates locally; quarterly review checklist: statuses current? qualifiers current? links alive?) — because an unmaintained portfolio is the failure mode this entire project replaces.

---

## Appendix A — Truth Constitution (quick card, pin in repo)
1. Every claim traces to CV or KB. 2. Every number carries its date qualifier. 3. Every system discloses ≥1 limitation. 4. Unknown = unstated, never estimated. 5. Banned words never ship (CI-enforced). 6. Engineer, never founder. 7. Hospital never named; clients never named; OPS360 at CV level only. 8. Screenshots from demo tenants only, sanitized. 9. No placeholder content ships. 10. Machine layer and human pages are generated from one source and cannot disagree.

**Planning is complete.** Implementation begins at Phase 0 / T1.
