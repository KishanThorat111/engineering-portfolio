/**
 * Test environment. Points the suite at the dev stack in infra/compose.dev.yml.
 *
 * These tests talk to a REAL PostgreSQL with the REAL migrations applied and a
 * REAL Redis. Nothing here is mocked, because the thing under test is whether
 * the database enforces a boundary — and a mocked database enforces whatever
 * the mock was written to enforce, which is a test of the author's assumptions
 * rather than of Postgres.
 */
process.env.NODE_ENV ??= 'test';
process.env.LOG_LEVEL ??= 'error';
process.env.DATABASE_ADMIN_URL ??= 'postgres://cpadmin:devpassword@127.0.0.1:55432/control_plane';
process.env.APP_DB_PASSWORD ??= 'devapppassword';
process.env.DATABASE_URL ??= 'postgres://demo_app:devapppassword@127.0.0.1:55432/control_plane';
process.env.REDIS_URL ??= 'redis://127.0.0.1:56379';
process.env.IP_HASH_PEPPER ??= 'test-pepper-value-at-least-16-chars';
process.env.ADMIN_TOKEN ??= 'test-admin-token-at-least-24-characters';
process.env.TENANT_TTL_SECONDS ??= '1800';
process.env.PURGE_INTERVAL_MS ??= '1000';
/*
 * The provisioning limiter is raised for suites that are not testing it — the
 * lifecycle suite legitimately creates a dozen tenants and would otherwise be
 * measuring the rate limiter instead of the purge. `??=` means a test file that
 * sets these before importing the harness keeps its own value, which is how
 * rate-limit.test.js pins them low enough to assert on.
 */
process.env.RATE_LIMIT_PROVISION_PER_HOUR ??= '10000';
process.env.RATE_LIMIT_GLOBAL_PER_MINUTE ??= '10000';
// Off in tests: the suite asserts on database behaviour, and an exporter
// retrying against a collector that may not be up adds noise and latency to
// every case without testing anything.
process.env.OTEL_ENABLED ??= 'false';
