/**
 * K3 — CONDUIT. A route between two anchors, and the packets that travel it.
 *
 * Appears in all ten references and is the single most reused object in the
 * set: the ropes between the stack and its satellites (01), the arcs between
 * islands (02), the drops between architecture layers (03), the request path
 * (04), the radial fan out of the control ring (06), the trails across the
 * estate (10). One object, ten scales.
 *
 * THIS IS WHERE "MOTION IS MEASUREMENT" IS ENFORCED (§3.6)
 * A bead's speed is the measured duration of the span it represents. Nothing
 * here is eased for prettiness and nothing moves on a clock. The consequence
 * that matters: an event whose duration was never measured (`durationMs: null`
 * on the wire contract) produces NO BEAD. Not a default-speed bead, not a
 * dimmed one — none. A fabricated speed would be a visual produced without the
 * backend being real, and §1.3's corollary rules it out.
 *
 * WHY THE TUBE IS STATIC AND THE BEADS ARE INSTANCED
 * The route does not change; only what is on it does. So the tube geometry is
 * built once per conduit and the beads are one InstancedMesh for the whole
 * conduit, with per-instance position written on the frame. A scene with forty
 * conduits and a hundred beads in flight is then a few dozen draw calls rather
 * than a few hundred, which is what makes the 60fps budget reachable at the
 * densities references 02, 05 and 06 actually show.
 *
 * WHY CATMULL-ROM AND NOT A BEZIER
 * The references route conduits through waypoints — around plate edges, under
 * decks, out to satellites — rather than between two points with handles. A
 * centripetal Catmull-Rom takes the waypoints directly, does not overshoot on
 * uneven spacing, and gives the sagging cable-like curve visible in the 01
 * crop. Bezier handles would have to be authored per route by hand.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { speedFromLatency, type Measurement } from './glow.ts';

/** One thing travelling one conduit, because one real event happened. */
export type ConduitPacket = {
  /** The audit row's id. One event, one row, one bead, same identifier. */
  id: string;
  /** Real measured span duration. `null` means unmeasured — draws nothing. */
  durationMs: Measurement;
  outcome: 'allowed' | 'denied' | 'error';
  /** When this bead entered the conduit, in seconds on the render clock. */
  startedAt: number;
};

export type ConduitProps = {
  /** Two or more world-space waypoints. */
  path: Array<[number, number, number]>;
  radius?: number;
  /** Route hue. Structure by default — a route carries no state, its traffic does. */
  colour?: string;
  /**
   * How visible the empty route is. The references draw unused conduits as
   * faint structure rather than hiding them, which is what makes the topology
   * readable when the system is quiet.
   */
  restOpacity?: number;
  packets?: ConduitPacket[];
  /** Retire a bead that has reached the end. */
  onArrive?: (id: string) => void;
  /** Cap, from the active quality tier. */
  maxBeads?: number;
};

const OUTCOME_COLOUR: Record<ConduitPacket['outcome'], string> = {
  allowed: PALETTE.green,
  /*
   * A denial is the only thing that turns cold. The bead runs fault-red along
   * the route and the isolation colour appears only at the membrane it strikes
   * — the boundary is what is cyan, not the request that hit it.
   */
  denied: PALETTE.danger,
  error: PALETTE.amber,
};

const scratch = new THREE.Object3D();
const scratchColour = new THREE.Color();
/*
 * Reused per bead per frame. These exist because the obvious way to write the
 * loop below allocates a Vector3 for every bead on every frame: at the bead
 * counts references 02, 05 and 06 show, that is thousands of short-lived
 * objects a second and a GC pause visible as a dropped frame — which, in a
 * world where motion is a measurement, would be the renderer lying about
 * latency it did not have.
 */
const scratchTangent = new THREE.Vector3();
/** The geometry's own axis. Beads are stretched along +Z; see the sphere below. */
const BEAD_AXIS = new THREE.Vector3(0, 0, 1);

export function Conduit({
  path,
  radius = 0.035,
  colour = PALETTE.structure,
  restOpacity = 0.22,
  packets = [],
  onArrive,
  maxBeads = 64,
}: ConduitProps) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        path.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        'centripetal',
      ),
    [path],
  );

  const length = useMemo(() => curve.getLength(), [curve]);
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, Math.max(16, Math.round(length * 4)), radius, 6, false),
    [curve, length, radius],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const beads = useRef<THREE.InstancedMesh>(null);
  const arrived = useRef(new Set<string>());

  useFrame(({ clock }) => {
    const mesh = beads.current;
    if (!mesh) return;

    const now = clock.getElapsedTime();
    let drawn = 0;

    for (const packet of packets) {
      if (drawn >= maxBeads) break;

      /*
       * The honesty gate, and the reason this loop is written this way. An
       * unmeasured span yields a null speed and is skipped entirely. There is
       * deliberately no fallback branch here — adding one is how this rule
       * would quietly die.
       */
      const speed = speedFromLatency(packet.durationMs, length);
      if (speed === null) continue;

      const travelled = (now - packet.startedAt) * speed;
      const t = travelled / length;

      if (t >= 1) {
        if (!arrived.current.has(packet.id)) {
          arrived.current.add(packet.id);
          onArrive?.(packet.id);
        }
        continue;
      }
      if (t < 0) continue;

      curve.getPointAt(t, scratch.position);
      // Beads lead slightly into their direction of travel, so a fast packet
      // reads as a streak and a slow one as a bead. The stretch is derived
      // from the same speed, so it is still the measurement talking.
      const stretch = THREE.MathUtils.clamp(speed * 0.12, 1, 4);
      scratch.scale.set(1, 1, stretch);
      /*
       * Align the bead's long axis to the curve tangent by rotating +Z onto it.
       *
       * NOT lookAt(). Object3D.lookAt derives orientation using this.up, so
       * writing the tangent into `up` and then looking along that same tangent
       * makes the two vectors parallel and the result degenerate — beads flip
       * or collapse at exactly the points where the curve bends most, which is
       * where the eye is. setFromUnitVectors has no up-vector to disagree with
       * and no singularity except a perfect reversal.
       */
      curve.getTangentAt(t, scratchTangent).normalize();
      scratch.quaternion.setFromUnitVectors(BEAD_AXIS, scratchTangent);
      scratch.updateMatrix();
      mesh.setMatrixAt(drawn, scratch.matrix);
      mesh.setColorAt(drawn, scratchColour.set(OUTCOME_COLOUR[packet.outcome]));
      drawn += 1;
    }

    mesh.count = drawn;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={restOpacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <instancedMesh
        ref={beads}
        args={[undefined, undefined, maxBeads]}
        frustumCulled={false}
        count={0}
      >
        <sphereGeometry args={[radius * 2.6, 8, 8]} />
        <meshBasicMaterial
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
