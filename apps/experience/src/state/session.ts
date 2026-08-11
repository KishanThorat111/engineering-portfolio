/**
 * The visitor's tenant, and the "cold open once" rule.
 *
 * §2.9, access over ceremony: "The cold open plays once per visitor, then never
 * again. Returning visitors land in the world already provisioned." So the
 * credential is persisted, and whether the cold open has played is persisted
 * beside it.
 *
 * WHAT IS STORED AND WHY IT IS SAFE
 * A demo-plane API key with a short TTL, its public reference, and its expiry.
 * The key grants access to one throwaway tenant on a plane with nothing real
 * behind it, and it destroys itself on a schedule. localStorage rather than a
 * cookie: it is never sent automatically, so it cannot be used in a CSRF, and
 * it needs no consent banner because it is not tracking anything — it is the
 * visitor's own session state, which is the strictly-necessary case.
 *
 * An expired session is DISCARDED rather than reused, because a tenant past its
 * TTL is genuinely gone and pretending otherwise would produce a world full of
 * 410s with no explanation.
 */

const KEY = 'kt.live.session.v1';

export type Session = {
  apiKey: string;
  publicRef: string;
  orgId: string;
  expiresAt: string;
  /** Whether this visitor has already seen the cold open. */
  coldOpenPlayed: boolean;
};

function storage(): Storage | null {
  try {
    // Private browsing and locked-down configurations throw on access rather
    // than returning null, so this has to be a try rather than a check.
    const probe = '__kt_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function loadSession(): Session | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      typeof parsed.apiKey !== 'string' ||
      typeof parsed.publicRef !== 'string' ||
      typeof parsed.orgId !== 'string' ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return null;
    }
    // Past its TTL: the tenant is purged or awaiting purge either way.
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      store.removeItem(KEY);
      return null;
    }
    return {
      apiKey: parsed.apiKey,
      publicRef: parsed.publicRef,
      orgId: parsed.orgId,
      expiresAt: parsed.expiresAt,
      coldOpenPlayed: parsed.coldOpenPlayed === true,
    };
  } catch {
    store.removeItem(KEY);
    return null;
  }
}

export function saveSession(session: Session): void {
  storage()?.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  storage()?.removeItem(KEY);
}

export function markColdOpenPlayed(): void {
  const session = loadSession();
  if (!session) return;
  saveSession({ ...session, coldOpenPlayed: true });
}
