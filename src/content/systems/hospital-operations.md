---
# The file name fixes the route: /systems/hospital-operations. Home's featured
# systems section already links to /systems/{id}, so renaming this file breaks
# that link and the CI link gate will say so.
title: 'Hospital housekeeping operations'
status: 'IN_PRODUCTION_HOSPITAL'
role: 'Sole engineer — architecture, build, security, deployment, operations'
stack:
  - 'Node.js / Fastify'
  - 'PostgreSQL / Prisma'
  - 'GCP Compute Engine'
  - 'Cloudflare R2'
  - 'Docker Compose / Caddy'
  - 'Vertex AI'
problem: 'Cleaning had to be provable in a clinical setting, not just reported by whoever did it.'
summary: >-
  A multi-tenant platform for hospital housekeeping: QR-anchored cleaning verification with
  photo evidence, maintenance ticketing that patients and nurses can raise without an account,
  staff attendance and leave, and accreditation reporting. It runs in daily production at a
  NABH-accredited hospital, on one virtual machine, operated by one engineer.

limitations:
  - limitation: >-
      There is no automated test suite. Not a thin one — none. Every deploy of a system a
      hospital uses daily rests on manual verification and a single content-freshness check
      in the pipeline (as of Jul 2026).
    addressedBy: >-
      Nothing retrofitted here yet, and saying otherwise would be the lie. What changed is
      what came next: the following platform was held behind a formal readiness programme
      with CI-gated tests and a tenant-isolation suite before its first user.
    source:
      document: 'KB:WTMS'
      ref: '§14 Testing and §15 finding 1 — no unit, integration, or end-to-end tests exist'
  - limitation: >-
      The AI cost controls — per-organisation token budgets, per-user daily caps, and the
      request rate limiter — hold their state in the process, not in shared storage. They are
      correct on one instance and would silently stop being correct on two.
    addressedBy: >-
      A deliberate trade-off at single-VM scale rather than an oversight, and recorded as the
      boundary that has to be crossed before this platform scales horizontally.
    source:
      document: 'KB:WTMS'
      ref: '§12 Cost controls and §15 finding 2 — in-process Maps, not distributed'

metrics:
  - value: '500,000'
    caption: 'Default monthly AI token budget per organisation, with an alert at 80% used'
    qualifier: 'as of Jul 2026'
    source:
      document: 'KB:WTMS'
      ref: '§12 — aiMonthlyTokenLimit default'
  - value: '100'
    caption: 'Default daily AI queries per user, on top of a 15-per-minute limit'
    qualifier: 'as of Jul 2026'
    source:
      document: 'KB:WTMS'
      ref: '§12 — aiDailyUserQueryLimit default and the per-user rate limit'
  - value: '30 days'
    caption: 'Photo retention before scheduled deletion, with the record itself kept'
    qualifier: 'as of Jul 2026'
    source:
      document: 'KB:WTMS'
      ref: '§11 — cleanupExpiredImages, cleanupTicketImages, cleanupAttendancePhotos'

takeaways:
  - 'Production accountability in a clinical environment, carried by one engineer'
  - 'Adversarial design: the system assumes its own evidence will be faked'
  - 'AI cost engineering, where the cheapest answer is tried before the model'

source:
  document: 'KB:WTMS'
  ref: '§§1, 2, 8, 10, 12, 15'
order: 1
---
