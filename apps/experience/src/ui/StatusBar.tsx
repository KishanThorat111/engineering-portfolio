/**
 * The persistent status bar — what a control room tells you without being asked.
 *
 * WHY THIS EXISTS
 * The live surface opened with a document panel, so a visitor's first
 * impression was reading rather than operating. Everything that answers "what
 * is this, is it real, what is happening right now" was scattered down the page
 * in prose: the LIVE badge in one panel, the tenant id in another, the
 * connection count in a third, the expiry in a fourth.
 *
 * A control room states its state continuously, at the top, in one line. That
 * is the whole idea here — no new information, no new claims, just the facts
 * the page already knew, promoted to where they are read first and kept there
 * while you work.
 *
 * EVERY FIELD IS REAL
 * Source is the live spine's own connection state. The tenant ref and expiry
 * come from the provisioning response. Presence is the server's count. Nothing
 * is polled into existence and nothing counts up on a timer to look busy — when
 * the surface does not know a value it omits the field rather than showing a
 * zero, which is the same rule the arrival beat follows for its row count.
 */
import { useEffect, useState } from 'react';
import { COPY } from '../content/copy.ts';
import { useWorld } from '../state/store.ts';

/** Counts down to the tenant's real TTL, from the real expiry timestamp. */
function useRemaining(expiresAt: string | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setLabel(null);
      return;
    }
    const tick = () => {
      const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (seconds <= 0) {
        // Expired is a real state and the surface says so rather than hiding it.
        setLabel('expired');
        return;
      }
      const minutes = Math.floor(seconds / 60);
      setLabel(`${minutes}:${String(seconds % 60).padStart(2, '0')}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return label;
}

export function StatusBar() {
  const source = useWorld((s) => s.source);
  const tenant = useWorld((s) => s.tenant);
  const presence = useWorld((s) => s.source.presence);
  const remaining = useRemaining(tenant?.expiresAt);

  /*
   * The badge repeats the document's own honesty rules rather than inventing a
   * third vocabulary: live when the socket is genuinely connected, replay when
   * the recording is carrying the world, connecting while it is still trying.
   */
  const mode = source.mode;
  const stateLabel =
    mode === 'live' ? 'LIVE' : mode === 'replay' ? COPY.degraded.badge : COPY.connecting.heading;

  return (
    /*
     * DELIBERATELY NOT A LIVE REGION.
     *
     * This started as role="status" aria-live="polite" and that was wrong twice
     * over. It made a second live region competing with the document's — which
     * is the one that should announce real events — and it wrapped a countdown
     * that changes every second, so a screen reader would have read the clock
     * aloud once a second, forever. Ambient state belongs in the document
     * order, announced when a visitor navigates to it, not pushed at them.
     */
    <div className="status-bar" data-mode={mode}>
      <span className="status-mode">
        <span className="status-dot" aria-hidden="true" />
        {stateLabel}
      </span>

      {tenant ? <span className="status-field">{tenant.publicRef}</span> : null}

      {remaining ? (
        <span className="status-field">
          <span className="status-key">expires</span>
          {/* The ticking value itself is hidden from assistive tech: a
              per-second countdown is noise to a screen reader, and the
              document states the real expiry timestamp in full. */}
          <span aria-hidden="true">{remaining}</span>
        </span>
      ) : null}

      {/*
        Presence is a count of ephemeral ids, never identities — the store holds
        nothing that could name anyone, by construction rather than by policy.
        
        It is rendered ONLY when the server says it measured it. The wire
        contract is explicit that `measured: false` carries `connections: 0`
        meaning UNKNOWN, and that a client must not present that as "nobody is
        here" — that would be the degraded case quietly reporting itself as a
        fact. Unknown is omitted, exactly as the row count and durationMs are.
      */}
      {presence?.measured ? (
        <span className="status-field">
          <span className="status-key">connected</span> {presence.connections}
        </span>
      ) : null}
    </div>
  );
}
