---
title: 'Two paths confirm a payment, and they are allowed to race'
system: 'menu-platform'
decision: >-
  A captured payment is confirmed twice over: once by the browser posting back the gateway's
  signed response, and once by the gateway's own webhook. Both call the same activation
  function, which is idempotent — if the payment is already recorded as captured it does
  nothing and reports that it was already done.
why: >-
  Each path fails on its own. The browser can be closed the instant after paying, so the
  client callback never arrives. The webhook can be delayed, retried, or arrive first. Relying
  on either alone means a subscription somebody paid for silently not activating, which is the
  one failure a paying customer never forgives.
tradeoff: >-
  Two paths into one state transition means the ordering has to be assumed to be arbitrary,
  so activation runs inside a transaction and every write it touches has to be safe to attempt
  twice. That is more care than a single path would need, spent on the part of the system that
  handles other people's money.
source:
  document: 'KB:MENU'
  ref: '§3.4 payment activation flow and §8.5 payment security'
order: 1
---
