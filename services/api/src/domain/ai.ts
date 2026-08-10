/**
 * Demonstration 4 — SQL-first routing, and the cost of not needing a model.
 *
 * §2.6: "Ask an operational question. Watch the packet never leave the data
 * plane — answered by SQL at zero model cost. Then ask something SQL cannot
 * handle: watch it escalate to the model plane and the token budget decrement
 * in real time."
 *
 * This mirrors the hospital platform's actual router: a regex-matched set of
 * known operational questions answered directly from the database, with the
 * model reserved for what the set does not cover. The point is economic — most
 * of what an operator asks a system is a query, and paying a model to write
 * that query is a decision nobody made deliberately.
 *
 * WHAT IS REAL HERE, AND WHAT IS DISCLOSED
 * The routing decision, the SQL, the answer, the token accounting, the span,
 * and the audit record are all real. The model plane is a real HTTP call to a
 * configured provider — and when no provider is configured, the response says
 * exactly that instead of inventing a reply. Principle 12 is not suspended
 * because a credential is missing; a system that fabricated an answer to look
 * complete would be demonstrating the opposite of what this station is for.
 *
 * NO ARBITRARY SQL, EVER (§7.3). The router does not generate SQL from the
 * question. It matches the question against a fixed table of intents, each of
 * which owns one hand-written, parameterised statement. An unmatched question
 * escalates; it never becomes a query.
 */
import type { Tx } from '../db/pool.js';
import { KEY, redis } from '../redis/client.js';
import { env } from '../config/env.js';
import { consumeTokens, getBudget, type BudgetView } from './budget.js';

export type Route = 'data-plane' | 'model-plane';

export type Intent = {
  id: string;
  pattern: RegExp;
  description: string;
  sql: string;
  /** Turns the row into one sentence a person would accept as an answer. */
  render: (row: Record<string, unknown>) => string;
};

/**
 * The fixed intent table.
 *
 * Each entry owns its statement. Adding a question means adding a statement
 * somebody wrote and reviewed — which is the property that keeps "SQL-first"
 * from quietly becoming "text-to-SQL with extra steps".
 */
export const INTENTS: Intent[] = [
  {
    id: 'record-count',
    pattern: /\b(how many|count|number of)\b.*\b(record|records|row|rows|job|jobs)\b/i,
    description: 'How many records does this tenant hold?',
    sql: 'SELECT count(*)::int AS n FROM demo_record WHERE tenant_id = $1',
    render: (row) => `This tenant holds ${row['n']} record(s).`,
  },
  {
    id: 'latest-record',
    pattern: /\b(latest|most recent|last)\b.*\b(record|entry|job|submission)\b/i,
    description: 'What is the most recent record?',
    sql: `SELECT title, created_at FROM demo_record
           WHERE tenant_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    render: (row) =>
      row['title']
        ? `The most recent record is "${row['title']}", created ${row['created_at']}.`
        : 'This tenant holds no records.',
  },
  {
    id: 'denied-attempts',
    pattern: /\b(denied|refused|blocked|rejected|failed)\b.*\b(attempt|attempts|request|access)\b/i,
    description: 'How many denied attempts are on this tenant?',
    sql: `SELECT count(*)::int AS n FROM audit_event
           WHERE tenant_id = $1 AND outcome = 'denied'`,
    render: (row) => `${row['n']} denied attempt(s) are recorded against this tenant.`,
  },
  {
    id: 'tenant-expiry',
    pattern: /\b(expire|expires|expiry|ttl|purge|how long)\b/i,
    description: 'When does this tenant expire?',
    sql: `SELECT expires_at, GREATEST(0, EXTRACT(EPOCH FROM (expires_at - now()))::int) AS seconds
            FROM tenant WHERE id = $1`,
    render: (row) => `This tenant expires at ${row['expires_at']} — ${row['seconds']}s from now.`,
  },
  {
    id: 'duplicate-submissions',
    pattern: /\b(duplicate|duplicates|collision|collisions)\b/i,
    description: 'How many duplicate submissions were rejected?',
    sql: `SELECT COALESCE(sum(duplicate_attempts), 0)::int AS n
            FROM fraud_submission WHERE tenant_id = $1`,
    render: (row) => `${row['n']} duplicate submission(s) have been rejected for this tenant.`,
  },
  {
    id: 'activation-count',
    pattern: /\b(activation|activations|payment|payments|subscription)\b/i,
    description: 'How many activations exist, and how many replays were absorbed?',
    sql: `SELECT count(*)::int AS n, COALESCE(sum(replay_count), 0)::int AS replays
            FROM payment_activation WHERE tenant_id = $1`,
    render: (row) =>
      `${row['n']} activation(s), with ${row['replays']} duplicate delivery(ies) absorbed.`,
  },
];

export type AskResult = {
  route: Route;
  question: string;
  answer: string;
  /** Zero on the data plane. Not "approximately zero" — the model was not called. */
  tokensCharged: number;
  /**
   * What escalation would cost, whether or not it happened. On the data plane
   * this is the saving; when the budget is spent it is what was refused. A
   * demonstration of cost control has to name the cost it controlled.
   */
  estimatedTokens: number;
  intent: { id: string; description: string; sql: string } | null;
  budget: BudgetView | null;
  modelPlane: {
    attempted: boolean;
    provider: string;
    available: boolean;
    reason: string | null;
  };
  costNote: string;
};

function matchIntent(question: string): Intent | null {
  return INTENTS.find((intent) => intent.pattern.test(question)) ?? null;
}

/**
 * The global daily ceiling (A11).
 *
 * Per-tenant budgets stop one visitor exhausting the estate. This stops the
 * estate exhausting the owner's wallet — every visitor to a public demo can
 * spend real money at this station, and a per-tenant cap alone multiplies by
 * however many tenants exist. Counted in Redis against a UTC day key.
 */
async function reserveGlobalTokens(tokens: number): Promise<{ allowed: boolean; used: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const key = KEY.modelBudgetDay(day);
  try {
    const client = redis();
    const used = await client.incrby(key, tokens);
    // 48h rather than 24: expiring exactly at the boundary races with the
    // increment that created it.
    await client.expire(key, 172_800);
    if (used > env.MODEL_DAILY_TOKEN_CEILING) {
      await client.decrby(key, tokens);
      return { allowed: false, used: used - tokens };
    }
    return { allowed: true, used };
  } catch {
    // Redis down. Refuse rather than spend: an unmetered model call is the one
    // failure here with a bill attached, and failing closed on spending is the
    // opposite trade-off from failing open on rate limiting for good reason.
    return { allowed: false, used: 0 };
  }
}

/**
 * Estimate the tokens a question would cost.
 *
 * Deliberately crude and deliberately labelled as an estimate. A real provider
 * returns real usage and that is what would be charged; this is what the system
 * reserves before it knows.
 */
function estimateTokens(question: string): number {
  return Math.max(64, Math.ceil(question.length / 4) + 256);
}

export async function ask(tx: Tx, orgId: string, question: string): Promise<AskResult> {
  const intent = matchIntent(question);

  /* ---- The data plane. The packet never leaves. ------------------------ */
  if (intent) {
    const { rows } = await tx.query<Record<string, unknown>>(intent.sql, [orgId]);
    const answer = intent.render(rows[0] ?? {});
    return {
      route: 'data-plane',
      question,
      answer,
      tokensCharged: 0,
      estimatedTokens: estimateTokens(question),
      intent: { id: intent.id, description: intent.description, sql: intent.sql },
      budget: await getBudget(tx, orgId),
      modelPlane: {
        attempted: false,
        provider: env.MODEL_NAME,
        available: Boolean(env.MODEL_API_URL),
        reason: null,
      },
      costNote:
        'Answered by SQL inside the data plane. No model was called, so this cost zero tokens ' +
        'and zero money — the routing decision is the saving.',
    };
  }

  /* ---- Escalation. This is where money starts. ------------------------- */
  const estimate = estimateTokens(question);

  const existing = await getBudget(tx, orgId);
  if (existing && existing.exhausted) {
    return exhausted(question, estimate, existing, 'per-tenant token budget is spent');
  }

  const global = await reserveGlobalTokens(estimate);
  if (!global.allowed) {
    return exhausted(
      question,
      estimate,
      existing,
      'the estate-wide daily model ceiling is reached',
    );
  }

  // Charge before calling. A provider that times out still consumed the
  // reservation, and pretending otherwise would let a slow model be free.
  const budget = await consumeTokens(tx, orgId, estimate);

  const provider = await callModel(question);

  return {
    route: 'model-plane',
    question,
    answer: provider.answer,
    tokensCharged: estimate,
    estimatedTokens: estimate,
    intent: null,
    budget,
    modelPlane: {
      attempted: true,
      provider: env.MODEL_NAME,
      available: provider.available,
      reason: provider.reason,
    },
    costNote:
      'No fixed intent matched, so this escalated to the model plane and decremented the ' +
      'token budget. That decrement is the visible cost of a question SQL could not answer.',
  };
}

function exhausted(
  question: string,
  estimate: number,
  budget: BudgetView | null,
  reason: string,
): AskResult {
  /*
   * A11, as a state rather than an error. The status code is 200 and the shape
   * is the same shape as a successful answer, because "the budget is spent" is
   * an outcome the system is designed to produce — not a failure of it. A 500
   * here would demonstrate a bug where the intent is to demonstrate cost
   * control working.
   */
  return {
    route: 'model-plane',
    question,
    answer:
      `This question needs the model plane, and the model budget is spent — ${reason}. It ` +
      `would have cost about ${estimate} tokens. Nothing was called and nothing was charged. ` +
      'The per-tenant budget refills when a tenant is reprovisioned; the estate-wide ceiling ' +
      'refills daily.',
    tokensCharged: 0,
    estimatedTokens: estimate,
    intent: null,
    budget,
    modelPlane: {
      attempted: false,
      provider: env.MODEL_NAME,
      available: Boolean(env.MODEL_API_URL),
      reason,
    },
    costNote:
      'Budget exhaustion is a designed state, not an error. A system that runs out of model ' +
      'budget and says so calmly is demonstrating cost-first engineering.',
  };
}

/**
 * The model plane itself.
 *
 * A real HTTP call when a provider is configured. When one is not, this reports
 * that plainly — it does not synthesise a reply. The distinction matters: every
 * other number this station reports is real, and a fabricated answer sitting
 * among them would make all of them suspect.
 */
async function callModel(
  question: string,
): Promise<{ answer: string; available: boolean; reason: string | null }> {
  if (!env.MODEL_API_URL || !env.MODEL_API_KEY) {
    return {
      answer:
        'The model plane is not configured on this deployment, so no model was called. The ' +
        'routing decision, the token accounting, the span, and the audit record for this ' +
        'request are real; the model reply is the one thing that is absent, and it is ' +
        'reported absent rather than invented.',
      available: false,
      reason: 'no model provider configured',
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.MODEL_TIMEOUT_MS);
    const response = await fetch(env.MODEL_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.MODEL_API_KEY}`,
      },
      body: JSON.stringify({ model: env.MODEL_NAME, question }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return {
        answer: 'The model plane refused the request. Nothing was inferred from that.',
        available: false,
        reason: `provider returned ${response.status}`,
      };
    }
    const body = (await response.json()) as { answer?: unknown };
    const answer = typeof body.answer === 'string' ? body.answer : null;
    return answer
      ? { answer, available: true, reason: null }
      : {
          answer: 'The model plane returned an unusable response.',
          available: false,
          reason: 'provider response had no answer field',
        };
  } catch (error) {
    return {
      answer: 'The model plane could not be reached.',
      available: false,
      reason: (error as Error).name === 'AbortError' ? 'provider timed out' : 'provider error',
    };
  }
}

/** The intent catalogue, for the station's own explanation of itself. */
export function intentCatalogue(): Array<{ id: string; description: string; sql: string }> {
  return INTENTS.map((i) => ({ id: i.id, description: i.description, sql: i.sql }));
}
