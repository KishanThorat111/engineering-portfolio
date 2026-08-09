/**
 * Authentication, and the derivation of the tenant scope.
 *
 * THE ADR-0003 CONTRACT, RESTATED AS CODE
 * The effective org is read from a verified credential and from nowhere else.
 * There is no header, query parameter, body field, or path segment anywhere in
 * this service that can influence it. A client MAY send an org id — the
 * break-out demonstration in P2 depends on them being able to — and it is only
 * ever compared against the derived value to reject a mismatch, never used to
 * select a scope. That is the same rule the production platforms hold, and it
 * is the one that makes layer 1 real rather than conventional.
 *
 * Credentials are re-verified on EVERY request, not just at login: the tenant
 * row is re-read, its status re-checked, and its TTL re-evaluated. A tenant
 * that expired thirty seconds ago stops working thirty seconds ago, which is
 * what makes §2.5's consequence beat honest.
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { resolveCredential, type TenantStatus } from '../domain/tenant.js';

export type TenantIdentity = {
  orgId: string;
  credentialId: string;
  publicRef: string;
  status: TenantStatus;
  expiresAt: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Set only by `requireTenant`. Never populated from client input. */
    tenant?: TenantIdentity;
    correlationId: string;
  }
}

export class AuthError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function bearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

/*
 * The public ref comes from the database, not from parsing the key.
 *
 * It was parsed at first, by splitting on '_' — which silently truncated it,
 * because the ref itself contains an underscore: `dmo_tnt_AbC123_<secret>`
 * splits into four parts, not three, and taking the first two produced
 * "dmo_tnt" for every tenant in the system. Every audit row written for an
 * authenticated request recorded the same meaningless actor.
 *
 * It typechecked, it never threw, and it was visible only by reading a real
 * audit row in the end-to-end run. Resolving the ref alongside the credential
 * removes the parsing rather than fixing it.
 */
export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorateRequest('tenant', undefined);

  /**
   * Preflight for every tenant-scoped route.
   *
   * Failures are deliberately uniform: an unknown key, a revoked key, and a
   * malformed key all produce the same 401 with the same body. Distinguishing
   * them would turn this endpoint into an oracle for validating harvested keys.
   */
  app.decorate('requireTenant', async (request: FastifyRequest): Promise<TenantIdentity> => {
    const key = bearer(request);
    if (!key) {
      throw new AuthError(401, 'auth.missing_credential', 'A tenant API key is required.');
    }

    const resolved = await resolveCredential(key);
    if (!resolved) {
      throw new AuthError(401, 'auth.invalid_credential', 'That credential is not valid.');
    }

    /*
     * Order matters here. The purge revokes credentials, so a purged tenant
     * always presents a revoked key — checking revocation first would collapse
     * "your tenant reached its TTL and was destroyed on schedule" into a bare
     * "invalid credential" and throw away the consequence beat entirely. The
     * tenant's state is the more specific fact, so it is checked first.
     */
    if (resolved.tenantStatus === 'purged') {
      throw new AuthError(
        410,
        'tenant.purged',
        'This tenant reached its TTL and was purged by the scheduled job. Provision a new one.',
      );
    }

    if (new Date(resolved.expiresAt).getTime() <= Date.now()) {
      throw new AuthError(
        410,
        'tenant.expired',
        'This tenant is past its TTL and is awaiting purge.',
      );
    }

    // Revoked for any reason other than the purge. Nothing here revokes keys
    // yet, so this is defence for the credential-rotation P2 will add.
    if (resolved.revokedAt !== null) {
      throw new AuthError(401, 'auth.invalid_credential', 'That credential is not valid.');
    }

    const identity: TenantIdentity = {
      orgId: resolved.tenantId,
      credentialId: resolved.credentialId,
      publicRef: resolved.publicRef,
      status: resolved.tenantStatus,
      expiresAt: resolved.expiresAt,
    };
    request.tenant = identity;
    return identity;
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requireTenant(request: FastifyRequest): Promise<TenantIdentity>;
  }
}
