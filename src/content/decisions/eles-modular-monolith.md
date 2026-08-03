---
title: 'ADR 0002 — a modular monolith, not microservices'
system: 'electrical-platform'
decision: >-
  One Node process and one database, with boundaries drawn by module structure rather than by
  network calls. Four feature modules an organisation can switch on individually, all running
  in the same process.
why: >-
  Microservices would buy independent deployment at the cost of network hops, distributed
  transactions, and an auth story repeated per service — overhead a single engineer on a
  single machine cannot justify. Serverless was rejected for a more specific reason: this
  application needs long-lived processes for scheduled jobs, streaming connections, and
  connection pooling.
tradeoff: >-
  Module boundaries are a convention rather than an enforced barrier, so nothing but review
  stops one module reaching into another's tables. The decision was made binding instead:
  adding a queue, an event bus, a cache server, or a second service now requires a new
  architecture record, not a pull request.
source:
  document: 'KB:ELES'
  ref: '§18 ADR 0002 and §20 Charter §5'
order: 1
---
