---
title: 'Data-protection rules designed in, not bolted on'
system: 'hospital-operations'
decision: >-
  India's DPDP Act shaped the schema from the first migration: identity and health fields
  encrypted with AES-256-GCM before they reach a column, guest contact details anonymised
  automatically once they pass the retention window — 180 days as of Jul 2026 — a
  self-service personal-data export endpoint, and an audit trail behind nearly every state
  change.
why: >-
  Retrofitting privacy means a migration across live hospital data, and it means the period
  before that migration was non-compliant. Building it in costs a few days at the start; the
  alternative costs a project later and leaves a gap in between that cannot be undone.
tradeoff: >-
  Encryption at the application layer means those fields cannot be searched or indexed in the
  database, so any future feature needing to query them will need rework. That was accepted
  as the cheaper of the two problems.
source:
  document: 'KB:WTMS'
  ref: '§6.5 crypto.js, §10.9 DPDP features, §11 anonymizeGuestData'
order: 4
---
