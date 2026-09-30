/**
 * THE INSTRUMENT PANEL — the interface object every reference shares.
 *
 * Ten references, and all ten frame the world with the same component: a small
 * translucent panel with a 10px uppercase mono title, a status dot, and a body
 * of label/value rows or a sparkline. Reference 06 alone shows more than a
 * dozen. Building this once is most of the reference set's interface.
 *
 * P9 ALREADY DECIDED THIS MATERIAL, AND THIS INHERITS IT
 * The live surface's panels went to 62% opacity with a heavier blur so the
 * world could be seen through them and they would read as instruments standing
 * in a space rather than as a document laid over one. That is exactly the
 * material the references show. This component uses the static surface's
 * register tokens directly, so crossing from the fast lane into the world does
 * not look like crossing sites.
 *
 * THE UNMEASURED CASE IS THE WHOLE DESIGN PROBLEM HERE
 * Every reference panel is full of confident numbers, and §3 of the
 * decomposition establishes that most of those numbers cannot ship — they are
 * either forbidden by the Truth Constitution or simply invented. So the panel's
 * most important state is the one the references never draw: a value that is
 * not known. `Reading` makes that a first-class case. An unknown reading
 * renders an em-dash and the row keeps its shape, because Truth Constitution
 * rule 4 says unknown facts are unstated — never estimated, never placeholdered
 * — and an unpublished figure is unpublished, NOT zero.
 */
import type { ReactNode } from 'react';

/** A value, or the honest absence of one. `null` renders as unknown. */
export type Reading = {
  label: string;
  value: string | null;
  /**
   * The date qualifier. Truth Constitution rule 2: every figure carries the
   * date it was true. A figure without one is a claim about today.
   */
  asOf?: string;
  tone?: string;
};

export type InstrumentPanelProps = {
  title: string;
  /** Register hue for the status dot. Omit when the panel carries no state. */
  tone?: string;
  /**
   * Liveness, stated on the panel that shows the data. Rule 12: liveness is
   * never faked, and degraded says so.
   */
  source?: 'live' | 'replay' | 'unknown';
  readings?: Reading[];
  children?: ReactNode;
  className?: string;
};

const SOURCE_LABEL: Record<NonNullable<InstrumentPanelProps['source']>, string> = {
  live: 'LIVE',
  /* Never smoothed over. A visitor who discovers a replay was presented as
   * live has learned the opposite of what this project intends (§6.3). */
  replay: 'REPLAY',
  unknown: 'UNKNOWN',
};

export function InstrumentPanel({
  title,
  tone,
  source,
  readings,
  children,
  className,
}: InstrumentPanelProps) {
  return (
    <section className={`instrument${className ? ` ${className}` : ''}`}>
      <header className="instrument__head">
        <h2 className="instrument__title">
          {tone ? (
            <span className="instrument__dot" style={{ background: tone }} aria-hidden="true" />
          ) : null}
          {title}
        </h2>
        {source ? (
          <span className="instrument__source" data-source={source}>
            {SOURCE_LABEL[source]}
          </span>
        ) : null}
      </header>

      {readings && readings.length > 0 ? (
        <dl className="instrument__readings">
          {readings.map((reading) => (
            <div className="instrument__row" key={reading.label}>
              <dt className="instrument__label">{reading.label}</dt>
              <dd
                className="instrument__value"
                data-known={reading.value === null ? 'false' : 'true'}
                style={reading.tone ? { color: reading.tone } : undefined}
              >
                {reading.value === null ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="instrument__unknown">not measured</span>
                  </>
                ) : (
                  reading.value
                )}
                {reading.asOf ? (
                  <span className="instrument__asof"> as of {reading.asOf}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children}
    </section>
  );
}
