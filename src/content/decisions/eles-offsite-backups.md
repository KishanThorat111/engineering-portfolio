---
title: 'ADR 0001 — offsite backups on storage that already exists'
system: 'electrical-platform'
decision: >-
  Database dumps are compressed and pushed to the same object storage the application already
  uses for images, under a separate prefix, pruned on a fixed schedule locally and offsite.
why: >-
  A backup that lives on the machine it is backing up is not a backup. Reusing storage that is
  already provisioned, credentialed, and paid for meant offsite copies could start immediately
  rather than after an account-opening exercise, with a documented path to a dedicated bucket
  later.
tradeoff: >-
  Sharing credentials with the image path couples the two: a permissions problem breaks both at
  once, and a restore drill found exactly that — every storage operation refused, which would
  mean no offsite backup and failing uploads at the same time. Cheap to start, and the coupling
  is the bill.
source:
  document: 'KB:ELES'
  ref: '§18 ADR 0001 and §14 backup and disaster recovery'
order: 4
---
