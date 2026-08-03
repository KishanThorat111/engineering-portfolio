# PHASE_LOG — append-only implementation record

Every phase ends by appending an entry here: what shipped, engineering decisions made inside
the blueprint boundaries, deviations (with reasons), and open `OWNER-INPUT` markers. Every
implementation session reads this file before touching code (`CLAUDE.md`). Entries are never
edited after the fact — corrections are new entries.

---

## Phase 1 — Foundation Live (Blueprint T1–T4) · 3 August 2026

### Shipped

- `CLAUDE.md` at the repo root, verbatim from `docs/IMPLEMENTATION_HANDOFF.md` §3.
- Scaffold: Astro + TypeScript strict, Prettier (+ astro plugin), MIT licence, README in an
  engineer's voice, `.editorconfig` + `.gitattributes` enforcing LF (Windows dev machine),
  `.nvmrc` pinning Node 22 for CI and Cloudflare Pages.
- Design tokens (`src/styles/tokens.css`, blueprint §5 values verbatim), self-hosted
  latin-subset variable fonts (Inter, JetBrains Mono) with OFL licences in `/public/fonts`,
  global styles with a site-wide reduced-motion collapse, prose styles.
- Layout shell: `BaseLayout` (meta slots), skip link, header with mobile disclosure nav
  (the site's only client JS — inlined, ≈0.4KB), footer with verified contact facts; styled
  404 with navigation recovery.
- Home hero: the locked §1 claim, sub-line, and four status chips. No placeholder anywhere.
- CI (`.github/workflows/ci.yml`): production dependency audit (high+), typecheck, build,
  banned-words copy gate against built HTML, internal link gate, HTML validation; Lighthouse
  CI warn-only until Phase 8. All gates also run locally via `npm run verify`.

### Verification record

- `npm run verify` green end to end (typecheck · build · copy gate · link gate · HTML
  validation); `npm audit` reports 0 vulnerabilities across the full tree.
- Copy gate proven, not assumed: banned words were injected into a page, the gate failed the
  build with file/line reporting, and the injection was reverted before commit.
- Budgets measured on built output: `index.html` 1.8KB gz + CSS 2.1KB gz (budget < 90KB gz);
  client JS ≈0.4KB inlined (budget < 15KB gz).
- Reduced motion: enforced by a global CSS collapse rule; no entrance animations exist yet
  (the motion utility is Phase 3 scope). Device-level verification rides with Phase 3's
  motion work and Phase 8's manual pass.
- Mobile nav: disclosure pattern (`aria-expanded`/`aria-controls`, Escape-to-close with
  focus return, resize reset) verified in the built output; interactive verification on a
  real device is part of the owner's first deploy check below.

### Engineering decisions inside the boundaries (Phase 5+ sessions: inherit these)

1. **Astro major 7.1.6, not the 5.x line named in the blueprint.** Every Astro release
   ≤ 7.0.9 — all of 5.x and 6.x — carries published high-severity advisories (XSS/SSRF
   classes); the fix exists only in ≥ 7.1.6. A public exhibit repo whose own flagship lesson
   is dependency-risk discipline cannot ship a failing `npm audit`. The stack decision
   (Astro + TypeScript strict + static-first + content collections) is unchanged.
2. **Dependency-audit CI gate added** (`npm audit --omit=dev --audit-level=high`) — the
   Electrical readiness-programme lesson applied to this repository itself.
3. **Navigation carries only live destinations.** Phase 1 header: GitHub, LinkedIn, Contact
   CTA. The five internal items (Systems · Experience · Engineering · About · CV) join the
   nav as their routes ship in Phases 3–6; the header GitHub/LinkedIn links are transitional
   and move to footer-only when internal items land. Constitution rule 9 (no placeholder
   ships) plus the CI link gate make this the only compliant shape.
4. **Fonts**: latin `wght` variable subsets copied verbatim from the pinned
   `@fontsource-variable` packages (kept as devDependencies as the provenance record); OFL
   licence files ship alongside in `/public/fonts`.
5. **Hero status chips are page-local markup.** The `EvidenceChip`/`StatusBadge` components
   proper are Phase 2 scope; Phase 3 should replace the hero's local chip styling when the
   Home page is assembled from collections.
6. `favicon.svg` is a minimal KT monogram placeholder-quality asset in the token palette;
   the proper monogram/favicon set is produced with the OG-image work (T17, blueprint §8.2).

### Deviations from the blueprint (as-executed, with reasons)

- Repository is `KishanThorat111/engineering-portfolio`, not `kishanthorat/portfolio`
  (handoff v1.1 as-executed amendment).
- The old Portfolio repository was made **private** rather than publicly archived (handoff
  v1.1). If it is ever re-publicized, it gets the archive-plus-honest-README treatment.
- Astro major version — decision 1 above.
- Deployment is prepared but not yet live: creating the Cloudflare Pages project requires
  the owner's Cloudflare account (OWNER-INPUT 2 below). Every other Definition-of-Done item
  for Phase 1 is met; "deployed URL serves the hero" completes with that one dashboard
  action, after which each push to `main` auto-deploys.

### OWNER-INPUT — open items

1. **Domain** — purchase `kishanthorat.dev` (+ `.com` if free) and add to Cloudflare.
   Phase 1 serves from the `*.pages.dev` URL; the domain is a hard launch blocker by
   Phase 8, not before.
2. **Cloudflare Pages project** (unblocks the live URL, ~5 minutes): Cloudflare dashboard →
   Workers & Pages → Create → Pages → Connect to Git → select
   `KishanThorat111/engineering-portfolio`, production branch `main` → build command
   `npm run build`, build output directory `dist` → Save and Deploy. No environment
   variables or secrets are required (Node version comes from `.nvmrc`). When the domain
   exists, bind it under the project's Custom domains tab.
3. **Headshot** — one owned, plain-background photo. Bites in Phase 3 (/about).
4. **Screenshots** — demo/staging tenants only, sanitized per blueprint §8.3. Bite in
   Phases 4–5.
5. **Lessons confirmation** — the two §4.5 entries. Bites in Phase 6; unblock by opening
   that session with "Lessons approved as drafted".
6. **GitHub profile rehabilitation** — unpin the six tutorial repositories, pin
   `engineering-portfolio`, and apply the profile README text below (any time before
   launch).

### Deliverable — GitHub profile README text (T2)

```markdown
Software engineer — I design, build, and operate production systems.

Three multi-tenant SaaS platforms, engineered and operated end-to-end as sole
engineer: one in daily use at a hospital, one live with subscription billing,
one pre-launch. Alongside: enterprise AI workflow automation for a UK client.

Portfolio: https://kishanthorat.dev — source at
[engineering-portfolio](https://github.com/KishanThorat111/engineering-portfolio),
where the commit history, CI truth gates, and planning documents are part of
the work.
```

### Next session

Phase 2 — The Constitution Becomes Code (T5–T6). Open with the Phase 2 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first.

---

## Phase 1 addendum — first CI incident, and a correction · 3 August 2026

Appended rather than edited into the entry above: this log is append-only, and the first
diagnosis recorded here was wrong. Both facts belong in the record.

### What happened

The Phase 1 push (`ff8571e`) failed CI immediately. Both jobs died at the first real step,
`npm ci`, before any gate ran. The gates were never the problem — nothing had reached them.

**First diagnosis — wrong.** `npm ci` under npm 10 reproduced an error locally, so the
failure was attributed to CI's Node 22 runners bundling npm 10 against an npm 11 lockfile.
Node 24 was pinned in `.nvmrc` (`6bc7b82`). CI failed again, identically. The pin fixed
nothing.

**Actual root cause.** `package-lock.json` was incomplete. It had been built up
incrementally — `npm install`, then `npm install astro@^7.1.6`, then `npm audit fix` — and
the resulting file never recorded the top-level `@emnapi/core` and `@emnapi/runtime`
entries that `@napi-rs/wasm-runtime` and `@img/sharp-wasm32` require. The strict installer
named exactly those two packages; that message was evidence about the lockfile, not about
the npm version, and it was misread the first time. Deleting `node_modules` and
`package-lock.json` and regenerating from `package.json` produced a complete tree
(`e977057`). Run `30828044611` is green: every step of both jobs succeeded, including
Lighthouse.

### Why local verification missed it

`npm run verify` passed on this machine throughout, because `node_modules` already held the
packages the lockfile failed to record. A clean install had nothing to fall back on. **Local
green proved the source was correct; it could not prove the lockfile was complete — only a
clean install from the lockfile alone can do that.** This is the same class of gap the
portfolio's own content publishes rather than hides: a documented mechanism that had never
actually been executed end to end.

### Standing rules from this incident (later phases: inherit)

1. **A phase is not done when local gates pass — it is done when remote CI passes.** Push,
   then verify the run's job and step conclusions before declaring completion or writing a
   Definition-of-Done claim.
2. **Never hand-edit or incrementally patch `package-lock.json` into a shipping state.**
   After any dependency change, regenerate from a deleted lockfile and confirm a clean
   install reproduces the tree.
3. **Read an installer's error as evidence about the artifact it names**, not about the
   nearest environmental difference. The environment difference (npm 10 vs 11) was real,
   visible, and causally irrelevant.

### Correction to the entry above

The Phase 1 entry's verification record stated the gates were verified locally. That was
true and remains true, but it was insufficient as a completion standard — remote CI was not
green when the entry was written. The Definition of Done is now met: run `30828044611` is
green on `e977057`. The Node 24 pin stays (active LTS, matches the development machine, and
Cloudflare Pages reads `.nvmrc`, so dev/CI/host share one runtime) — kept on its own merits,
credited with nothing.

---

## Phase 2 — The Constitution Becomes Code (Blueprint T5–T6) · 3 August 2026

### Shipped

- **Five content collections** (`systems`, `experience`, `decisions`, `lessons`,
  `evidenceChips`) with Zod schemas encoding the Truth Constitution. Schemas live in
  `src/schemas/` (`constitution.ts` primitives, `content.ts` entities);
  `src/content.config.ts` wires loaders only, so the schemas stay independently importable.
- **The complete component set** from blueprint §5 — StatusBadge, EvidenceChip, SystemCard,
  DecisionCard, LimitationNote, StatBlock, ExperienceCard, SectionHeader, Figure, Button.
- **`/dev/components`** gallery rendering every component in every state, excluded from
  discovery by page-level `noindex, nofollow` **and** `Disallow: /dev/` in a new
  `public/robots.txt`.
- **Token contrast gate** (`scripts/contrast-check.mjs`, wired into `npm run verify` and CI)
  enforcing WCAG 2.2 AA on the pairings components actually use.
- **The five evidence chips** as real content, transcribed from blueprint §2.

### Verification record

- Remote CI green — this is the completion standard inherited from the Phase 1 incident.
- **The schema was proven by breaking it**, in the Phase 1 copy-gate manner: each invalid
  file was built, the failure captured, and the file deleted before commit. All four fail
  the build naming the field and the rule:
  - system with `limitations: []` → *"Every system discloses at least one honest limitation
    (constitution rule 3). A case study with nothing to disclose is marketing, not
    engineering."*
  - metric with no qualifier → *"metrics.0.qualifier: Required"* — a bare number is not a
    representable value.
  - chip stating `256 CI-gated tests` with no date → the rule-2 message.
  - chip containing "founder" → *"Banned identity word …"*, proving the schema layer fires
    before the built-HTML copy gate.
- The schema also caught a genuine error in my own first draft of the chips, which is the
  most useful evidence available that it is not decorative.
- Budgets: gallery 4.5KB gz, home 1.8KB gz, CSS 2.1KB + 1.7KB gz — all far inside the 90KB
  page budget. Components add **zero** client JS; the gallery carries one script tag, the
  Phase 1 nav (≈0.4KB).
- `npm run verify` green end to end; `npm run format:check` clean; `npm audit` 0
  vulnerabilities.

### Engineering decisions — Phase 3+ MUST inherit these

1. **A prop named `as` silently breaks prop typing.** In this toolchain (Astro 7.1.6 +
   @astrojs/check 0.9.10), a component prop literally named `as` collapses `Astro.props` to
   `any`, disabling typechecking for that whole component — it surfaces only as a stray
   "'Props' is declared but never used" warning. Isolated by bisecting a minimal component
   pair: renaming the prop to `level` with everything else identical fixes it. **Every
   polymorphic component here uses `level`.** This matters beyond style: it silently
   disables a gate, so a future component adding an `as` prop would lose prop typechecking
   without any error saying so.
2. **Astro 7 content-layer API, read from the installed types rather than recalled:**
   collections declare a `loader` (`glob` from `astro/loaders`), config must be
   `src/content.config.ts`, and `z` is **Zod 4** via `astro/zod` (`astro:content`'s `z`
   export is deprecated). Zod 4 takes `error`, not `message`; a dynamic message naming the
   offending term needs `superRefine` with `ctx.addIssue`, because `.refine()`'s second
   argument is no longer a message-producing function.
3. **Hero status chips — the Phase 1 hand-off.** Phase 1 decision 5 parked the hero's chips
   as page-local markup. `EvidenceChip` now exists and the `evidenceChips` collection is
   populated. **Phase 3 must delete the `.status-chips` block and its styles from
   `src/pages/index.astro` and render the proof strip from `getCollection('evidenceChips')`
   through `EvidenceChip`.** Note the two are different things: the four hero *status* chips
   (`3 platforms`, `1 in hospital production`, …) are locked hero wording from blueprint §1
   and stay in `src/config/site.ts`; the *evidence* chips are the separate proof strip,
   blueprint §2 section 2. Phase 3 should render the hero status chips with `EvidenceChip`
   too, so one component owns that visual form.
4. **Evidence chips are authored; Phase 3 renders them.** Blueprint §2 enumerates them
   exactly, so writing them was transcription. Phase 3 owns ordering and placement, not
   re-authoring.
5. **Case-study routes do not exist yet.** The gallery's `SystemCard` hrefs point at `/`
   because the CI link gate rightly refuses dead internal links. Phase 4/5 must update
   `src/dev/preview-fixtures.ts` to the real hrefs when those routes ship.
6. **Collection naming**: plural (`systems`, `decisions`, `lessons`, `evidenceChips`) except
   `experience`, which is a mass noun and matches the `/experience` route.
7. **Never put a `README.md` inside a content directory.** The loader pattern is `**/*.md`,
   so any Markdown file there is parsed as an entry and fails validation. Each directory's
   `.gitkeep` says so.
8. **Empty-collection warnings are expected**, not a defect: the glob loader warns for
   `systems`, `experience`, `decisions`, and `lessons` until Phases 4–6 author them. Do not
   silence them by inventing content.
9. **Experience bullets carrying figures need an inline absolute date** (e.g. "1,500+
   Confluence pages … (as of Jul 2026)") to satisfy rule 2. Adding a date qualifier
   *narrows* a claim, so it stays inside Ruling 4's "never exceeds CV wording" — Phase 6
   should expect this rather than treat it as a schema problem.
10. **Phase 7 must preserve `Disallow: /dev/`** when it authors the full robots.txt, and must
    exclude `/dev/` from the sitemap. The page-level `noindex` is the second layer, not a
    substitute.

### Findings logged for Phase 8's accessibility pass

- **`--border` on `--bg` is 1.33:1, and `--bg-raised` on `--bg` is 1.07:1.** Blueprint §5
  locks these values and puts elevation in a border-plus-background shift, so card and chip
  edges are close to imperceptible for low-vision readers. This is not a WCAG AA failure —
  SC 1.4.11 governs what identifies a component or its state, and these edges identify
  neither, with all card content independently readable well above AA. It is nonetheless a
  real consequence of a locked design decision, so the contrast gate prints it on every run
  rather than hiding it. Changing a locked token is out of scope here; Phase 8's manual pass
  should decide whether to raise it as an amendment.
- The contrast gate found and fixed one genuine defect: the secondary button took its
  outline from `--border` (1.33:1) when SC 1.4.11 requires 3:1 for the boundary identifying
  a control. Fixed in usage — it now uses `--text-muted` (7.59:1). Tokens were not touched.

### OWNER-INPUT — open items

Unchanged from Phase 1; Phase 2 added none. Items 1 (domain) and 2 (Cloudflare Pages
project) remain the only ones blocking a live URL, and neither blocks Phase 3.

### Next session

Phase 3 — The Human Fast Lane (T7–T9). Open with the Phase 3 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially decisions 1 and 3.

---

## Phase 3 — The Human Fast Lane (Blueprint T7–T9) · 3 August 2026

### Shipped

- **Home**, composed in blueprint §2 order. The hero's page-local chip markup is gone,
  replaced by `EvidenceChip` (the Phase 2 hand-off). Sections 3 and 4 are driven by the
  `systems` and `experience` collections and render nothing while those are empty.
- **/about** — the career-transfer narrative, human colour in one paragraph, and the
  responsive headshot pipeline (`Headshot.astro`, AVIF/WebP via `Picture`) built and waiting
  behind an OWNER-INPUT marker.
- **/cv** — semantic HTML from `src/config/cv.ts`, with print styles that invert to black on
  white — plus `scripts/cv-pdf.mjs` producing a committed, deterministic `/public/cv.pdf`.
- **The motion system** — `src/styles/motion.css` and a ~600-byte inline reveal script. No
  animation library; still zero bundled JavaScript.
- Nav grown to About and CV; GitHub and LinkedIn moved to footer-only as Phase 1 planned.
- A plain-language notice on `/dev/components` saying it is a workshop page.

### Verification record

- Remote CI green.
- **Motion verified in a real browser across three conditions**, not asserted:
  reduced-motion → nothing ever hidden (opacity 1, no transform, root flag never set);
  JS disabled → identical; motion enabled → all 11 elements reveal on scroll, none left
  hidden.
- **Mobile checked at 390×844**: zero horizontal overflow on all four pages, exactly one
  `h1` per page, mobile nav disclosure toggles `aria-expanded`, `/cv.pdf` resolves 200
  `application/pdf`. The **CV download button sits at 683px — inside the first viewport**, so
  the recruiter journey is one tap with no scrolling, well inside the 90-second budget.
- **PDF determinism proven by hashing**: `npm run cv:pdf -- --check` renders twice and
  reports identical SHA-256. Output is 3 pages, 237KB.
- Budgets: heaviest page `/cv` at 5.8KB gz HTML + 3.4KB gz CSS ≈ 9.2KB (budget 90KB).
  **Zero bundled JS files** — both scripts are inlined, ~1.1KB raw combined (budget 15KB gz).
- All gates pass including contrast; `npm run format:check` clean; `npm audit` 0
  vulnerabilities. Lockfile regenerated from scratch after adding the dependency, and `npm ci`
  verified to reproduce the tree — the Phase 1 rule.

### Engineering decisions — Phase 4+ MUST inherit these

1. **Home sections 3 and 4 are data-driven and currently invisible.** `src/pages/index.astro`
   renders the featured-systems grid only when `getCollection('systems')` is non-empty, and
   the role snapshot only when `experience` is non-empty. **Phase 4 lights up the systems
   section purely by authoring content — do not edit Home to "add" it.** Card hrefs are
   already `/systems/{entry.id}`, so a file named `hospital-operations.md` must correspond to
   a page at `/systems/hospital-operations` or the link gate will fail.
2. **Home shows the first three systems by `order`**, and `SystemCard` shows the first three
   `stack` entries. Phase 4/5 should set `order` deliberately: the flagship hospital system
   should be `order: 1`, and the most important stack tags first.
3. **The hero has one button, not two.** Blueprint §2 specifies "See the systems" and
   "Download CV"; only the latter exists because `/systems` does not. **Phase 5 must restore
   the second button** when it ships the systems index. The omission is deliberate — a dead
   link fails the gate and inventing different wording would breach locked §1 copy.
4. **Getting an empty collection logs a warning**, e.g. *"The collection 'systems' does not
   exist or is empty"*. Expected until Phases 4–6 author content, same as decision 8 above.
   Do not silence it by inventing entries.
5. **The `.body-copy` and `.prose` classes activate the link underline slide-in** from
   `motion.css`. Case-study prose in Phase 4 should use `.prose` so links behave consistently
   with /about; nav and footer links deliberately keep their Phase 1 treatment.
6. **`data-reveal` marks a revealable element; `data-reveal-ready` is the root flag.** They
   must never share a name — see the bug below. To stagger entrances, set
   `style="--reveal-delay: 60ms"`, capped at 240ms; the helper on Home shows the pattern.
7. **Do not add a prop named `as`** (Phase 2 decision 1 still stands). `Headshot`, `Button`,
   and `SectionHeader` all avoid it.
8. **CV facts live in `src/config/cv.ts`, not in the page.** Phase 7's machine layer should
   read that module rather than parse `/cv`. If a CV fact changes, change it there and
   re-run `npm run build && npm run cv:pdf` so the PDF matches — the PDF is printed from the
   page, so nothing else is needed to keep them consistent.
9. **`npm run cv:pdf` is local-only and must never enter CI.** `playwright-core` was chosen
   over `playwright` precisely because it has no browser-download postinstall. It drives Edge
   or Chrome already installed on the machine. If CI ever needs the PDF, commit it — do not
   add a browser to the pipeline.
10. **Three narrowing edits to CV wording** are recorded in `src/config/cv.ts` with reasons:
    the venture framing replaced per Ruling 1, absolute date qualifiers added to figures per
    Ruling 3 and rule 2, and "Currently" replaced with a date per §3.5. Phase 6 will need the
    same treatment for /experience bullets (Phase 2 decision 9).
11. **Platform domains are plain text, never links** — Ruling 1 records that one page on that
    domain uses language this portfolio does not, so the portfolio does not route a reader
    there. Phase 4/5 case studies should follow this when naming platform URLs.

### The bug the browser caught that the code review did not

The reveal system was first written with the root flag and the per-element hook sharing one
attribute name, `data-reveal`. That makes `<html>` itself match `[data-reveal]` — the exact
selector the observer collects — so the root was observed, flipped to `in`, and every reveal
rule stopped matching. Reading the code, it looked correct; the three-condition browser test
showed `revealCount` of 12 instead of 11 and a root attribute reading `in`. Renamed to
`data-reveal-ready`, re-tested, correct.

The general lesson, which is the same one Phase 1 recorded in a different costume: **a
mechanism is not verified until it has been executed in the conditions it claims to handle.**
Reduced-motion support in particular is invisible to every gate in this repository — no
typecheck, no copy gate, no HTML validation, and no contrast check would have caught it.

### OWNER-INPUT — open items

Phase 3 adds **one**: the headshot (item 3, previously listed as "bites in Phase 3" — it now
does). It is marked in `src/pages/about.astro` with the exact filename and the two lines that
switch it on. The page reads correctly without it, so this is not a launch blocker until
Phase 8, but it is the last thing standing between /about and its intended form.

Otherwise unchanged: domain and Cloudflare Pages project (items 1–2) still gate a live URL;
screenshots (4) bite in Phases 4–5; lessons confirmation (5) in Phase 6; GitHub profile
rehabilitation (6) any time before launch.

### Next session

Phase 4 — Flagship Proof: the Hospital System (T10). Open with the Phase 4 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially decisions 1–3.

---

## Phase 4 — Flagship Proof: the Hospital System (Blueprint T10) · 4 August 2026

### Shipped

- **`src/layouts/CaseStudyLayout.astro`** — the reusable case-study template implementing
  blueprint §4.0 items 1–10 in order, and the anti-drift mechanism Phase 5 depends on.
- **`/systems/hospital-operations`** — the flagship case study.
- **`src/content/systems/hospital-operations.md`** — the system entry, and four decision
  entries in the `decisions` collection scoped to it.
- **`src/components/diagrams/HospitalArchitecture.astro`** — hand-authored architecture SVG
  in the token palette.
- The metric schema gained a required `caption`; the phone number moved to print-only.

### Verification record

- Remote CI green.
- **The anti-drift guard was proven by breaking it**: removing the `security` slot failed the
  build with *"Case study 'hospital-operations' is missing required section(s): security"*.
  Reverted uncommitted.
- **The route/id coupling was proven too**: renaming the content file failed the build
  immediately with *"Missing content entry: systems/hospital-operations"* — the page's own
  guard catches it before it can degrade into a subtle broken link. Reverted uncommitted.
- **Verified in a browser**: page renders with **zero images** and no holes; 0 horizontal
  overflow at 390px; exactly one `h1`; sections render in §4.0 order (Context, Constraints,
  Architecture, Decisions, Security, Operations, Limitations, Outcomes); 4 decision cards, 2
  limitations, 3 stat blocks, 3 takeaways.
- **Home's featured-systems section now renders** — 1 card, linking to
  `/systems/hospital-operations`, which returns 200. It appeared purely from authoring
  content, with no edit to Home, exactly as Phase 3 designed.
- **Diagram legibility measured, not assumed**: at 360px the SVG renders 328px wide, labels at
  13.1px and secondary text at 10.4px; every text node measured against its own box, nothing
  overflows. One label was shortened after measurement.
- Budgets: case study 10.6KB gz HTML + 2.3KB gz CSS ≈ 12.9KB (budget 90KB). Still **zero
  bundled JS**.
- All gates pass including contrast; `format:check` clean; `npm audit` 0 vulnerabilities.
- The regenerated `cv.pdf` is byte-identical to the committed one after the phone change,
  which independently confirms both determinism and that the number still prints.

### Template contract — what Phase 5 MUST inherit

1. **What is shared (do not re-implement per system).** `CaseStudyLayout` owns the section
   order and renders these from schema data, so they cannot drift: the **header** (title,
   status badge, role line, stack), the **decision cards**, the **limitations**, and the
   **outcomes block** (metrics, optional prose, three-bullet recruiter box). Section headings
   and kickers are also the layout's, not the page's.
2. **What is per-system.** Five required prose slots — `context`, `constraints`,
   `architecture`, `security`, `operations` — plus two optional ones, `outcomes` (prose above
   the takeaway box) and `gallery`. A sixth slot, `owner-input`, carries asset markers.
3. **A missing required slot fails the build.** This is the anti-drift guard. If Phase 5 finds
   a section genuinely does not apply to a system, **do not delete the requirement** — the
   correct move is to write the section saying so plainly, which is more honest anyway. If the
   section list itself must change, change it once in the layout, apply to all three, and
   record why here.
4. **A page is one file per system**, e.g. `src/pages/systems/menu-platform.astro`, and it must
   `getEntry` with a hard error if the entry is missing (copy the guard from the hospital
   page). The content file name fixes the route, so `menu-platform.md` ⇒
   `/systems/menu-platform`, which is what Home already links to.
5. **Decision cards come from the `decisions` collection**, filtered by `system` matching the
   entry id and sorted by `order`. Phase 5 authors Menu's and Electrical's the same way. The
   layout's decisions heading currently reads "Four calls, and what each one cost" — **if a
   system has a different number of decisions, that heading needs generalising once, in the
   layout, for all three.** This is the single most likely drift point.
6. **Gallery renders only if the page provides the slot.** With no images the section is
   absent, not empty. Do not ship placeholder frames.
7. **OWNER-INPUT markers must be injected with `set:html`**, not written as literal comments
   in a Fragment. A Fragment whose only children are comments renders as empty — Astro treats
   it as having no content, so the markers silently never reach the built HTML. The hospital
   page shows the pattern: an array of asset descriptions mapped to comment strings.
8. **Ruling 4 holds on every case study.** No user counts, tenant counts, revenue, or uptime
   — they do not exist in evidence. Where a reader might expect them, the hospital page says
   plainly why they are absent, in the `outcomes` slot. Phase 5 should do the same rather than
   leaving a silent gap.
9. **Metrics now require a `caption`.** Split the figure from its unit: value `256`, caption
   "CI-gated tests passing at the readiness audit", qualifier "as of Jul 2026".

### Content decisions worth knowing

- **Two limitations, not three.** Blueprint §4.1 names exactly two as mandatory and §4.0
  allows two or three. A third real finding is available from the knowledge base if the owner
  wants it published: the worker permanent-delete endpoint lacks the history guard its
  supervisor equivalent has (KB §15 finding 4, rated Medium/High). It was left out because
  publishing a potential data-loss path in a hospital system is a disclosure decision beyond
  an implementation phase, and Ruling 4 makes conservative the default. **Not a gap — a
  parked choice.**
- **The first limitation is stated without a rescue.** Its "addressed by" line says nothing
  was retrofitted, because nothing was. Softening it there would have discredited every other
  sentence on the site. Phase 6 supplies the cross-link to the readiness programme that
  followed.
- **The phone number is print-only.** Hidden from the rendered page, present in the PDF, since
  claims must match between them but contact routing need not. Residual: it is still in the
  page source, so this stops it being read, not scraped. If the owner wants it genuinely
  absent from the HTML, the PDF script would need to inject it at print time instead.

### OWNER-INPUT — open items

Phase 4 adds **five**, all gallery screenshots for the hospital case study, each recorded in
the built HTML with its exact capture and sanitisation requirements. The page is complete
without them by design. Total open markers now six, including the headshot.

Otherwise unchanged: domain and Cloudflare Pages project still gate a live URL; lessons
confirmation bites in Phase 6; GitHub profile rehabilitation any time before launch.

### Next session

Phase 5 — The System Suite (T11–T13). Open with the Phase 5 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially the template contract
above — items 3, 5, and 7 are where drift would start.
