-- 001 — the control plane's data model, and the isolation boundary itself.
--
-- TWO LAYERS, DELIBERATELY ADDITIVE (dossier §7.1 as amended, ruling A10)
-- ----------------------------------------------------------------------
-- Layer 1 is server-derived orgId scoping: every tenant-owned query carries
-- `tenant_id = $currentOrg`, where the value comes from the verified credential
-- and never from anything the client sent. That is the pattern ADR-0003
-- describes and the pattern the production KodSpot platforms actually run.
--
-- Layer 2 is PostgreSQL row-level security, enforced here, by the database,
-- against a role that cannot bypass it. The production platforms do NOT have
-- this layer. The demo does, and the P2 inspector says so plainly rather than
-- implying the hospital works this way.
--
-- The distinction has to stay observable, because P2's peak is built on
-- showing it: strip layer 1 from a query and the rows still do not appear,
-- because layer 2 refuses them. A test proves exactly that
-- (test/integration/tenant-isolation-rls-enforcement.test.js).
--
-- HOW THE TENANT CONTEXT REACHES THE DATABASE
-- Every tenant-scoped statement runs inside a transaction that begins with
-- `SET LOCAL app.current_org = '<uuid>'`. LOCAL matters: the setting dies with
-- the transaction, so a pooled connection can never leak one tenant's scope
-- into the next tenant's query. `withTenant()` in src/db/pool.ts is the only
-- place that sets it.
--
-- THE TWO CROSS-TENANT CAPABILITIES, AND WHY THERE ARE EXACTLY TWO
-- RLS creates two genuine chicken-and-egg problems. Authentication must find a
-- credential before it knows which tenant it belongs to, and the purge worker
-- must discover expired tenants before it can scope itself to one. Both are
-- solved by narrow SECURITY DEFINER functions with fixed signatures, below —
-- not by a role with BYPASSRLS, and not by arbitrary SQL. Everything else in
-- the system runs inside a tenant scope, including the purge itself.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Migration bookkeeping. Not tenant-owned, so no RLS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migration (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Helper: the current tenant scope, or NULL when none is set.
--
-- `true` as the second argument makes a missing setting return NULL instead of
-- raising, and NULLIF turns the empty string into NULL as well. Both matter:
-- if this returned garbage rather than NULL, an unscoped session could compare
-- against it and match something.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_org', true), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The identifier a visitor sees and pastes into curl. Random, not sequential:
  -- tenant enumeration must not be a matter of counting.
  public_ref        text NOT NULL UNIQUE,
  label             text NOT NULL,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'purged')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- The TTL is persisted, not held in memory. A worker restart must not lose
  -- the fact that a tenant is due to die.
  expires_at        timestamptz NOT NULL,
  purge_started_at  timestamptz,
  purged_at         timestamptz,
  CONSTRAINT tenant_purged_consistency
    CHECK ((status = 'purged') = (purged_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS tenant_due_idx
  ON tenant (expires_at)
  WHERE purged_at IS NULL;

-- ---------------------------------------------------------------------------
-- Credentials. The secret is never stored, only its SHA-256.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_credential (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  -- A non-secret prefix so a key can be identified in logs and in the UI
  -- without the key itself ever being written down.
  key_prefix   text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

CREATE INDEX IF NOT EXISTS tenant_credential_tenant_idx
  ON tenant_credential (tenant_id);

-- ---------------------------------------------------------------------------
-- Tenant-owned demo records — the rows that are seeded on provision and that
-- the P2 break-out demonstration will try to read across the boundary.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_record (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('seeded', 'created')),
  title        text NOT NULL,
  body         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_record_tenant_idx
  ON demo_record (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Audit events.
--
-- These SURVIVE the purge, on purpose. §2.8 has the visitor leave with their
-- session's audit log and A14 makes a signed permalink the primary way they do
-- it, so destroying the record at purge time would destroy the take-away. What
-- the purge removes is the tenant's DATA; what it keeps is the evidence that
-- the tenant existed, what was attempted against it, and that it was purged on
-- schedule. No personal data is written here — see the ip_hash note.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  action          text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('allowed', 'denied', 'error')),
  actor           text NOT NULL,
  resource_type   text,
  resource_id     text,
  -- Correlation identity. trace_id/span_id are the REAL OpenTelemetry ids of
  -- the span this event happened inside, so an audit row and its span can be
  -- joined later. They are recorded, never invented — when no span is active
  -- these are null rather than filled with something plausible.
  correlation_id  text NOT NULL,
  trace_id        text,
  span_id         text,
  -- Hashed and salted, never the address itself: the privacy-by-design pattern
  -- the Menu platform already uses for visitor identifiers.
  ip_hash         text,
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_event_tenant_idx
  ON audit_event (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_event_correlation_idx
  ON audit_event (correlation_id);

-- ---------------------------------------------------------------------------
-- Budget (ruling A11 foundation).
--
-- P1 creates and enforces nothing beyond the row's existence and its
-- arithmetic; P2 does the cost routing. What matters now is that exhaustion is
-- representable as a STATE rather than an error, so P2 can implement "the
-- model budget is spent for today" as a designed outcome without a schema
-- change. `exhausted_at` exists for exactly that reason.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_budget (
  tenant_id      uuid PRIMARY KEY REFERENCES tenant(id) ON DELETE CASCADE,
  tokens_limit   bigint NOT NULL CHECK (tokens_limit >= 0),
  tokens_used    bigint NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  exhausted_at   timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
--
-- FORCE matters as much as ENABLE. Without FORCE, the role that owns a table is
-- exempt from its own policies, so if the application ever connected as the
-- owner — by accident or by a future change to the compose file — RLS would
-- silently stop applying and every gate here would still pass. FORCE removes
-- that failure mode instead of documenting it.
-- ---------------------------------------------------------------------------
ALTER TABLE tenant            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant            FORCE  ROW LEVEL SECURITY;
ALTER TABLE tenant_credential ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_credential FORCE  ROW LEVEL SECURITY;
ALTER TABLE demo_record       ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_record       FORCE  ROW LEVEL SECURITY;
ALTER TABLE audit_event       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_event       FORCE  ROW LEVEL SECURITY;
ALTER TABLE tenant_budget     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_budget     FORCE  ROW LEVEL SECURITY;

-- The tenant row itself. Provisioning works without an escape hatch because
-- the application generates the uuid and sets app.current_org to it BEFORE the
-- insert, so WITH CHECK is satisfied by a scope the server chose.
DROP POLICY IF EXISTS tenant_self ON tenant;
CREATE POLICY tenant_self ON tenant
  USING (id = app_current_org())
  WITH CHECK (id = app_current_org());

DROP POLICY IF EXISTS tenant_credential_scope ON tenant_credential;
CREATE POLICY tenant_credential_scope ON tenant_credential
  USING (tenant_id = app_current_org())
  WITH CHECK (tenant_id = app_current_org());

DROP POLICY IF EXISTS demo_record_scope ON demo_record;
CREATE POLICY demo_record_scope ON demo_record
  USING (tenant_id = app_current_org())
  WITH CHECK (tenant_id = app_current_org());

DROP POLICY IF EXISTS audit_event_scope ON audit_event;
CREATE POLICY audit_event_scope ON audit_event
  USING (tenant_id = app_current_org())
  WITH CHECK (tenant_id = app_current_org());

DROP POLICY IF EXISTS tenant_budget_scope ON tenant_budget;
CREATE POLICY tenant_budget_scope ON tenant_budget
  USING (tenant_id = app_current_org())
  WITH CHECK (tenant_id = app_current_org());

-- ---------------------------------------------------------------------------
-- CROSS-TENANT CAPABILITY 1 of 2 — credential resolution.
--
-- Authentication cannot scope itself to a tenant it has not identified yet.
-- This function takes a hash and returns at most one row. It cannot be used to
-- enumerate, it accepts no predicate, and it returns no secret. SECURITY
-- DEFINER runs it as the owner so it sees past RLS; the fixed signature is what
-- keeps that safe.
-- ---------------------------------------------------------------------------
-- Revoked credentials are RETURNED, with their revocation, rather than filtered
-- out. Filtering them made a purged tenant indistinguishable from a key that
-- never existed — both produced a bare 401 — which threw away the consequence
-- beat: the visitor is supposed to learn that their tenant reached its TTL and
-- was destroyed on schedule, not that their key is "invalid". The caller
-- decides what to say; this function only reports what is true.
--
-- Disclosing "this key was real and its tenant is gone" is not an oracle worth
-- worrying about: the key is a 192-bit secret, so anyone who can present one
-- already had it.
CREATE OR REPLACE FUNCTION auth_resolve_credential(p_key_hash text)
RETURNS TABLE (
  tenant_id uuid,
  credential_id uuid,
  tenant_status text,
  expires_at timestamptz,
  revoked_at timestamptz,
  public_ref text
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT c.tenant_id, c.id, t.status, t.expires_at, c.revoked_at, t.public_ref
    FROM tenant_credential c
    JOIN tenant t ON t.id = c.tenant_id
   WHERE c.key_hash = p_key_hash
   LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- CROSS-TENANT CAPABILITY 2 of 2 — lifecycle discovery.
--
-- The purge worker needs the ids of tenants past their TTL. It gets ids and
-- nothing else, capped by a batch size. Having discovered one, the worker then
-- scopes itself to that tenant and does the deleting UNDER RLS — so a bug in
-- the purge cannot reach another tenant's rows. The narrow hatch is for
-- finding work, never for doing it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lifecycle_due_tenants(p_limit int)
RETURNS TABLE (tenant_id uuid)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT t.id
    FROM tenant t
   WHERE t.purged_at IS NULL
     AND t.expires_at <= now()
   ORDER BY t.expires_at ASC
   LIMIT GREATEST(p_limit, 0);
$$;
