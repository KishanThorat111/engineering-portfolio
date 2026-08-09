-- 002 — who the application is allowed to be, and what it is allowed to do.
--
-- THE INTERACTION THAT MAKES THIS FILE NECESSARY
-- 001 sets FORCE ROW LEVEL SECURITY, which subjects the table OWNER to its own
-- policies. SECURITY DEFINER functions execute as their own owner — so if the
-- two cross-tenant functions stayed owned by the role that owns the tables,
-- FORCE would apply to them too and they would return nothing. Authentication
-- would fail closed and the purge worker would never find work.
--
-- The resolution is to give those two functions a different owner: `demo_definer`,
-- a NOLOGIN role holding BYPASSRLS and owning nothing else in the database. The
-- privilege exists, it is named, it is auditable, and its blast radius is two
-- fixed-signature functions that between them return a tenant id and a list of
-- tenant ids. Nothing can log in as it.
--
-- `demo_app` — what Fastify and the purge worker actually connect as — has no
-- BYPASSRLS, does not own the tables, and cannot create anything. Its every
-- statement is subject to the policies in 001.

-- ---------------------------------------------------------------------------
-- The two cross-tenant functions move to the role that is allowed to see past
-- RLS. Everything else stays owned by the migration role and stays policed.
-- ---------------------------------------------------------------------------
ALTER FUNCTION auth_resolve_credential(text) OWNER TO demo_definer;
ALTER FUNCTION lifecycle_due_tenants(int)    OWNER TO demo_definer;

-- ---------------------------------------------------------------------------
-- The application role. Data verbs on tenant-owned tables, nothing structural.
--
-- Deliberately absent: CREATE on the schema, TRUNCATE on any table, and any
-- privilege on schema_migration. The application cannot reshape the database
-- it is being attacked through, and it cannot rewrite its own migration
-- history to hide that it did.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO demo_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenant, tenant_credential, demo_record, audit_event, tenant_budget
  TO demo_app;

GRANT EXECUTE ON FUNCTION app_current_org()                TO demo_app;
GRANT EXECUTE ON FUNCTION auth_resolve_credential(text)    TO demo_app;
GRANT EXECUTE ON FUNCTION lifecycle_due_tenants(int)       TO demo_app;

-- Advisory locks need no grant, but the purge depends on them, so the fact
-- that they are cluster-wide and not table-scoped is recorded here rather than
-- rediscovered: two workers on two hosts contend correctly, which is the
-- property the purge relies on.

-- ---------------------------------------------------------------------------
-- Revoke the public default. Without this, PUBLIC keeps EXECUTE on new
-- functions and CREATE on the public schema on older servers.
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_resolve_credential(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lifecycle_due_tenants(int)    FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO demo_app;

-- ---------------------------------------------------------------------------
-- What demo_definer needs, and only that.
--
-- BYPASSRLS exempts a role from POLICIES. It grants no table or schema
-- privileges whatsoever — those are a separate system — so revoking PUBLIC's
-- default access above silently removed the definer's ability to read anything,
-- and both SECURITY DEFINER functions began failing with 42P01: not "permission
-- denied" but "relation does not exist", because a role that cannot see a
-- schema cannot resolve names inside it.
--
-- That failure mode is worth recording rather than just fixing. Authentication
-- would have failed closed and the purge worker would have found no work, both
-- silently, on a schema that migrated cleanly. It was caught by running the
-- suite against a real database; no amount of reading would have shown it.
--
-- Least privilege holds: SELECT on the two tables these functions read, and
-- nothing on demo_record, audit_event, or tenant_budget, which they never touch.
GRANT USAGE ON SCHEMA public TO demo_definer;
GRANT SELECT ON tenant, tenant_credential TO demo_definer;
