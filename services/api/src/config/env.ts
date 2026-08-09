/**
 * The environment contract, validated once at boot.
 *
 * A control plane that is deliberately attackable should refuse to start
 * misconfigured rather than discover it under load. Everything the process
 * needs is declared here and parsed before anything connects, so a missing
 * secret is a startup error naming the variable, not a 500 at 3am naming
 * nothing.
 */
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /** Fastify binds here. In production this is reachable only through Caddy. */
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(8080),

  /** The application identity: no BYPASSRLS, not the table owner. */
  DATABASE_URL: z.string().min(1),
  /** The migration identity: used by `npm run migrate`, never by the server. */
  DATABASE_ADMIN_URL: z.string().min(1).optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),

  /** Password for the demo_app role, used only by the bootstrap step. */
  APP_DB_PASSWORD: z.string().min(8).optional(),

  REDIS_URL: z.string().min(1),

  /**
   * Salt for hashing client addresses before they reach an audit row. Without
   * it the audit log would hold personal data; with it the same visitor is
   * still correlatable within a deployment and identifiable outside it by
   * nobody. Must be set in production — see the refinement below.
   */
  IP_HASH_PEPPER: z.string().min(16).optional(),

  /** Tenant lifecycle. Short by design: the visitor watches it expire. */
  TENANT_TTL_SECONDS: z.coerce.number().int().positive().max(86_400).default(1_800),
  TENANT_SEED_RECORDS: z.coerce.number().int().min(1).max(50).default(8),
  TENANT_DEFAULT_TOKEN_BUDGET: z.coerce.number().int().min(0).default(50_000),

  /** Bounded creation — see routes/records.ts. */
  TENANT_MAX_RECORDS: z.coerce.number().int().positive().max(500).default(100),
  MAX_BODY_BYTES: z.coerce.number().int().positive().max(1_048_576).default(16_384),

  /** Purge scheduling. Interval is short so the loop is observable. */
  PURGE_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  PURGE_BATCH_SIZE: z.coerce.number().int().positive().max(200).default(25),

  /** Fastify's own limiter. Cloudflare's edge limiter sits IN FRONT (A13). */
  RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_PROVISION_PER_HOUR: z.coerce.number().int().positive().default(10),

  /** Guards the administrative purge trigger, which is a debugging aid only. */
  ADMIN_TOKEN: z.string().min(24).optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('control-plane-api'),
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }

  const env = parsed.data;

  /*
   * Two things are optional in development and mandatory in production. Making
   * them optional in the schema and required here keeps local runs frictionless
   * without letting a production deploy start without a pepper — which would
   * silently write unsalted address hashes into the audit log, a privacy defect
   * that no test would notice.
   */
  if (env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!env.IP_HASH_PEPPER) missing.push('IP_HASH_PEPPER');
    if (!env.ADMIN_TOKEN) missing.push('ADMIN_TOKEN');
    if (missing.length > 0) {
      throw new Error(`Missing required production environment: ${missing.join(', ')}`);
    }
  }

  return env;
}

export const env = load();
