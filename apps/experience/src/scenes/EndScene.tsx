/**
 * 10 / END. The estate at rest.
 *
 * WHAT THE REFERENCE SHOWS
 * The widest and darkest frame in the set. A vast dark ground plane, one lit
 * spire in a glass column, long light-trails sweeping in from the lower left,
 * and nine section markers floating over the terrain. A closing line, a
 * version string, and two readouts: SYSTEM [STANDBY] and NEXT PROBLEM
 * [UNKNOWN].
 *
 * THE BEST THING IN THE ENTIRE REFERENCE SET IS ON THIS FRAME
 * `NEXT PROBLEM: [UNKNOWN]`. That is Truth Constitution rule 4 — unknown facts
 * are unstated, never estimated — rendered as a design element, by an image
 * that had no idea it was doing it. It is preserved verbatim, and it is the
 * note the whole world ends on.
 *
 * THIS IS THE QUIETEST STATION AND MUST STAY QUIET
 * No new dashboard, no new instrument cluster, no last spectacle. Everything
 * here has already been seen at another station: the same city, the same
 * plates, the same conduits, one core. What is new is only the distance and
 * the darkness — the visitor is being shown the whole thing from far away, once,
 * and then it ends.
 *
 * The trails are the only motion, and they carry the visitor's own session's
 * events. With no session they do not move, which is the correct ending for a
 * world nobody was in.
 */
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Core } from '../kit/Core.tsx';
import { Conduit, type ConduitPacket } from '../kit/Conduit.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, type Glow } from '../kit/glow.ts';
import { STATIONS } from '../kit/stations.ts';

/** The spire stands at the origin — the centre of everything already built. */
export const SPIRE_ORIGIN: [number, number, number] = [0, 0, 0];

export type EndSceneProps = {
  /** The visitor's own events this session. Drives the trails and the spire. */
  eventCount: number | null;
  /** Stations the visitor actually reached. Only those get a marker. */
  visited?: string[];
  packets?: ConduitPacket[];
  reducedMotion?: boolean;
  projection: LabelProjection;
};

/**
 * Markers for the stations the visitor actually visited.
 *
 * The reference floats nine labels over the terrain. Here the set is the
 * visitor's real path — a marker for a station they never reached would be
 * describing a journey that did not happen.
 */
export function endAnchors(visited: string[]): LabelAnchor[] {
  const out: LabelAnchor[] = [
    {
      id: 'spire',
      at: [0, 16, 0],
      label: 'THE ESTATE',
      detail: 'Everything you walked through',
      side: 'right',
      tone: PALETTE.structure,
    },
  ];

  const ring = 40;
  const seen = STATIONS.filter((s) => visited.includes(s.id) && s.id !== 'end');
  seen.forEach((station, i) => {
    const angle = (i / Math.max(seen.length, 1)) * Math.PI * 1.5 - Math.PI * 0.75;
    out.push({
      id: `visited:${station.id}`,
      at: [Math.cos(angle) * ring, 2 + (i % 3) * 2.5, Math.sin(angle) * ring],
      label: `${station.index} / ${station.id.toUpperCase()}`,
      side: Math.cos(angle) < 0 ? 'left' : 'right',
    });
  });

  return out;
}

export function EndScene({
  eventCount,
  packets = [],
  reducedMotion = false,
  projection,
}: EndSceneProps) {
  /*
   * The spire is lit by what the visitor actually did. A session with no events
   * leaves it dark, and the estate ends the way it began: quiet because it is
   * quiet.
   */
  const sessionGlow: Glow = eventCount === null ? DARK : glowFromActivity(eventCount, 40);

  return (
    <>
      {/* The city, at rest and at its darkest. Same seed as station 01 — this
          is literally the same ground, seen from far away at the end. */}
      <CityField count={460} position={[0, -2.4, 0]} radius={300} innerRadius={20} />

      {/* Plinth and glass column. */}
      <Plate
        size={[14, 14]}
        thickness={0.7}
        position={[0, 0.2, 0]}
        material="pcb"
        glow={sessionGlow}
        tint={PALETTE.structure}
        windows={1.2}
      />
      <Plate
        size={[5, 5]}
        thickness={11}
        position={[0, 6.2, 0]}
        material="frost"
        glow={sessionGlow}
        tint={PALETTE.record}
        rim={PALETTE.structure}
        lift={0.14}
        opacity={0.3}
      />

      <Core
        position={[0, 7, 0]}
        radius={0.8}
        glow={sessionGlow}
        colour={PALETTE.record}
        shaftHeight={22}
        shafts={3}
        reducedMotion={reducedMotion}
      />

      {/*
        The light trails. Long, low, sweeping in from the lower left exactly as
        the reference draws them — and carrying the visitor's own events, so an
        empty session leaves the ground still.
      */}
      {[0, 1, 2].map((i) => (
        <Conduit
          key={i}
          path={[
            [-120 - i * 18, -1 + i * 0.4, 96 + i * 14],
            [-52 - i * 8, 0.4, 44 + i * 6],
            [-12, 1.2 + i * 0.5, 12 - i * 3],
            [0, 1.6, 0],
          ]}
          packets={packets}
          colour={i === 1 ? PALETTE.ember : PALETTE.structure}
          restOpacity={0.26}
        />
      ))}

      <LabelProjector projection={projection} />
    </>
  );
}
