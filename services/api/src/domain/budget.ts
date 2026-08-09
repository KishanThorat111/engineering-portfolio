/**
 * The budget model — ruling A11's foundation, and nothing more.
 *
 * P2 owns cost routing and the AI demonstration. What P1 owes it is a data
 * model in which "the budget is spent" is a REPRESENTABLE STATE rather than an
 * error condition, so P2 can implement exhaustion as a designed outcome without
 * a schema change or a retrofit.
 *
 * That distinction is the whole of A11: a system that runs out of model budget
 * and says so, calmly, is demonstrating cost-first engineering. A system that
 * throws a 500 is demonstrating a bug. The difference is decided here, by
 * `exhausted_at` being a column rather than an exception.
 */
import type { Tx } from '../db/pool.js';

export type Budget = {
  tokens_limit: string;
  tokens_used: string;
  exhausted_at: string | null;
};

export type BudgetView = {
  tokensLimit: number;
  tokensUsed: number;
  tokensRemaining: number;
  exhausted: boolean;
  exhaustedAt: string | null;
};

export function toView(row: Budget): BudgetView {
  const limit = Number(row.tokens_limit);
  const used = Number(row.tokens_used);
  return {
    tokensLimit: limit,
    tokensUsed: used,
    tokensRemaining: Math.max(limit - used, 0),
    exhausted: row.exhausted_at !== null || used >= limit,
    exhaustedAt: row.exhausted_at,
  };
}

export async function getBudget(tx: Tx, orgId: string): Promise<BudgetView | null> {
  const { rows } = await tx.query<Budget>(
    `SELECT tokens_limit::text, tokens_used::text, exhausted_at
       FROM tenant_budget WHERE tenant_id = $1`,
    [orgId],
  );
  const row = rows[0];
  return row ? toView(row) : null;
}

/**
 * Consume tokens and report the resulting state.
 *
 * Unused by any P1 route — P2 calls it. It lives here now because the
 * arithmetic that decides exhaustion has to be in one place, and the place has
 * to exist before five demonstrations start needing it. The clamp and the
 * `exhausted_at` stamp are done in SQL so two concurrent calls cannot both see
 * headroom that only one of them has.
 */
export async function consumeTokens(
  tx: Tx,
  orgId: string,
  tokens: number,
): Promise<BudgetView | null> {
  const { rows } = await tx.query<Budget>(
    `UPDATE tenant_budget
        SET tokens_used  = LEAST(tokens_used + $2, tokens_limit),
            exhausted_at = CASE
                             WHEN exhausted_at IS NOT NULL THEN exhausted_at
                             WHEN tokens_used + $2 >= tokens_limit THEN now()
                             ELSE NULL
                           END,
            updated_at   = now()
      WHERE tenant_id = $1
      RETURNING tokens_limit::text, tokens_used::text, exhausted_at`,
    [orgId, tokens],
  );
  const row = rows[0];
  return row ? toView(row) : null;
}
