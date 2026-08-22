/**
 * 04 / DATA. One request, crossing the system, in space.
 *
 * WHAT THE REFERENCE SHOWS
 * The layer stack of station 03 re-read HORIZONTALLY: seven staged objects on a
 * faint grid floor, left to right, with a labelled request capsule travelling
 * between them. Denied branches drop away downward in red. Near-level camera.
 *
 * THE REFERENCE'S BEST IDEA, AND THE ONE WORTH COPYING EXACTLY
 * The travelling request is the brightest object in frame and lights each stage
 * as it passes. That is why the sequence is legible even in a still image, and
 * it is the reason this station is not a flowchart: the packet is the key
 * light, so the eye follows it rather than reading boxes.
 *
 * CONTINUITY
 * The stages are laid out along +X from the demo island, on the same ground
 * plane as every other station, at the height the dissection stack's services
 * layer sits. Travelling 03 → 04 is the stack rotating edge-on and flattening
 * into a line; nothing is rebuilt.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { Housing } from '../kit/Housing.tsx';
import { Plate } from '../kit/Plate.tsx';
import { Conduit, type ConduitPacket } from '../kit/Conduit.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, speedFromLatency, type Glow } from '../kit/glow.ts';

/** Where the request path lives in the shared world. */
export const PATH_ORIGIN: [number, number, number] = [-8, 6, 17];
const SPAN = 9.5;

export type Stage = {
  id: string;
  label: string;
  role: string;
  /** Housing shape: datastores are cylinders, services are boxes. */
  shape: 'box' | 'cylinder';
  size: [number, number, number];
  tone: string;
};

export const STAGES: Stage[] = [
  {
    id: 'client',
    label: 'CLIENT',
    role: 'This page',
    shape: 'box',
    size: [3.4, 2.2, 2.4],
    tone: PALETTE.structure,
  },
  {
    id: 'edge',
    label: 'EDGE',
    role: 'Tunnel · TLS',
    shape: 'box',
    size: [2.6, 3, 2.6],
    tone: PALETTE.structure,
  },
  {
    id: 'gateway',
    label: 'API GATEWAY',
    role: 'Auth · routing',
    shape: 'box',
    size: [3, 3.4, 2.8],
    tone: PALETTE.structure,
  },
  {
    id: 'service',
    label: 'SERVICE',
    role: 'Business logic',
    shape: 'box',
    size: [3.6, 4, 3.2],
    tone: PALETTE.record,
  },
  {
    id: 'cache',
    label: 'REDIS',
    role: 'Limits · keys',
    shape: 'cylinder',
    size: [2.8, 3, 2.8],
    tone: PALETTE.ember,
  },
  {
    id: 'db',
    label: 'POSTGRESQL',
    role: 'Query, RLS scoped',
    shape: 'cylinder',
    size: [3.4, 3.8, 3.4],
    tone: PALETTE.ember,
  },
  {
    id: 'response',
    label: 'RESPONSE',
    role: 'Back to you',
    shape: 'box',
    size: [3.2, 2.4, 2.4],
    tone: PALETTE.green,
  },
];

export function stageAt(index: number): [number, number, number] {
  const [ox, oy, oz] = PATH_ORIGIN;
  return [ox + index * SPAN - (STAGES.length - 1) * SPAN * 0.5, oy, oz];
}

export type DataSceneProps = {
  /** Per-stage measured durations. `null` in the map means the hop is untimed. */
  hopMs?: Record<string, number | null>;
  /** Whether the visitor's most recent attempt was refused. */
  denied?: boolean;
  reducedMotion?: boolean;
  projection: LabelProjection;
  cityBlocks?: number;
};

/**
 * The travelling request. Its own light is what reveals each stage.
 *
 * Speed comes from `speedFromLatency`, so a slow request is visibly slow. With
 * no measured total there is no capsule at all — the path stays dark and
 * static, which is the honest picture of a request that has not happened.
 */
function RequestCapsule({
  totalMs,
  denied,
  reducedMotion,
}: {
  totalMs: number | null;
  denied: boolean;
  reducedMotion: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const pathLength = (STAGES.length - 1) * SPAN;
  const speed = speedFromLatency(totalMs, pathLength);

  useFrame(({ clock }) => {
    if (!mesh.current || !light.current || speed === null) return;
    const t = reducedMotion ? 0.5 : ((clock.getElapsedTime() * speed) % pathLength) / pathLength;
    /*
     * A denied request stops at the service stage and does not continue. The
     * choreography is the claim: it did not reach the data.
     */
    const limit = denied ? 3 / (STAGES.length - 1) : 1;
    const at = Math.min(t, limit);
    const [x, y, z] = stageAt(0);
    mesh.current.position.set(x + at * pathLength, y + 1.6, z);
    light.current.position.copy(mesh.current.position);
  });

  if (speed === null) return null;
  const tone = denied ? PALETTE.danger : PALETTE.green;

  return (
    <>
      <mesh ref={mesh}>
        <capsuleGeometry args={[0.32, 0.9, 6, 12]} />
        <meshBasicMaterial color={tone} toneMapped={false} />
      </mesh>
      {/* THE PACKET IS THE KEY LIGHT. This is the reference's whole idea. */}
      <pointLight ref={light} color={tone} distance={16} decay={2} intensity={9} />
    </>
  );
}

export function dataAnchors(): LabelAnchor[] {
  return STAGES.map((stage, i) => {
    const [x, y, z] = stageAt(i);
    return {
      id: `stage:${stage.id}`,
      at: [x, y + stage.size[1] / 2 + 1.4, z],
      label: stage.label,
      detail: stage.role,
      // Alternating sides keep seven labels along one line from colliding.
      side: i % 2 === 0 ? 'left' : 'right',
      tone: stage.tone,
    };
  });
}

export function DataScene({
  hopMs = {},
  denied = false,
  reducedMotion = false,
  projection,
  cityBlocks = 220,
}: DataSceneProps) {
  const [, oy, oz] = PATH_ORIGIN;

  const totalMs = useMemo(() => {
    const values = Object.values(hopMs).filter((v): v is number => v !== null);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
  }, [hopMs]);

  const packets = useMemo<ConduitPacket[]>(() => [], []);

  return (
    <>
      <CityField count={cityBlocks} position={[0, -2.4, 0]} radius={240} innerRadius={70} />

      {/* The faint grid floor the reference stands its stages on. */}
      <Plate
        size={[SPAN * STAGES.length + 8, 22]}
        thickness={0.2}
        position={[PATH_ORIGIN[0], oy - 2.6, oz]}
        material="pcb"
        /*
         * Dim, and FINE rather than sparse.
         *
         * `windows` is cells per world unit, so lowering it to thin the floor
         * out did the opposite of what was wanted: on a 74-unit plate it
         * produced a handful of enormous pale rectangles. Density goes up and
         * brightness comes down instead — which is what a faint grid floor
         * actually is, and it keeps the travelling capsule the brightest thing
         * in shot, which this frame cannot do without.
         */
        glow={totalMs === null ? DARK : glowFromActivity(1.4)}
        tint={PALETTE.structure}
        windows={1.9}
      />

      {STAGES.map((stage, i) => {
        const [x, y, z] = stageAt(i);
        const ms = hopMs[stage.id];
        /*
         * A stage lights only if its own hop was timed. Most are not — this
         * system times the span, not each hop — so most stages here are dark
         * housings that the travelling capsule lights as it passes. That is
         * both the honest state and, conveniently, exactly the reference's
         * lighting design.
         */
        const lit: Glow = ms === undefined || ms === null ? DARK : glowFromActivity(ms, 60);
        return (
          <Housing
            key={stage.id}
            size={stage.size}
            position={[x, y, z]}
            glow={lit}
            seam={stage.tone}
            shape={stage.shape}
          />
        );
      })}

      {/* The route itself: a straight conduit through every stage. */}
      <Conduit
        path={[stageAt(0), stageAt(3), stageAt(STAGES.length - 1)]}
        packets={packets}
        colour={PALETTE.structure}
        restOpacity={0.3}
      />

      {/*
        The refused branch. It leaves the service stage and drops away, and it
        exists only when a request really was refused.
      */}
      {denied ? (
        <Conduit
          path={[stageAt(3), [stageAt(4)[0] - 3, oy - 4, oz + 4], [stageAt(4)[0], oy - 7, oz + 9]]}
          packets={packets}
          colour={PALETTE.danger}
          restOpacity={0.5}
        />
      ) : null}

      <RequestCapsule totalMs={totalMs} denied={denied} reducedMotion={reducedMotion} />

      <LabelProjector projection={projection} />
    </>
  );
}
