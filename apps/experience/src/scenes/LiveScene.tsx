/**
 * 06 / LIVE. The control room.
 *
 * WHAT THE REFERENCE SHOWS
 * Earth filling the upper frame, a machined control-plane ring floating in
 * front of it, a row of platform panels below, radial conduits fanning out, and
 * region markers with latencies. The only near-level camera in the whole set,
 * which is what makes this frame read as a ROOM rather than as a model.
 *
 * THE HONESTY PROBLEM THIS STATION HAS, STATED PLAINLY
 * Reference 06 is the frame with the highest concentration of unshippable
 * figures in the entire set: request rates, p95 latency, error rate, active
 * tenants, five region latencies, per-platform uptimes. Almost none of that
 * exists as a measurement here.
 *
 * The resolution is not to dim the frame. It is that the ONE region reading
 * this project genuinely has — the visitor's own measured edge round trip — is
 * real, specific, and theirs, and the globe is built to show exactly that:
 * their PoP lit and measured, every other marker present but unlit because
 * nothing measured it. A control room showing one true reading and admitting
 * the rest is a more interesting object than one showing six invented ones.
 */
import { useMemo } from 'react';
import { PALETTE } from '../render/shaders.ts';
import { Globe, geoToVector, type GlobeMarker } from '../kit/Globe.tsx';
import { Housing } from '../kit/Housing.tsx';
import { Plate } from '../kit/Plate.tsx';
import { Core } from '../kit/Core.tsx';
import { Conduit, type ConduitPacket } from '../kit/Conduit.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, type Glow } from '../kit/glow.ts';
import { ISLANDS, STATUS_TONE } from './systems.ts';

/** The control room floats above the estate. */
export const CONTROL_ORIGIN: [number, number, number] = [0, 34, -6];
const GLOBE_RADIUS = 13;

/**
 * Regions this project actually touches. Not a global footprint — two places
 * and the visitor's own edge, which is what is true.
 */
export const REGIONS: Array<Omit<GlobeMarker, 'rttMs' | 'tone'>> = [
  { id: 'blr', label: 'BELAGAVI', lat: 15.85, lon: 74.5 },
  { id: 'lon', label: 'UNITED KINGDOM', lat: 51.5, lon: -0.12 },
];

export type LiveSceneProps = {
  /** Real measured edge round trip, or null. The one reading that is ours. */
  edgeRttMs: number | null;
  /** Where the visitor's edge actually is, when the edge named it. */
  edgeGeo?: { lat: number; lon: number; label: string } | null;
  /** Real events per platform id. Absent means unlit. */
  activityByPlatform?: Record<string, number>;
  packets?: ConduitPacket[];
  reducedMotion?: boolean;
  projection: LabelProjection;
};

export function liveAnchors(edgeLabel: string | null): LabelAnchor[] {
  const [ox, oy, oz] = CONTROL_ORIGIN;
  const out: LabelAnchor[] = [
    {
      id: 'control',
      at: [ox, oy + 6.5, oz],
      label: 'CONTROL PLANE',
      detail: 'Fastify · WebSocket gateway · queue worker',
      side: 'right',
    },
  ];

  for (const region of REGIONS) {
    const at = geoToVector(region.lat, region.lon, GLOBE_RADIUS * 1.02);
    out.push({
      id: `region:${region.id}`,
      at: [ox + at.x, oy + at.y + 14, oz + at.z - 14],
      label: region.label,
      side: at.x < 0 ? 'left' : 'right',
      tone: PALETTE.structure,
    });
  }

  if (edgeLabel) {
    out.push({
      id: 'region:you',
      at: [ox - 13, oy + 2, oz + 10],
      label: `YOUR EDGE · ${edgeLabel}`,
      detail: 'Measured on this page load, not estimated',
      side: 'left',
      tone: PALETTE.green,
    });
  }

  return out;
}

export function LiveScene({
  edgeRttMs,
  edgeGeo = null,
  activityByPlatform = {},
  packets = [],
  reducedMotion = false,
  projection,
}: LiveSceneProps) {
  const [ox, oy, oz] = CONTROL_ORIGIN;

  const markers = useMemo<GlobeMarker[]>(() => {
    const out: GlobeMarker[] = REGIONS.map((region) => ({
      ...region,
      // Present but unmeasured. The location is a fact; the reading is not.
      rttMs: null,
      tone: PALETTE.structure,
    }));
    if (edgeGeo && edgeRttMs !== null) {
      out.push({
        id: 'you',
        label: edgeGeo.label,
        lat: edgeGeo.lat,
        lon: edgeGeo.lon,
        rttMs: edgeRttMs,
        tone: PALETTE.green,
      });
    }
    return out;
  }, [edgeGeo, edgeRttMs]);

  const totalActivity = Object.values(activityByPlatform).reduce<number | null>(
    (sum, v) => (v === undefined ? sum : (sum ?? 0) + v),
    null,
  );
  const controlGlow: Glow = totalActivity === null ? DARK : glowFromActivity(totalActivity, 40);

  return (
    <>
      <Globe
        radius={GLOBE_RADIUS}
        position={[ox, oy + 14, oz - 14]}
        markers={markers}
        glow={controlGlow}
        reducedMotion={reducedMotion}
      />

      {/*
        A deck under the platform row. Without it the four platforms floated in
        void and the frame lost its floor — the reference's control room is a
        ROOM, and a room needs something to stand on.
      */}
      <Plate
        size={[52, 16]}
        thickness={0.4}
        position={[ox, oy - 10.4, oz + 6]}
        material="pcb"
        glow={controlGlow}
        tint={PALETTE.structure}
        windows={0.3}
      />

      {/* The control ring: concentric machined discs, reusing Plate's disc. */}
      {[
        { r: 11, t: 0.5, y: 0 },
        { r: 8.4, t: 0.6, y: 0.9 },
        { r: 5.6, t: 0.7, y: 1.9 },
      ].map((ring, i) => (
        <Plate
          key={i}
          shape="disc"
          size={[ring.r * 2, ring.r * 2]}
          thickness={ring.t}
          position={[ox, oy + ring.y, oz]}
          material="pcb"
          glow={controlGlow}
          tint={PALETTE.record}
          rim={PALETTE.structure}
          windows={0.7}
        />
      ))}

      <Housing
        size={[2.6, 5, 2.6]}
        position={[ox, oy + 4.4, oz]}
        glow={controlGlow}
        seam={PALETTE.record}
        shape="cylinder"
      />
      <Core
        position={[ox, oy + 7.6, oz]}
        radius={0.75}
        glow={controlGlow}
        colour={PALETTE.record}
        shaftHeight={10}
        shafts={3}
        reducedMotion={reducedMotion}
      />

      {/*
        The platform row below the ring. Each is the real estate node, lit by
        its own real activity — the pre-launch platform has none and stays dark,
        which is the whole difference between this and the reference's row of
        uniformly healthy panels.
      */}
      {ISLANDS.map((island, i) => {
        const events = activityByPlatform[island.id];
        const lit = events === undefined ? DARK : glowFromActivity(events);
        const x = ox + (i - (ISLANDS.length - 1) / 2) * 11;
        const y = oy - 9;
        return (
          <group key={island.id}>
            <Plate
              size={[8.6, 6]}
              thickness={0.5}
              position={[x, y, oz + 6]}
              material="pcb"
              glow={lit}
              tint={island.tint}
              windows={0.9}
            />
            <Core
              position={[x, y + 1.6, oz + 6]}
              radius={0.4}
              glow={lit}
              colour={STATUS_TONE[island.status]}
              shaftHeight={0}
              reducedMotion={reducedMotion}
            />
            {/* Radial conduit from the ring down to the platform. */}
            <Conduit
              path={[
                [ox, oy - 0.4, oz],
                [(ox + x) / 2, oy - 5, oz + 3],
                [x, y + 0.6, oz + 6],
              ]}
              packets={packets}
              colour={PALETTE.structure}
              restOpacity={0.22}
            />
          </group>
        );
      })}

      <LabelProjector projection={projection} />
    </>
  );
}
