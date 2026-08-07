---
title: 'QR-scoped identity instead of accounts'
system: 'hospital-operations'
decision: >-
  Patients, nurses, and housekeeping workers act without an account. A scanned QR code
  resolves a specific location server-side, and that location identity — plus per-route rate
  limiting — is the authorisation.
why: >-
  The alternative was issuing credentials to every ward visitor and every worker on a shift
  rota that changes weekly. Nobody would have used it. A person reporting a broken light gets
  one job to do, and asking them to register first means the fault goes unreported.
tradeoff: >-
  Accepting that the public surface is the largest attack surface in the system. It is paid
  for with per-route limits on every unauthenticated endpoint, server-side resolution of the
  organisation so a client can never assert one, and rate limiting as the standing defence
  rather than an afterthought.
source:
  document: 'KB:WTMS'
  ref: '§1 Target users, §7.10 public.js, §10.5 rate limiting'
order: 1
---
