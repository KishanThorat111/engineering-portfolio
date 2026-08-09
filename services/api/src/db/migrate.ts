/**
 * Migration runner. Ordered, recorded, idempotent, and transactional per file.
 *
 * Runs as the ADMIN identity, not the application identity — the application
 * role deliberately holds no privilege to reshape the schema (migration 002).
 * This is the ELES charter rule applied here: every schema change is a
 * migration, and there are no out-of-band edits.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { env } from '../config/env.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

const APP_ROLE = 'demo_app';
const DEFINER_ROLE = 'demo_definer';

/**
 * Roles are cluster objects, not schema objects, so they cannot live in a
 * migration file that also needs to be re-runnable — and the application
 * password must not be written into a .sql file that gets committed. Both
 * reasons put role bootstrap here, parameterised, before any migration runs.
 */
async function bootstrapRoles(client: Client): Promise<void> {
  const password = env.APP_DB_PASSWORD;
  if (!password) {
    throw new Error('APP_DB_PASSWORD is required to bootstrap the application role');
  }

  // Identifiers cannot be parameterised, so they are fixed constants above
  // rather than anything derived from input. The password IS parameterised,
  // via a placeholder the DO block reads back out of a session setting.
  await client.query('SELECT set_config($1, $2, false)', ['app.bootstrap_password', password]);

  await client.query(`
    DO $bootstrap$
    BEGIN
      -- Owns the two SECURITY DEFINER functions and nothing else. Cannot log in.
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DEFINER_ROLE}') THEN
        CREATE ROLE ${DEFINER_ROLE} NOLOGIN BYPASSRLS;
      ELSE
        ALTER ROLE ${DEFINER_ROLE} NOLOGIN BYPASSRLS;
      END IF;

      -- What the API and the worker connect as. No BYPASSRLS, ever.
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
        EXECUTE format(
          'CREATE ROLE ${APP_ROLE} LOGIN NOBYPASSRLS PASSWORD %L',
          current_setting('app.bootstrap_password')
        );
      ELSE
        EXECUTE format(
          'ALTER ROLE ${APP_ROLE} LOGIN NOBYPASSRLS PASSWORD %L',
          current_setting('app.bootstrap_password')
        );
      END IF;
    END
    $bootstrap$;
  `);

  await client.query('SELECT set_config($1, $2, false)', ['app.bootstrap_password', '']);
}

export async function migrate(): Promise<string[]> {
  const connectionString = env.DATABASE_ADMIN_URL ?? env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();

  const applied: string[] = [];
  try {
    await bootstrapRoles(client);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    if (files.length === 0) {
      // A migration runner that finds nothing and reports success is the same
      // class of defect as a gate that scans nothing.
      throw new Error(`No migrations found in ${MIGRATIONS_DIR}`);
    }

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const { rowCount } = await client.query('SELECT 1 FROM schema_migration WHERE version = $1', [
        version,
      ]);
      if (rowCount && rowCount > 0) continue;

      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migration (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        applied.push(version);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${version} failed: ${(error as Error).message}`, {
          cause: error,
        });
      }
    }

    return applied;
  } finally {
    await client.end();
  }
}

// Executed directly by `npm run migrate` and by the api container's entrypoint.
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrate()
    .then((applied) => {
      console.log(
        applied.length > 0
          ? `migrate: applied ${applied.length} migration(s): ${applied.join(', ')}`
          : 'migrate: already up to date',
      );
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(`migrate: FAILED — ${(error as Error).message}`);
      process.exit(1);
    });
}
