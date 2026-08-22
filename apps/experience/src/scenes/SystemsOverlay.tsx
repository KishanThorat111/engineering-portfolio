/**
 * REFERENCE 02 — SYSTEMS. The interface half.
 *
 * The reference's composition, reproduced:
 *   left column    eyebrow, display hero, sub-line, action, dissection index
 *   floating cards one per island, carrying number / name / status / line
 *   bottom left    an architecture overview panel
 *   bottom centre  the live request trace, the same component as station 01
 *   bottom right   a systems overview
 *
 * WHAT THE CARDS CARRY THAT THE REFERENCE'S DO NOT
 * A disclosed limitation, on the card, before the visitor has committed to
 * reading anything. Rule 3 requires the disclosure; P9 established putting it
 * on the index rather than inside the case study and recorded it as the
 * collection's most distinguishing feature. It costs nothing but nerve, and a
 * register of systems that each admit their own worst property is not a thing
 * a portfolio does.
 *
 * WHAT THE REFERENCE'S SYSTEMS OVERVIEW CLAIMED, AND WHAT SHIPS
 * "3 Primary Systems | 12 Services Online". The three is real and ships. The
 * twelve is an invention and does not — the tile carries the estate's real
 * composition instead, and the demo is counted separately from the production
 * systems because conflating them would be the exact overstatement rule 11
 * exists to stop.
 */
import { COPY } from '../content/copy.ts';
import { InstrumentPanel } from '../kit/InstrumentPanel.tsx';
import { PALETTE } from '../render/shaders.ts';
import { STATIONS, type StationId } from '../kit/stations.ts';
import { ISLANDS, DISSECTION, STATUS_TONE, STATUS_LABEL } from './systems.ts';

export type SystemsOverlayProps = {
  source: 'live' | 'replay' | 'unknown';
  activeStation: StationId;
  onStation?: (id: StationId) => void;
  activeIsland?: string | null;
  onIsland?: (id: string) => void;
  activeDissection?: string;
};

export function SystemsOverlay({
  source,
  activeStation,
  onStation,
  activeIsland = null,
  onIsland,
  activeDissection = '02',
}: SystemsOverlayProps) {
  const production = ISLANDS.filter((i) => !i.attackable).length;

  return (
    <div className="enter systems">
      {/* --- Top rail: identical to station 01. One nav, one world. ---- */}
      <header className="enter__top">
        <a className="enter__mark" href="/">
          KT<span aria-hidden="true">.</span>
        </a>
        <nav className="enter__nav" aria-label="Stations">
          <ol>
            {STATIONS.map((station) => (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => onStation?.(station.id)}
                  aria-current={station.id === activeStation ? 'true' : undefined}
                >
                  <span className="enter__nav-index">{station.index}</span>
                  <span className="enter__nav-slash" aria-hidden="true">
                    /
                  </span>
                  <span className="enter__nav-name">{station.id}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="enter__status">
          <InstrumentPanel
            title="System status"
            tone={source === 'live' ? PALETTE.green : PALETTE.amber}
            source={source}
          />
        </div>
      </header>

      {/* --- Left column ---------------------------------------------- */}
      <div className="enter__hero systems__hero">
        <p className="systems__eyebrow">02 / SYSTEMS</p>

        <h2 className="enter__claim systems__claim">
          <span className="enter__claim-line">{COPY.systems.claimLead}</span>
          <span className="enter__claim-line enter__claim-line--emphasis">
            {COPY.systems.claimEmphasis}
          </span>
          <span className="enter__claim-line">{COPY.systems.claimTail}</span>
        </h2>

        <p className="enter__subline">{COPY.systems.subline}</p>

        <nav className="systems__dissection" aria-label="Case study sections">
          <p className="systems__dissection-title">{COPY.systems.dissectionTitle}</p>
          <ol>
            {DISSECTION.map((section) => (
              <li key={section.index}>
                <span
                  className="systems__dissection-row"
                  data-active={section.index === activeDissection ? 'true' : 'false'}
                >
                  <span className="systems__dissection-index">{section.index}</span>
                  <span className="systems__dissection-label">{section.label}</span>
                </span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* --- Right column: register, then the estate overview --------- */}
      <div className="systems__column">
        <div className="systems__register">
          {ISLANDS.map((island) => (
            <article
              key={island.id}
              className="systems__card"
              data-active={island.id === activeIsland ? 'true' : 'false'}
            >
              <header>
                <span className="systems__card-index">{island.index}</span>
                <h2 className="systems__card-title">{island.title}</h2>
              </header>

              <p className="systems__card-status" style={{ color: STATUS_TONE[island.status] }}>
                <span
                  className="systems__card-dot"
                  style={{ background: STATUS_TONE[island.status] }}
                  aria-hidden="true"
                />
                {STATUS_LABEL[island.status]}
              </p>

              <p className="systems__card-line">{island.line}</p>

              {/*
              Rule 3, on the card. The wording is the collection's own, date
              qualifier included — it is not summarised here, because a
              summarised limitation is a softened one.
            */}
              <p className="systems__card-limitation">
                <span className="systems__card-limitation-label">
                  {COPY.systems.limitationLabel}
                </span>
                {island.limitation}
              </p>

              {island.href ? (
                <a className="systems__card-link" href={island.href}>
                  {COPY.systems.readRecord}
                </a>
              ) : (
                <button
                  type="button"
                  className="systems__card-link"
                  onClick={() => onIsland?.(island.id)}
                >
                  {COPY.systems.enterDemo}
                </button>
              )}
            </article>
          ))}
        </div>

        {/* The estate's real composition, at the foot of the same column. */}
        <div className="systems__overview">
          <InstrumentPanel
            title={COPY.systems.overviewTitle}
            tone={PALETTE.green}
            source={source}
            readings={[
              { label: COPY.systems.overviewProduction, value: String(production) },
              { label: COPY.systems.overviewDemo, value: '1' },
              /*
               * The reference's "12 Services Online" sat here. There is no such
               * measured figure, so the slot carries the honest unknown rather
               * than a number — rule 4, and the panel keeps its shape either way.
               */
              { label: COPY.systems.overviewServices, value: null },
            ]}
          >
            <p className="systems__overview-note">{COPY.systems.overviewNote}</p>
          </InstrumentPanel>
        </div>
      </div>
    </div>
  );
}
