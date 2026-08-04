---
title: 'I shipped a hospital-production system without an automated test suite'
whatHappened: >-
  The housekeeping platform went into daily use at a NABH-accredited hospital with no unit
  tests, no integration tests, and no test runner configured at all. Not a thin suite — none
  (as of Jul 2026).
why: >-
  It worked, and it was needed. Every feature was verified by hand as it was built, the
  hospital had a problem that a working system solved, and writing tests would have delayed
  something people were waiting for. Each individual decision to defer was defensible. The
  accumulation was not.
cost: >-
  Every deploy since then rests on manual verification and one content-freshness check in the
  pipeline. There is no regression net, so the cost is not a bug that shipped — it is that I
  cannot prove one did not. It is recorded as the platform's top risk in its own documentation.
ruleChanged: >-
  The next platform did not meet a single user until it had been through a seventeen-package
  readiness programme, with CI-gated tests and a tenant-isolation regression file for every
  tenant-owned resource — 256 tests passing at its readiness audit (Electrical platform, as of
  Jul 2026). Tests before users, not after incidents.
crossLink:
  label: 'See the readiness programme that came out of it'
  href: '/systems/electrical-platform'
source:
  document: 'KB:WTMS'
  ref: '§14 Testing and §15 finding 1 — no automated test suite exists'
order: 1
---
