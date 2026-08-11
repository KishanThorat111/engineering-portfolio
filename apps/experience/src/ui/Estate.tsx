/**
 * The scale reveal (§2.7) and the record (§2.8).
 *
 * "Zoom out. The system the visitor has been playing inside resolves into one
 * node of four — beside the hospital platform, the menu platform, the
 * electrical platform. The thing they just tried to break is the smallest of
 * them."
 *
 * THE CONTRAST IS THE POINT. Three of these carry no live signal and are not
 * attackable, and that is stated rather than implied: *this one is yours to
 * break; those three are load-bearing and I am not letting you near them.*
 *
 * §2.8: "Any node opens into its case study — but the visitor reads the
 * disclosed limitations AFTER having operated the system." So the limitations
 * are on the node, here, at the end — not buried behind the link. "No automated
 * test suite" lands differently once you have been inside.
 */
import { useEffect, useState } from 'react';
import { COPY } from '../content/copy.ts';
import { loadEstate, type EstateNode } from '../live/estate.ts';
import { useWorld } from '../state/store.ts';

function Node({ node, live }: { node: EstateNode; live: boolean }) {
  return (
    <article className={`estate-node ${node.attackable ? 'estate-node-demo' : ''}`}>
      <header>
        <p className="estate-status">{node.statusLabel}</p>
        <h3>
          {/* The three platforms link to their case studies on the static
              surface. The demo plane links to itself, because it IS the page. */}
          {node.attackable ? node.name : <a href={node.url}>{node.name}</a>}
        </h3>
      </header>

      <p className="estate-summary">{node.summary}</p>

      <p className={`estate-posture ${node.attackable ? 'is-open' : 'is-closed'}`}>
        {node.attackable ? COPY.estate.attackable : COPY.estate.notAttackable}
      </p>

      <p className="estate-signal">
        {node.liveSignal
          ? live
            ? COPY.estate.signalLive
            : COPY.estate.signalDegraded
          : COPY.estate.signalNone}
      </p>

      {node.limitations.length > 0 ? (
        <div className="estate-limitations">
          <h4>{COPY.estate.limitationsHeading}</h4>
          <ul>
            {node.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function Estate() {
  const sourceMode = useWorld((s) => s.source.mode);
  const [nodes, setNodes] = useState<EstateNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadEstate()
      .then((loaded) => {
        if (!cancelled) setNodes(loaded);
      })
      .catch((cause: unknown) => {
        // The estate comes from the machine layer, which is a static file on
        // the same origin. If it cannot be read, say so rather than rendering
        // three platforms from memory.
        if (!cancelled) setError((cause as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="estate-heading" className="panel">
      <h2 id="estate-heading">{COPY.estate.heading}</h2>
      <p className="panel-note">{COPY.estate.lede}</p>

      {error ? (
        <div className="notice">
          <p>{COPY.estate.unavailable}</p>
          <p className="notice-reason">{error}</p>
        </div>
      ) : null}

      {nodes ? (
        <>
          <div className="estate">
            {nodes.map((node) => (
              <Node key={node.id} node={node} live={sourceMode === 'live'} />
            ))}
          </div>
          <p className="estate-note">{COPY.estate.permissionsNote}</p>
        </>
      ) : null}
    </section>
  );
}
