---
# Filename fixes the route: /systems/menu-platform.
title: 'Digital menu platform'
status: 'LIVE'
role: 'Sole engineer — architecture, build, security, deployment, operations'
stack:
  - 'Node.js / Fastify'
  - 'PostgreSQL / Prisma'
  - 'Razorpay'
  - 'Cloudflare R2'
  - 'Docker Compose / Caddy'
  - 'Astro'
problem: 'Real money moves through code I wrote, so a double-fired payment has to be a non-event.'
summary: >-
  A live multi-tenant platform where restaurants publish a menu customers reach by scanning a
  QR code, backed by subscription billing I built and carry: a trial funnel, plan changes,
  renewals, and an activation path that stays correct when the confirmation arrives twice.

limitations:
  - limitation: >-
      Soft-deleting a tenant anonymises its personal data and sets a purge date thirty days
      out — and then nothing enforces it. No scheduled job reads that date. The purge only
      happens if someone triggers it by hand (as of Jul 2026).
    addressedBy: >-
      Named as a defect rather than a design, because the documentation and the response text
      both describe a purge that does not happen on its own. It is a scheduled job's worth of
      work, and the rule it taught me is on the engineering page: a compliance behaviour is not
      done until a job enforces it.
    source:
      document: 'KB:MENU'
      ref: '§15 finding 1 — no cron job checks purgeAfter; purge is manual-only'
  - limitation: >-
      The hourly billing cron and the menu cache both live in the process. On a second replica
      the cron would run twice and each replica would hold its own five-minute-stale cache.
      Missed ticks are not backfilled either — a deploy landing on the hour delays that tick to
      the next one (as of Jul 2026).
    addressedBy: >-
      Correct at the single replica it actually runs on, and recorded as the boundary that has
      to be crossed before a second one exists rather than discovered at the time.
    source:
      document: 'KB:MENU'
      ref: '§15 findings 2 and 3 — process-local setInterval and Map, no distributed lock'

metrics:
  - value: '61'
    caption: 'Routes served from one process, product and public menu together'
    qualifier: 'as of Jul 2026'
    source:
      document: 'KB:MENU'
      ref: '§7 API reference — 61 routes, grep-confirmed'
  - value: '6 years'
    caption: 'Payment records retained after a tenant is deleted, for GST compliance'
    qualifier: 'as of Jul 2026'
    source:
      document: 'KB:MENU'
      ref: '§6.3 — Payment and AuditLog converted to SetNull for tax retention'
  - value: '14 days'
    caption: 'Trial length, granting the middle tier regardless of the plan on the record'
    qualifier: 'as of Jul 2026'
    source:
      document: 'KB:MENU'
      ref: '§9.2 — effectivePlan() grants STANDARD-level access during TRIAL'

takeaways:
  - 'Payments engineering where the money is real and the failure modes are mine'
  - 'Privacy chosen by design, not bolted on after a policy review'
  - 'Monolith discipline: one process, one database, boundaries by structure'

source:
  document: 'KB:MENU'
  ref: '§§1, 3.4, 8, 9, 15'
order: 2
---
