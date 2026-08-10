/**
 * Per-subscriber tenant pseudonyms.
 *
 * THE PROBLEM THIS SOLVES
 * §2.3 shows other tenants' volumes lighting up as they are used. To render
 * that, each volume must keep a stable identity for as long as the visitor is
 * watching — otherwise every event spawns a new volume and the world is
 * confetti. But a stable identity that is the SAME for every viewer is a
 * correlation handle: two visitors comparing notes, or one visitor returning
 * later, could track a specific stranger's activity over time.
 *
 * THE RESOLUTION
 * Each connection gets a random salt, held in memory for the life of the socket
 * and never stored. Other tenants' ids are shown as a short hash of
 * (salt, tenantId). Within one session a volume is stably itself; across two
 * sessions — even two sockets from the same browser — the same tenant appears
 * under unrelated names. There is no key anywhere that maps a pseudonym back to
 * a tenant, because the salt dies with the connection.
 *
 * The subscriber's OWN tenant is never pseudonymised. They already hold its id;
 * hiding it would be theatre, and §2.4 needs their own volume identifiable.
 */
import { createHmac, randomBytes } from 'node:crypto';

export class PseudonymScope {
  /** Never logged, never persisted, discarded when the socket closes. */
  readonly #salt: Buffer;
  readonly #ownOrgId: string | null;
  readonly #cache = new Map<string, string>();

  constructor(ownOrgId: string | null) {
    this.#salt = randomBytes(32);
    this.#ownOrgId = ownOrgId;
  }

  /**
   * The identity a given tenant should carry for THIS subscriber.
   *
   * `self` for their own tenant, an opaque token for anyone else's.
   */
  labelFor(tenantId: string): { ref: string; isSelf: boolean } {
    if (this.#ownOrgId && tenantId === this.#ownOrgId) {
      return { ref: tenantId, isSelf: true };
    }
    const cached = this.#cache.get(tenantId);
    if (cached) return { ref: cached, isSelf: false };

    const ref = `vol_${createHmac('sha256', this.#salt).update(tenantId).digest('base64url').slice(0, 12)}`;
    /*
     * Bounded, because the cache is keyed by a value other tenants control the
     * creation of: a demo that provisions thousands of tenants would otherwise
     * grow this map for the lifetime of every open socket. Clearing wholesale
     * rather than evicting one entry keeps it simple, and the only visible
     * consequence is that a long-idle volume may be renamed — which is
     * acceptable, and strictly better for unlinkability.
     */
    if (this.#cache.size >= 512) this.#cache.clear();
    this.#cache.set(tenantId, ref);
    return { ref, isSelf: false };
  }
}
