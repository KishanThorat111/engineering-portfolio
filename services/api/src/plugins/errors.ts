/**
 * Error shaping.
 *
 * This surface is published as attackable, so error bodies are a security
 * feature rather than a developer convenience. Three rules:
 *
 *  1. Never leak internals. No stack, no SQL, no driver text, no constraint
 *     name. A Postgres error message can disclose column names and table shape.
 *  2. Always carry the correlation id. The visitor gets a handle they can use
 *     to find the audit row for what just happened — which is the honest
 *     version of "something went wrong".
 *  3. Machine-readable `code`, human-readable `message`. P2 and P5 branch on
 *     the code; the message is for a person reading a terminal.
 */
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AuthError } from './auth.js';

export type ApiErrorBody = {
  error: { code: string; message: string; correlationId: string };
};

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly detail?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const errorsPlugin: FastifyPluginAsync = fp(async (app) => {
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: {
        code: 'route.not_found',
        message: 'No such endpoint. This API has a fixed surface.',
        correlationId: request.correlationId,
      },
    } satisfies ApiErrorBody);
  });

  app.setErrorHandler((error, request, reply) => {
    const correlationId = request.correlationId;

    if (error instanceof AuthError) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message, correlationId } });
    }

    if (error instanceof ApiError) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message, correlationId } });
    }

    // Fastify's own validation and body-limit errors are safe to pass through
    // in shape, but not in text — the validation message can echo input back.
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const code =
        status === 413
          ? 'request.too_large'
          : status === 429
            ? 'rate_limit.exceeded'
            : 'request.invalid';
      return reply.status(status).send({
        error: {
          code,
          message:
            status === 429
              ? 'Rate limit exceeded. This limiter is the application-level one; Cloudflare has its own in front.'
              : 'The request was rejected by validation.',
          correlationId,
        },
      });
    }

    // Anything unrecognised is logged in full on our side and described in one
    // sentence on theirs.
    request.log.error({ err: error, correlationId }, 'unhandled error');
    return reply.status(500).send({
      error: {
        code: 'internal.error',
        message: 'The control plane failed to complete that request.',
        correlationId,
      },
    });
  });
});
