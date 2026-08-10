/**
 * The five demonstrations, as HTTP.
 *
 * Every one of them writes an audit row and runs inside a real span. The rule
 * P1 learned the hard way applies throughout: where a route both audits and
 * refuses, the audit is committed and the refusal is raised AFTERWARDS — a
 * throw from inside `withTenant` rolls back the record of the refusal, which is
 * the one thing the visitor is here to see.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { withTenant } from '../db/pool.js';
import { writeAudit } from '../domain/audit.js';
import { inspectRecordAccess } from '../domain/isolation.js';
import {
  activate,
  getActivation,
  idempotencyCacheState,
  listActivations,
  verifyWebhookSignature,
} from '../domain/payments.js';
import { listSubmissions, submitEvidence } from '../domain/fraud.js';
import { ask, intentCatalogue } from '../domain/ai.js';
import { env } from '../config/env.js';
import { ApiError } from '../plugins/errors.js';

const tracer = trace.getTracer('control-plane-demos');

const uuid = z.string().uuid();

export const demoRoutes: FastifyPluginAsync = async (app) => {
  /* =====================================================================
   * 1 — ISOLATION. The break-out, made inspectable.
   * ===================================================================== */
  app.get('/v1/demos/isolation/inspect/:recordId', async (request) => {
    const identity = await app.requireTenant(request);
    const params = z.object({ recordId: uuid }).safeParse(request.params);
    if (!params.success) {
      throw new ApiError(400, 'request.invalid', 'Record id must be a UUID.');
    }
    const recordId = params.data.recordId;

    return tracer.startActiveSpan('demo.isolation.inspect', async (span) => {
      span.setAttribute('tenant.id', identity.orgId);
      try {
        return await withTenant(identity.orgId, async (tx) => {
          const inspection = await inspectRecordAccess(tx, identity.orgId, recordId);
          span.setAttribute('isolation.outcome', inspection.outcome);
          span.setAttribute('isolation.rls_refused', inspection.layers.rowLevelSecurity.refused);

          await writeAudit(tx, {
            orgId: identity.orgId,
            action: 'demo.isolation.inspect',
            outcome: inspection.outcome === 'denied' ? 'denied' : 'allowed',
            actor: `tenant:${identity.publicRef}`,
            resourceType: 'demo_record',
            resourceId: recordId,
            correlationId: request.correlationId,
            ip: request.ip,
            detail: {
              orgScopeRefused: inspection.layers.orgScope.refused,
              rlsRefused: inspection.layers.rowLevelSecurity.refused,
            },
          });

          return inspection;
        });
      } finally {
        span.end();
      }
    });
  });

  /* =====================================================================
   * 2 — PAYMENTS. Two paths, one activation.
   * ===================================================================== */
  const activationBody = z
    .object({
      idempotencyKey: z
        .string()
        .trim()
        .min(8)
        .max(128)
        .regex(/^[\w:-]+$/),
      subscriptionRef: z.string().trim().min(1).max(64),
      amountMinor: z.number().int().positive().max(10_000_000),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .strict();

  /**
   * The webhook path. Signature-verified, exactly like the real platform.
   *
   * The signature is computed over the RAW body, not over a re-serialised
   * object — re-serialising changes key order and whitespace and would make
   * every genuine signature fail while every forged one also failed, which
   * looks like security and is not.
   */
  app.post('/v1/demos/payments/webhook', { config: { rawBody: true } }, async (request, reply) => {
    const identity = await app.requireTenant(request);
    const raw =
      typeof (request as { rawBody?: unknown }).rawBody === 'string'
        ? ((request as { rawBody?: string }).rawBody as string)
        : JSON.stringify(request.body ?? {});

    const signature = request.headers['x-signature'];
    const valid = verifyWebhookSignature(
      raw,
      typeof signature === 'string' ? signature : undefined,
    );

    if (!valid) {
      // Audit the rejection, commit it, then refuse. A forged webhook that
      // left no trace would be the demonstration failing quietly.
      await withTenant(identity.orgId, (tx) =>
        writeAudit(tx, {
          orgId: identity.orgId,
          action: 'demo.payments.webhook',
          outcome: 'denied',
          actor: `tenant:${identity.publicRef}`,
          correlationId: request.correlationId,
          ip: request.ip,
          detail: { reason: 'HMAC signature verification failed' },
        }),
      );
      throw new ApiError(
        401,
        'payments.bad_signature',
        'Webhook signature verification failed. The signature is an HMAC-SHA256 of the raw ' +
          'body, compared with timingSafeEqual.',
      );
    }

    const parsed = activationBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'request.invalid', 'The webhook payload was not valid.');
    }

    const result = await runActivation(app, request, identity, parsed.data, 'webhook');
    return reply.status(result.outcome === 'activated' ? 201 : 200).send(result.body);
  });

  /** The client-verify path. Same activation rule, different entrance. */
  app.post('/v1/demos/payments/verify', async (request, reply) => {
    const identity = await app.requireTenant(request);
    const parsed = activationBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'request.invalid', 'The verification payload was not valid.');
    }
    const result = await runActivation(app, request, identity, parsed.data, 'client');
    return reply.status(result.outcome === 'activated' ? 201 : 200).send(result.body);
  });

  /** "Open the idempotency key that decided it." */
  app.get('/v1/demos/payments/keys/:key', async (request) => {
    const identity = await app.requireTenant(request);
    const params = z
      .object({
        key: z
          .string()
          .min(1)
          .max(128)
          .regex(/^[\w:-]+$/),
      })
      .safeParse(request.params);
    if (!params.success) throw new ApiError(400, 'request.invalid', 'Bad idempotency key.');

    return withTenant(identity.orgId, async (tx) => {
      const activation = await getActivation(tx, identity.orgId, params.data.key);
      if (!activation) {
        throw new ApiError(404, 'payments.key_unknown', 'No activation for that key.');
      }
      return {
        activation,
        cache: await idempotencyCacheState(identity.orgId, params.data.key),
        mechanism: {
          authority: 'PostgreSQL unique constraint payment_activation_key_unique',
          statement: 'INSERT ... ON CONFLICT (tenant_id, idempotency_key) DO NOTHING',
          why:
            'The race is decided by the database refusing the second insert, not by the ' +
            'application reading first and inserting after. Between that read and that ' +
            'write is exactly where a duplicate charge lives.',
          redisRole:
            'Redis holds a short-lived marker as a fast path. It is never the authority; ' +
            'if the two disagree, Postgres is right, because Postgres has the constraint.',
        },
      };
    });
  });

  app.get('/v1/demos/payments/activations', async (request) => {
    const identity = await app.requireTenant(request);
    return withTenant(identity.orgId, async (tx) => ({
      activations: await listActivations(tx, identity.orgId, 50),
    }));
  });

  /* =====================================================================
   * 3 — FRAUD. The same photo, twice.
   * ===================================================================== */
  const evidenceBody = z
    .object({
      label: z.string().trim().min(1).max(80),
      /** Base64 so the endpoint stays JSON and stays size-checkable. */
      imageBase64: z.string().min(4).max(1_400_000),
    })
    .strict();

  app.post('/v1/demos/fraud/evidence', async (request, reply) => {
    const identity = await app.requireTenant(request);
    const parsed = evidenceBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'request.invalid', 'The evidence payload was not valid.');
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(parsed.data.imageBase64, 'base64');
    } catch {
      throw new ApiError(400, 'request.invalid', 'imageBase64 was not decodable.');
    }
    if (bytes.byteLength === 0) {
      throw new ApiError(400, 'request.invalid', 'The decoded image was empty.');
    }
    if (bytes.byteLength > env.MAX_UPLOAD_BYTES) {
      throw new ApiError(
        413,
        'request.too_large',
        `The decoded image exceeds ${env.MAX_UPLOAD_BYTES} bytes.`,
      );
    }

    return tracer.startActiveSpan('demo.fraud.submit', async (span) => {
      try {
        const outcome = await withTenant(identity.orgId, async (tx) => {
          const result = await submitEvidence(tx, identity.orgId, {
            bytes,
            label: parsed.data.label,
          });
          span.setAttribute('fraud.outcome', result.outcome);
          span.setAttribute('fraud.digest', result.digest);

          await writeAudit(tx, {
            orgId: identity.orgId,
            action: 'demo.fraud.submit',
            outcome: result.outcome === 'accepted' ? 'allowed' : 'denied',
            actor: `tenant:${identity.publicRef}`,
            resourceType: 'fraud_submission',
            resourceId: result.outcome === 'accepted' ? result.submission.id : result.original.id,
            correlationId: request.correlationId,
            ip: request.ip,
            detail: {
              digest: result.digest,
              byteLength: bytes.byteLength,
              ...(result.outcome === 'rejected-duplicate'
                ? { collidedWith: result.original.id, attempt: result.original.duplicate_attempts }
                : {}),
            },
          });

          return result;
        });

        const mechanism = {
          algorithm: 'SHA-256 over the submitted bytes',
          authority: 'PostgreSQL unique constraint fraud_submission_hash_unique',
          storage:
            'The image itself is never stored — only its digest, its length, and a label. ' +
            'This is a public upload endpoint; holding visitor bytes would be a liability ' +
            'with no demonstrative value.',
          why:
            'Photo evidence is only evidence if the same photo cannot be submitted twice. ' +
            'The constraint rejects, so two identical uploads racing behave exactly like ' +
            'two in sequence.',
        };

        if (outcome.outcome === 'accepted') {
          return reply.status(201).send({
            outcome: 'accepted',
            digest: outcome.digest,
            submission: outcome.submission,
            mechanism,
          });
        }
        return reply.status(409).send({
          outcome: 'rejected-duplicate',
          digest: outcome.digest,
          collidedWith: outcome.original,
          mechanism,
        });
      } finally {
        span.end();
      }
    });
  });

  app.get('/v1/demos/fraud/submissions', async (request) => {
    const identity = await app.requireTenant(request);
    return withTenant(identity.orgId, async (tx) => ({
      submissions: await listSubmissions(tx, identity.orgId, 50),
    }));
  });

  /* =====================================================================
   * 4 — AI COST. SQL-first, then escalation.
   * ===================================================================== */
  const askBody = z.object({ question: z.string().trim().min(3).max(500) }).strict();

  app.post('/v1/demos/ai/ask', async (request) => {
    const identity = await app.requireTenant(request);
    const parsed = askBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'request.invalid', 'Ask a question between 3 and 500 characters.');
    }

    return tracer.startActiveSpan('demo.ai.ask', async (span) => {
      try {
        return await withTenant(identity.orgId, async (tx) => {
          const result = await ask(tx, identity.orgId, parsed.data.question);
          span.setAttribute('ai.route', result.route);
          span.setAttribute('ai.tokens_charged', result.tokensCharged);
          if (result.intent) span.setAttribute('ai.intent', result.intent.id);

          await writeAudit(tx, {
            orgId: identity.orgId,
            action: 'demo.ai.ask',
            outcome: 'allowed',
            actor: `tenant:${identity.publicRef}`,
            correlationId: request.correlationId,
            ip: request.ip,
            detail: {
              route: result.route,
              intent: result.intent?.id ?? null,
              tokensCharged: result.tokensCharged,
              modelAvailable: result.modelPlane.available,
            },
          });

          return result;
        });
      } finally {
        span.end();
      }
    });
  });

  app.get('/v1/demos/ai/intents', async (request) => {
    await app.requireTenant(request);
    return {
      intents: intentCatalogue(),
      note:
        'A fixed table. The router does not generate SQL from your question — it matches ' +
        'against these and escalates when nothing matches. There is no text-to-SQL path, ' +
        'because arbitrary SQL execution is ruled out absolutely on this surface.',
    };
  });

  /* =====================================================================
   * 5 — LIMITS. Hammer it until it sheds.
   * ===================================================================== */
  app.post(
    '/v1/demos/limits/hammer',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_STATION_PER_MINUTE,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => {
      const identity = await app.requireTenant(request);

      // The shed itself is the limiter's 429, produced before this handler ever
      // runs. What the handler records is the accepted request, so the audit
      // log shows exactly where the accepted run stopped.
      await withTenant(identity.orgId, (tx) =>
        writeAudit(tx, {
          orgId: identity.orgId,
          action: 'demo.limits.request',
          outcome: 'allowed',
          actor: `tenant:${identity.publicRef}`,
          correlationId: request.correlationId,
          ip: request.ip,
        }),
      );

      return {
        accepted: true,
        limit: {
          max: env.RATE_LIMIT_STATION_PER_MINUTE,
          window: '1 minute',
          keyedBy: 'tenant',
          store: 'Redis, so the limit is shared across API replicas rather than per-process',
        },
        layers: [
          {
            name: 'Cloudflare edge rate limiting',
            position: 'in front',
            note:
              'Keeps floods off the VM entirely. Configured at the edge, not in this ' +
              'repository, and not visible from here.',
          },
          {
            name: 'Fastify rate limiting',
            position: 'this layer',
            note:
              'Exists because the VM must not depend on the edge being configured ' +
              'correctly, and because per-tenant limits are an application concept the ' +
              'edge cannot see.',
          },
        ],
        note:
          'Keep going. When this returns 429 you are watching your own request shed, and the ' +
          'audit log records where the accepted run stopped.',
      };
    },
  );
};

/* ---------------------------------------------------------------------- */

type Identity = { orgId: string; publicRef: string };

async function runActivation(
  app: Parameters<FastifyPluginAsync>[0],
  request: { correlationId: string; ip: string },
  identity: Identity,
  input: {
    idempotencyKey: string;
    subscriptionRef: string;
    amountMinor: number;
    currency: string;
  },
  via: 'webhook' | 'client',
) {
  return tracer.startActiveSpan('demo.payments.activate', async (span) => {
    span.setAttribute('payments.path', via);
    span.setAttribute('payments.idempotency_key', input.idempotencyKey);
    try {
      const result = await withTenant(identity.orgId, async (tx) => {
        const activation = await activate(tx, identity.orgId, {
          ...input,
          via,
          correlationId: request.correlationId,
        });
        span.setAttribute('payments.outcome', activation.outcome);

        await writeAudit(tx, {
          orgId: identity.orgId,
          action: `demo.payments.${activation.outcome}`,
          outcome: 'allowed',
          actor: `tenant:${identity.publicRef}`,
          resourceType: 'payment_activation',
          resourceId: activation.activation.id,
          correlationId: request.correlationId,
          ip: request.ip,
          detail: {
            path: via,
            idempotencyKey: input.idempotencyKey,
            decidedHere: activation.decidedHere,
            replayCount: activation.activation.replay_count,
          },
        });

        return activation;
      });

      void app;
      return {
        outcome: result.outcome,
        body: {
          outcome: result.outcome,
          decidedHere: result.decidedHere,
          activation: result.activation,
          mechanism: {
            authority: 'PostgreSQL unique constraint payment_activation_key_unique',
            statement: 'INSERT ... ON CONFLICT (tenant_id, idempotency_key) DO NOTHING',
            paths: ['webhook', 'client'],
            why:
              result.outcome === 'activated'
                ? 'This call won the insert, so it performed the activation.'
                : 'This call lost the insert. It changed no money and incremented the ' +
                  'replay counter on the activation that won.',
          },
        },
      };
    } finally {
      span.end();
    }
  });
}
