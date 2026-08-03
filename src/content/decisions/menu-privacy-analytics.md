---
title: 'Analytics that never learn who you are'
system: 'menu-platform'
decision: >-
  A menu visit is counted against a salted hash of the visitor's address, the date, and the
  tenant. The raw address is never written down. Payment and audit records deliberately
  outlive the tenant they belong to, because Indian tax rules require them to be kept.
why: >-
  A restaurant wants to know how many people looked at its menu today. It does not need to
  know which people, and holding that would mean holding personal data with no purpose to
  justify it. Hashing with the date built into the input means yesterday's identifier cannot
  be linked to today's.
tradeoff: >-
  Deduplication is only ever approximate, and a visitor cannot be followed across days even
  when that would be genuinely useful for the tenant. Retention also stops being uniform: some
  rows are purged with the tenant while payment records survive it by six years, so deletion
  is a policy per table rather than one sweep.
source:
  document: 'KB:MENU'
  ref: '§8.9 data protection and §6.3 cascade design intent'
order: 2
---
