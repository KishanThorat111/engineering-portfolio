/**
 * The catalogue — what the five demonstrations are, and how to reproduce each
 * one from a terminal.
 *
 * Unauthenticated on purpose. §2.10 wants the reproduction verifiable by "a
 * colleague who never visits the site", and a catalogue that required a
 * credential would make the first step of every reproduction "get a credential
 * from a page you were told about". This document is the entry point.
 *
 * It is also the contract P5 renders against: five demonstrations, stable ids,
 * each naming the endpoint that proves it. The ids do not change.
 */
import type { FastifyPluginAsync } from 'fastify';

export const demonstrationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/demonstrations', async (request) => {
    const base = `${request.protocol}://${request.host}`;

    return {
      plane: 'demo',
      disclosure:
        'This is the demo plane. It is a physically separate database with no path to any ' +
        'production system, every tenant it creates is destroyed on a TTL by a scheduled ' +
        'job, and it is deliberately attackable. Nothing here is a simulation: every ' +
        'demonstration below writes a real audit record and emits a real OpenTelemetry span.',
      start: `curl -sX POST ${base}/v1/tenants -H 'content-type: application/json' -d '{"label":"mine"}'`,
      demonstrations: [
        {
          id: 'isolation',
          name: 'Tenant isolation, and the break-out',
          proves: 'Two independent layers refuse a cross-tenant read, and both can be inspected.',
          attempt: `curl -si ${base}/v1/records/$OTHER_RECORD_ID -H "authorization: Bearer $KEY"`,
          inspect: `curl -s ${base}/v1/demos/isolation/inspect/$OTHER_RECORD_ID -H "authorization: Bearer $KEY"`,
          expect: '403 isolation.denied, then the live policy predicate and the real query plan',
          mechanism:
            'Server-derived orgId scoping (the pattern the production platforms run) plus ' +
            'PostgreSQL row-level security, FORCED, against a role with no BYPASSRLS (which ' +
            'the production platforms do not have).',
        },
        {
          id: 'payments',
          name: 'Idempotent activation across two paths',
          proves:
            'Two deliveries of the same event activate exactly once, decided by the database.',
          attempt:
            `BODY='{"idempotencyKey":"evt_demo_1","subscriptionRef":"sub_1","amountMinor":4900,"currency":"GBP"}'; ` +
            `SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | awk '{print $NF}'); ` +
            `curl -s ${base}/v1/demos/payments/webhook -H "authorization: Bearer $KEY" ` +
            `-H "content-type: application/json" -H "x-signature: $SIG" -d "$BODY"`,
          inspect: `curl -s ${base}/v1/demos/payments/keys/evt_demo_1 -H "authorization: Bearer $KEY"`,
          expect:
            'The first call 201 activated; every repeat 200 replayed, with replay_count rising',
          mechanism:
            'INSERT ... ON CONFLICT (tenant_id, idempotency_key) DO NOTHING. The race is ' +
            'resolved by a unique constraint, not by reading before writing. Webhook ' +
            'signatures are HMAC-SHA256 over the raw body, compared with timingSafeEqual.',
        },
        {
          id: 'fraud',
          name: 'Duplicate-photo detection',
          proves: 'The same image cannot be submitted as evidence twice.',
          attempt:
            `curl -s ${base}/v1/demos/fraud/evidence -H "authorization: Bearer $KEY" ` +
            `-H 'content-type: application/json' ` +
            `-d '{"label":"ward 3 clean","imageBase64":"aGVsbG8td29ybGQ="}'`,
          inspect: `curl -s ${base}/v1/demos/fraud/submissions -H "authorization: Bearer $KEY"`,
          expect: 'The first submission 201 accepted; the identical second 409 rejected-duplicate',
          mechanism:
            'SHA-256 of the bytes with a unique constraint per tenant. The image itself is ' +
            'never stored — only its digest, length, and label.',
        },
        {
          id: 'ai-cost',
          name: 'SQL-first routing',
          proves: 'Most operational questions are answered by SQL at zero model cost.',
          attempt:
            `curl -s ${base}/v1/demos/ai/ask -H "authorization: Bearer $KEY" ` +
            `-H 'content-type: application/json' -d '{"question":"how many records do I have?"}'`,
          escalate:
            `curl -s ${base}/v1/demos/ai/ask -H "authorization: Bearer $KEY" ` +
            `-H 'content-type: application/json' ` +
            `-d '{"question":"write a haiku about hospital logistics"}'`,
          inspect: `curl -s ${base}/v1/demos/ai/intents -H "authorization: Bearer $KEY"`,
          expect:
            'data-plane with tokensCharged 0, then model-plane with the token budget decremented',
          mechanism:
            'A fixed intent table, each entry owning one hand-written parameterised ' +
            'statement. The router never generates SQL from the question — there is no ' +
            'text-to-SQL path. Budget exhaustion is a designed state, not an error.',
        },
        {
          id: 'limits',
          name: 'Rate limiting',
          proves: 'A caller can watch their own requests shed.',
          attempt:
            `for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code} " ` +
            `-X POST ${base}/v1/demos/limits/hammer -H "authorization: Bearer $KEY"; done`,
          expect: '200s until the bucket empties, then 429 rate_limit.exceeded',
          mechanism:
            'Redis-backed, keyed by tenant so a shared address cannot exhaust everyone ' +
            "else's budget. Cloudflare's edge limiter sits in front of this one and is not " +
            'a replacement for it.',
        },
      ],
      takeAway: {
        receipt: `curl -sX POST ${base}/v1/receipt -H "authorization: Bearer $KEY"`,
        note:
          'Returns a signed permalink carrying your session audit log, the predicate that ' +
          'blocked you, and these reproduction commands. It keeps working after your tenant ' +
          'is purged.',
      },
    };
  });
};
