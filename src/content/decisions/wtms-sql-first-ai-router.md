---
title: 'Try the database before you try the model'
system: 'hospital-operations'
decision: >-
  A regex classifier inspects each assistant question first and routes the common ones —
  dashboard figures, overdue rounds, staff lookups, ticket counts, attendance trends — to
  templated SQL that costs nothing. Only what the classifier does not recognise reaches a
  language model.
why: >-
  Most operational questions have exactly one correct answer that lives in the database.
  Paying a model to rediscover it is slower, less reliable, and metered. A kill switch drops
  the whole assistant to data-only mode, so the feature degrades to useful rather than to
  broken when a provider is unavailable.
tradeoff: >-
  A hand-written classifier is a maintenance surface: every new question shape someone tries
  either matches a pattern or silently costs money. It is a running cost in attention, paid
  to keep the running cost in currency near zero.
featured: true
source:
  document: 'KB:WTMS'
  ref: '§12 — SQL_PATTERNS classifier, VERTEX_AI_ENABLED kill switch, AiUsageLog'
order: 3
---
