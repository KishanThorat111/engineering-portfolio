/**
 * The accessible document.
 *
 * THIS IS NOT A FALLBACK. It is the authoritative reading of the system, and
 * the canvas is an illustration of what it says. WCAG 2.2 AA binds both
 * surfaces (§11), and "the visual layer must never become the only way to
 * understand important information" is the constraint that decides the shape
 * here: real headings, real lists, a real live region, keyboard-reachable
 * throughout, and no information that exists only as geometry.
 *
 * It is always rendered. It is not hidden when WebGL works — a sighted mouse
 * user reads the same log a screen reader does, which is also what makes the
 * world legible rather than merely impressive.
 */
import { useEffect, useRef, useState } from 'react';
import type { LiveEvent } from '@contract';
import { COPY } from '../content/copy.ts';
import { useWorld } from '../state/store.ts';

function relativeTime(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 2) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

/**
 * How a duration is written.
 *
 * `null` becomes "not measured" in words, never a dash a reader might take for
 * zero and never an estimate. The same distinction the packet shader draws as
 * a dashed line, said out loud for anyone reading rather than watching.
 */
function duration(ms: number | null): string {
  if (ms === null) return 'not measured';
  if (ms < 1) return '<1ms';
  return `${Math.round(ms)}ms`;
}

function SourceBadge() {
  const source = useWorld((s) => s.source);

  if (source.mode === 'live') {
    return (
      <p className="badge badge-live">
        <span className="dot" aria-hidden="true" />
        LIVE
        <span className="badge-note">{COPY.disclosure.short}</span>
      </p>
    );
  }

  if (source.mode === 'replay') {
    return (
      <div className="badge badge-replay">
        <span className="dot" aria-hidden="true" />
        {COPY.degraded.badge}
        <span className="badge-note">
          {COPY.degraded.recordedNote}
          {source.recordedAt ? ` — ${new Date(source.recordedAt).toISOString().slice(0, 10)}` : ''}
        </span>
      </div>
    );
  }

  return (
    <p className="badge badge-connecting">
      <span className="dot" aria-hidden="true" />
      {COPY.connecting.heading}
    </p>
  );
}

function EventRow({ event, now }: { event: LiveEvent; now: number }) {
  return (
    <li className={`event event-${event.outcome}`}>
      <span className="event-outcome" aria-hidden="true" />
      <span className="event-action">{event.action}</span>
      <span className="event-org" title="Pseudonymous tenant reference">
        {event.isSelf ? 'your tenant' : event.orgRef}
      </span>
      <span className="event-duration">{duration(event.durationMs)}</span>
      <span className="event-time">{relativeTime(event.occurredAt, now)}</span>
      <span className="sr-only">
        {event.outcome === 'denied' ? 'Denied. ' : ''}
        {event.outcome === 'error' ? 'Error. ' : ''}
        {event.durationMs === null
          ? 'Duration not measured.'
          : `Took ${Math.round(event.durationMs)} milliseconds.`}
      </span>
    </li>
  );
}

export function LiveDocument() {
  const log = useWorld((s) => s.log);
  const source = useWorld((s) => s.source);
  const volumes = useWorld((s) => s.volumes);
  const tier = useWorld((s) => s.tier);
  const frame = useWorld((s) => s.frame);
  const reducedMotion = useWorld((s) => s.reducedMotion);
  const webglAvailable = useWorld((s) => s.webglAvailable);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // One second is enough for "12s ago" to stay honest and is cheap. It is a
    // clock, not an animation, so reduced motion does not disable it.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /*
   * A polite live region announcing denials only.
   *
   * Announcing every event would make the page unusable with a screen reader
   * during a burst. Denials are the ones that matter — they are the moment the
   * system refused something — so they are the ones spoken.
   */
  const lastAnnounced = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const denial = log.find((event) => event.outcome === 'denied');
    if (!denial || denial.id === lastAnnounced.current) return;
    lastAnnounced.current = denial.id;
    setAnnouncement(`Denied: ${denial.action}. The isolation boundary refused the request.`);
  }, [log]);

  const denials = log.filter((event) => event.outcome === 'denied').length;

  return (
    <>
      <header className="document-header">
        <p className="eyebrow">{COPY.disclosure.label}</p>
        <h1>{COPY.document.title}</h1>
        <p className="lede">{COPY.document.intro}</p>
        <SourceBadge />
        {source.mode === 'replay' ? (
          <div className="notice notice-replay">
            <h2>{COPY.degraded.heading}</h2>
            <p>{COPY.degraded.body}</p>
            {source.reason ? <p className="notice-reason">Reason: {source.reason}</p> : null}
          </div>
        ) : null}
        {!webglAvailable ? (
          <div className="notice">
            <h2>{COPY.webglUnavailable.heading}</h2>
            <p>{COPY.webglUnavailable.body}</p>
          </div>
        ) : null}
      </header>

      <section aria-labelledby="state-heading" className="panel">
        <h2 id="state-heading">{COPY.document.sceneSummary}</h2>
        <dl className="stats">
          <div>
            <dt>Tenants seen</dt>
            <dd>{volumes.size}</dd>
          </div>
          <div>
            <dt>Events received</dt>
            <dd>{log.length}</dd>
          </div>
          <div>
            <dt>Refusals</dt>
            <dd>{denials}</dd>
          </div>
          <div>
            <dt>Other people connected</dt>
            {/*
              Honest presence. `measured: false` means unknown and says so —
              rendering it as 0 would present a degraded reading as a fact.
            */}
            <dd>
              {source.presence === null
                ? 'unknown'
                : source.presence.measured
                  ? source.presence.connections
                  : 'unknown'}
            </dd>
          </div>
        </dl>
        {log.length === 0 ? <p className="quiet">{COPY.document.quietWorld}</p> : null}
      </section>

      <section aria-labelledby="legend-heading" className="panel">
        <h2 id="legend-heading">{COPY.legend.heading}</h2>
        <ul className="legend">
          {COPY.legend.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {reducedMotion ? <p className="quiet">{COPY.reducedMotion.note}</p> : null}
      </section>

      <section aria-labelledby="log-heading" className="panel">
        <h2 id="log-heading">{COPY.document.eventLogHeading}</h2>
        <p className="panel-note">{COPY.document.eventLogDescription}</p>
        {log.length === 0 ? (
          <p className="quiet">{COPY.document.emptyLog}</p>
        ) : (
          <ol className="event-log">
            {log.map((event) => (
              <EventRow key={event.id} event={event} now={now} />
            ))}
          </ol>
        )}
      </section>

      <footer className="document-footer">
        <p className="disclosure">{COPY.disclosure.full}</p>
        <p className="rendering-note">
          {COPY.quality.note} Current tier: {tier} — {COPY.quality.tiers[tier]}
          {frame.fps > 0 ? ` Measured ${frame.fps}fps, p95 frame ${frame.p95.toFixed(1)}ms.` : ''}
        </p>
        <p>
          <a href="/">{COPY.actions.backToSite}</a>
        </p>
      </footer>

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}
