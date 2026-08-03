---
title: 'Photo evidence that can be checked for reuse'
system: 'hospital-operations'
decision: >-
  Every cleaning submission and every self-service attendance photo is hashed on upload. If
  the same image reappears for a different worker within seven days, the record is flagged
  rather than silently accepted.
why: >-
  Photo evidence is only evidence if it cannot be trivially faked. Take one photograph of a
  clean room, or one selfie, and reuse it — and without a check, the system happily records
  work that never happened and attendance for someone who was not there.
tradeoff: >-
  It flags, it does not block. A hash catches reuse of the identical file and nothing more: a
  second photograph of the same room defeats it entirely. Blocking on a signal that weak
  would strand honest staff, so the system raises it for a human instead of enforcing it.
source:
  document: 'KB:WTMS'
  ref: '§6.2 photoHash and fraudFlags, §8.1 duplicate-photo detection, §8.5'
order: 2
---
