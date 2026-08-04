---
title: 'ADR 0004 — resilience nobody has to remember'
system: 'electrical-platform'
decision: >-
  The database circuit breaker is wired into the query client itself, so every call inherits it
  without opting in. The AI breaker sits inside the one shared function every AI call goes
  through. Scheduled jobs take a database advisory lock, so only one instance runs a given tick.
why: >-
  Both breakers already existed and were wired into almost nothing — protection depended on
  each author remembering to wrap each call, which is a policy that degrades quietly and gives
  no signal when it has. Making the safe path the only path removes the memory from the loop.
  The locks use the database rather than a lock server, because adding infrastructure to a
  deliberately single-process deployment would undo the previous decision.
tradeoff: >-
  Behaviour that fires at every call site is harder to reason about at any one of them, and the
  client extension covers per-model operations rather than raw queries, so the coverage is
  broad rather than total. Knowing exactly where it does not reach is part of the cost.
featured: true
source:
  document: 'KB:ELES'
  ref: '§18 ADR 0004 and §11 circuit breakers and scheduler locks'
order: 3
---
