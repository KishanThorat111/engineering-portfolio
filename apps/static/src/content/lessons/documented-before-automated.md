---
title: 'I documented a compliance behaviour before automating it'
whatHappened: >-
  The menu platform soft-deletes a tenant, anonymises its personal data, and sets a purge date
  thirty days out. The documentation described that purge, the API's own response text promised
  it, and the database column recording the date was populated. No scheduled job ever read it
  (as of Jul 2026).
why: >-
  Every visible artefact said the behaviour existed. The field was there, the policy was
  written, the response said so — and each of those is the kind of thing you tick off when
  checking whether something is done. What was missing was the only part that actually does
  anything, and nothing in the system was shaped to notice its absence.
cost: >-
  For a period I could not have told you the length, the platform described a data-retention
  behaviour it was not performing. Nobody was misled deliberately, which is exactly what makes
  it worth publishing: this is what an honest compliance gap looks like from the inside.
ruleChanged: >-
  A compliance claim is not finished when it is documented, and not when the schema supports
  it. It is finished when a scheduled job enforces it and a test proves the job ran. Anything
  short of that is a description of an intention.
source:
  document: 'KB:MENU'
  ref: '§15 finding 1 — purgeAfter is set but no cron job reads it'
order: 2
---
