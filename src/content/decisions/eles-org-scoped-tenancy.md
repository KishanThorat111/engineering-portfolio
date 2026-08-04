---
title: 'ADR 0003 — one database, every row scoped to its organisation'
system: 'electrical-platform'
decision: >-
  A single shared database with an organisation identifier on nearly every table, always
  derived from the verified token and never from anything the client sends. A client may state
  an organisation; the server will compare it and reject a mismatch, but it will never trust
  it.
why: >-
  A database per tenant multiplies migrations, connection pools, and provisioning by the number
  of customers, which is the wrong cost curve for one engineer. Scoping in application code
  alone was rejected outright — isolation resting purely on every future author remembering to
  add a filter has no backstop in the schema and no way to prove itself.
tradeoff: >-
  Tenant isolation becomes a discipline that has to be enforced rather than a property the
  infrastructure guarantees, so it is defended by tests instead: one regression file per
  tenant-owned resource, each asserting that another organisation gets a not-found rather than
  a forbidden, so the API never even confirms a resource exists.
featured: true
source:
  document: 'KB:ELES'
  ref: '§18 ADR 0003 and §10 the tenant-scoping contract'
order: 2
---
