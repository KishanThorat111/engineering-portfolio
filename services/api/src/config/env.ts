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

  /* --- P2, the proof engine ------------------------------------------- */

  /**
   * HMAC secret for the payments demonstration's webhook signatures.
   *
   * Real verification with `timingSafeEqual`, matching the Menu platform's
   * actual flow. A demonstration of payment security that skipped signature
   * verification would be demonstrating the absence of it.
   */
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),

  /**
   * Signs the session-receipt permalink (A14).
   *
   * Stateless: the token carries the tenant and an expiry and is verified by
   * HMAC, so a receipt keeps rendering after the tenant's rows are gone —
   * which is the point, since the audit history deliberately survives the purge.
   */
  RECEIPT_SIGNING_KEY: z.string().min(32).optional(),
  RECEIPT_TTL_SECONDS: z.coerce.number().int().positive().default(604_800),

  /** Bounds the fraud station's uploads. */
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(2_097_152).default(524_288),

  /**
   * The model plane.
   *
   * Unset means no provider is configured, and the AI station says so rather
   * than inventing an answer. The routing decision, the budget arithmetic, the
   * span, and the audit record are real either way — what a missing provider
   * removes is the model's reply, and principle 12 says we disclose that rather
   * than fake it.
   */
  MODEL_API_URL: z.string().url().optional(),
  MODEL_API_KEY: z.string().min(8).optional(),
  MODEL_NAME: z.string().default('unconfigured'),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),

  /**
   * A11's global ceiling: the whole demo's model spend for one day, across
   * every tenant. Per-tenant budgets stop one visitor exhausting the estate;
   * this stops the estate exhausting the owner's wallet. Exhaustion is a
   * designed, disclosed state at both levels.
   */
  MODEL_DAILY_TOKEN_CEILING: z.coerce.number().int().min(0).default(200_000),

  /** The rate-limit station's own tight bucket, separate from the global one. */
  RATE_LIMIT_STATION_PER_MINUTE: z.coerce.number().int().positive().default(10),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('control-plane-api'),
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  /*
   * An empty string means unset.
   *
   * Docker Compose's `${VAR:-}` idiom substitutes an empty string when the
   * variable is absent, so an optional field arrives as "" rather than
   * undefined — and `.optional()` reads that as present-and-invalid, failing
   * the boot with "Invalid URL" for a setting nobody configured. Stripping
   * empties first is what makes optional actually optional; it also makes a
   * genuinely-missing required value report "Required" instead of a confusing
   * length or format complaint.
   */
  const present: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.trim() !== '') present[key] = value;
  }

  const parsed = schema.safeParse(present);
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
    // Both demonstrations would be dishonest without their secret: an unsigned
    // webhook proves nothing about signature verification, and an unsigned
    // receipt permalink is a tenant-id-guessing game rather than a capability.
    if (!env.PAYMENT_WEBHOOK_SECRET) missing.push('PAYMENT_WEBHOOK_SECRET');
    if (!env.RECEIPT_SIGNING_KEY) missing.push('RECEIPT_SIGNING_KEY');
    if (missing.length > 0) {
      throw new Error(`Missing required production environment: ${missing.join(', ')}`);
    }
  }

  return env;
}

export const env = load();
