---
title: 'One process serves the product and the public menu'
system: 'menu-platform'
decision: >-
  A single Fastify process serves the JSON API, the restaurant's dashboard, the platform
  console, and the public menu that diners scan into. A separate static marketing site sits
  behind the same reverse proxy, routed by an explicit list of paths that belong to the product.
why: >-
  There is one engineer. Splitting this into services would add network hops, deployment
  surface, and distributed failure modes to a system whose entire load fits on one machine —
  paying an operational tax to solve a scale problem it does not have.
tradeoff: >-
  Most of the business logic sits in one very large file, which is harder to navigate than a
  set of small ones and offers no enforced internal boundary. The routing allowlist is also a
  thing to maintain: a new product path that nobody adds to it silently falls through to the
  marketing site instead.
source:
  document: 'KB:MENU'
  ref: '§1 architecture style, §14.2 front-door routing allowlist'
order: 3
---
