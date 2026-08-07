---
# Filename fixes the route: /systems/electrical-platform.
title: 'Electrical inspection platform'
status: 'PRE_LAUNCH'
statusDetail: 'Q3 2026'
role: 'Sole engineer — architecture, build, security, deployment, operations'
stack:
  - 'Node.js / Fastify'
  - 'PostgreSQL / Prisma'
  - 'AWS EC2'
  - 'Cloudflare R2'
  - 'Docker Compose / Caddy'
  - 'node:test'
problem: 'Everything I learned running a system without a safety net, applied before the first user arrives.'
summary: >-
  A multi-tenant platform for electrical inspections and facility fault reporting, held behind
  a formal readiness programme rather than shipped when it worked. It has no production users
  yet, and this page is about why that is a deliberate state rather than a delay.

limitations:
  - limitation: >-
      Nobody uses it. There are no production users, no operating history, and nothing here has
      survived contact with a real workload. Its most recent readiness audit returned a
      not-ready verdict with two critical blockers still open (as of Jul 2026).
    addressedBy: >-
      That verdict is the programme working rather than failing. The blockers are what stands
      between this and a launch date, and the honest reading of every claim below is that it
      describes engineering practice, not proven operation.
    source:
      document: 'KB:ELES'
      ref: '§1 current status and §19 frozen audit — NOT READY, two critical findings'
  - limitation: >-
      Real-time notifications are delivered from a registry that lives inside the process. On
      one instance that is correct. On two, a push raised on one instance never reaches a
      client connected to the other, and the delivery silently degrades to the polling fallback
      (as of Jul 2026).
    addressedBy: >-
      Identified as the single largest obstacle to running more than one instance, with both
      candidate fixes written down and neither pretended to be done. Scheduled jobs were
      already made safe across instances; this was not.
    source:
      document: 'KB:ELES'
      ref: '§12 notifications and §14 horizontal scaling readiness'
  - limitation: >-
      There is no external monitoring. Health endpoints and a container restart policy are the
      whole of it, and error alerting — which is built — was not configured in the environment
      that was audited, so a sustained failure would page nobody (as of Jul 2026).
    addressedBy: >-
      Written down as a known gap in the monitoring documentation rather than discovered during
      an incident, and it is on the list to close before launch.
    source:
      document: 'KB:ELES'
      ref: '§16 what is not monitored, §19 finding H2'

metrics:
  - value: '256'
    caption: 'Automated tests passing at the readiness audit, gating every deploy'
    qualifier: 'Electrical platform, as of Jul 2026'
    source:
      document: 'KB:ELES'
      ref: '§17 Testing — 256 passing, 0 failures, post-WP17'
  - value: '21'
    caption: 'Tenant-isolation regression files, one per tenant-owned resource area'
    qualifier: 'Electrical platform, as of Jul 2026'
    source:
      document: 'KB:ELES'
      ref: '§17 — 21 tenant-isolation-*.test.js integration files'
  - value: '17'
    caption: 'Work packages in the production-readiness programme'
    qualifier: 'Electrical platform, as of Jul 2026'
    source:
      document: 'KB:ELES'
      ref: '§1 — the WP1 to WP17 hardening programme'
  - value: '4'
    caption: 'Architecture decision records, three of them written after the fact'
    qualifier: 'Electrical platform, as of Jul 2026'
    source:
      document: 'KB:ELES'
      ref: '§18 — four accepted ADRs, 0002 to 0004 backfilled'

takeaways:
  - 'Test architecture designed in tiers, not accumulated as an afterthought'
  - 'Governance written down and enforced, so it survives a bad week'
  - 'Honest pre-launch labelling, including an audit verdict that says not yet'

source:
  document: 'KB:ELES'
  ref: '§§1, 10, 14, 16, 17, 18, 19'
order: 3
---
