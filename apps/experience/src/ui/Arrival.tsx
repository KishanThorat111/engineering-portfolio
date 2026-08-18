/**
 * The arrival beat (§2.2), and the visitor's own tenant.
 *
 * "A single line of monospace text resolves the visitor's actual edge PoP and
 * round-trip time. Then the TLS handshake. Then `provisioning tenant…`, and a
 * real tenant ID lands. These numbers are real and specific to that visitor."
 *
 * EVERY NUMBER HERE IS MEASURED. The round trip is timed, the PoP comes from
 * Cloudflare's own trace endpoint (A6 — from the edge, so this beat survives
 * the VM being down), the TLS line reports what the browser actually
 * negotiated, and the tenant id is one the control plane really created. When
 * the edge does not name a PoP this prints "unknown" — it never guesses a
 * location, because a fabricated city would be the first thing a visitor could
 * catch the site lying about.
 */
import { COPY } from '../content/copy.ts';
import { useWorld } from '../state/store.ts';

function Line({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: 'done' | 'pending';
}) {
  return (
    <li className={`arrival-line arrival-${state}`}>
      <span className="arrival-label">{label}</span>
      <span className="arrival-value">{value}</span>
    </li>
  );
}

export function Arrival() {
  const edge = useWorld((s) => s.edge);
  const tenant = useWorld((s) => s.tenant);
  const error = useWorld((s) => s.provisionError);
  const source = useWorld((s) => s.source);

  const secure = typeof location !== 'undefined' && location.protocol === 'https:';

  return (
    <section aria-labelledby="arrival-heading" className="panel panel-arrival">
      <h2 id="arrival-heading">{COPY.beats.arrival.name}</h2>
      <p className="panel-note">{COPY.beats.arrival.line}</p>

      <ul className="arrival">
        <Line
          label={COPY.arrival.resolving}
          value={
            edge === null
              ? '…'
              : `${edge.pop ?? COPY.arrival.popUnknown} · ${edge.rttMs}ms round trip`
          }
          state={edge === null ? 'pending' : 'done'}
        />
        <Line
          label={COPY.arrival.tls}
          // What the browser actually negotiated. Over http it says so rather
          // than claiming a handshake that did not happen.
          value={secure ? 'https, negotiated by your browser' : 'plain http (local development)'}
          state="done"
        />
        <Line
          label={COPY.arrival.provisioning}
          value={tenant ? tenant.publicRef : error ? 'failed' : '…'}
          state={tenant || error ? 'done' : 'pending'}
        />
        {tenant ? (
          <Line
            label={COPY.arrival.ready}
            /*
             * The row count is stated only when it is known. A returning
             * visitor's session carries no count until `me()` answers, and the
             * expiry alone is true on its own — better than pairing it with a
             * number nobody measured.
             */
            value={
              tenant.seededRecords === null
                ? `expires ${new Date(tenant.expiresAt).toLocaleTimeString()}`
                : `${tenant.seededRecords} rows seeded · expires ${new Date(
                    tenant.expiresAt,
                  ).toLocaleTimeString()}`
            }
            state="done"
          />
        ) : null}
      </ul>

      {edge ? <p className="arrival-note">{COPY.arrival.popNote}</p> : null}

      {error ? (
        <div className="notice">
          <p>{COPY.arrival.failed}</p>
          <p className="notice-reason">{error}</p>
          {source.mode === 'replay' ? <p>{COPY.degraded.body}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
