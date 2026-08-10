-- 003 — the state the five demonstrations own.
--
-- Two new tenant-owned tables, both under the same two isolation layers as
-- everything in 001: server-derived scoping in the application, and RLS in the
-- database, FORCED, against a role that cannot bypass it. A demonstration of
-- security that itself sat outside the security model would be the exact
-- decoration the dossier's §1.3 corollary rules out.
--
-- What is NOT here is as deliberate as what is. The AI station stores no table
-- of its own: its evidence is the audit trail and the budget row that already
-- exist, because inventing a parallel log for one demonstration would give the
-- experience two places to read the same fact from. Same for the rate-limit
-- station, whose state is Redis counters and whose evidence is an audit row.

-- ---------------------------------------------------------------------------
-- PAYMENTS — idempotent activation.
--
-- The uniqueness constraint IS the demonstration. Two webhooks racing on the
-- same idempotency key are resolved by the database refusing the second insert,
-- not by an application check that reads and then writes — which is the bug
-- this pattern exists to prevent, because between the read and the write is
-- exactly where the duplicate charge lives.
--
-- Scoped per tenant, because two tenants replaying the same provider event id
-- are two different facts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_activation (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  idempotency_key    text NOT NULL,
  -- Which path won the race. Menu's real flow has two: the provider's webhook
  -- and the client returning from checkout. Both must be safe, and either may
  -- arrive first.
  activated_via      text NOT NULL CHECK (activated_via IN ('webhook', 'client')),
  subscription_ref   text NOT NULL,
  amount_minor       integer NOT NULL CHECK (amount_minor > 0),
  currency           text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  activated_at       timestamptz NOT NULL DEFAULT now(),
  -- Every subsequent arrival for this key. The no-op is counted rather than
  -- discarded, because "it was ignored" is the thing the visitor came to see.
  replay_count       integer NOT NULL DEFAULT 0,
  last_replay_at     timestamptz,
  first_correlation  text NOT NULL,
  CONSTRAINT payment_activation_key_unique UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS payment_activation_tenant_idx
  ON payment_activation (tenant_id, activated_at DESC);

-- ---------------------------------------------------------------------------
-- FRAUD — duplicate photo detection.
--
-- Hash-based, matching the pattern the hospital platform runs: photo evidence
-- is only evidence if it cannot be reused. The unique index does the rejecting,
-- so a race between two identical uploads has the same outcome as a sequence.
--
-- The image itself is never stored. Only its digest, its size, and its declared
-- type — this is a public upload endpoint on a demo plane, and holding
-- visitor-supplied bytes would be a liability with no demonstrative value.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_submission (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  image_sha256   text NOT NULL CHECK (image_sha256 ~ '^[0-9a-f]{64}$'),
  label          text NOT NULL,
  byte_length    integer NOT NULL CHECK (byte_length > 0),
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  -- Rejected duplicates are counted on the ORIGINAL row rather than inserted as
  -- their own, so the table holds accepted evidence only and the collision
  -- count sits next to the thing it collided with.
  duplicate_attempts integer NOT NULL DEFAULT 0,
  last_duplicate_at  timestamptz,
  CONSTRAINT fraud_submission_hash_unique UNIQUE (tenant_id, image_sha256)
);

CREATE INDEX IF NOT EXISTS fraud_submission_tenant_idx
  ON fraud_submission (tenant_id, submitted_at DESC);

-- ---------------------------------------------------------------------------
-- Same isolation model as every other tenant-owned table.
-- ---------------------------------------------------------------------------
ALTER TABLE payment_activation ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_activation FORCE  ROW LEVEL SECURITY;
ALTER TABLE fraud_submission   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_submission   FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_activation_scope ON payment_activation;
CREATE POLICY payment_activation_scope ON payment_activation
  USING (tenant_id = app_current_org())
  WITH CHECK (tenant_id = app_current_org());

DROP POLICY IF EXISTS fraud_submission_scope ON fraud_submission;
CREATE POLICY fraud_submission_scope ON fraud_submission
  USING (tenant_id = app_current_org())
  WITH CHECK (tenant_id = app_current_org());

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_activation, fraud_submission TO demo_app;

-- ---------------------------------------------------------------------------
-- The purge must destroy these too.
--
-- src/domain/tenant.ts deletes them explicitly; this comment exists because the
-- coupling is easy to miss. A new tenant-owned table that the purge does not
-- know about would survive its tenant's TTL, which is precisely the
-- documented-but-never-executed retention failure the project publishes as a
-- lesson. tenant-lifecycle-purge.test.js asserts both are emptied.
-- ---------------------------------------------------------------------------
