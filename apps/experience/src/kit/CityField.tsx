/**
 * K5 — CITY FIELD. The dark lit terrain the world sits on.
 *
 * References 01, 02, 08 and 10 all place their subject on a vast field of dark
 * blocks with scattered lit windows, receding into fog. It is never the
 * subject; it is what gives the subject somewhere to be, and it is most of why
 * those four frames read as *vast* rather than as *a model on a table*.
 *
 * WHY THIS IS ATMOSPHERE AND NOT DATA, STATED PLAINLY
 * The glow rule says nothing emits light unless it carries a real measurement.
 * The city does emit light, and it is NOT carrying telemetry — so it would be a
 * violation if it were claiming to be anything. It is not: it is terrain, the
 * equivalent of the fog and the ground plane, and it says nothing about any
 * system. The rule constrains claims, not the existence of a horizon.
 *
 * The line is drawn precisely: the city NEVER responds to events, never
 * brightens on load, and never pulses. Anything that moves in this world is a
 * measurement, and the city does not move. If a future change makes the city
 * react to telemetry, it has become a readout and must be lit through `glow()`
 * like everything else.
 *
 * WHY ONE InstancedMesh AND A HASHED LAYOUT
 * Reference 01 shows several hundred blocks. As individual meshes that is
 * several hundred draw calls for scenery. One instanced mesh with a
 * deterministic hash layout is one draw call, needs no authored data, and is
 * stable across reloads — the city is the same city every visit, which matters
 * because a horizon that reshuffles on refresh reads as noise.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';

export type CityFieldProps = {
  /** Blocks to place. Comes from the active quality tier. */
  count?: number;
  /** Radius of the field, in world units. */
  radius?: number;
  /** Blocks nearer than this are omitted, leaving room for the subject. */
  innerRadius?: number;
  maxHeight?: number;
  position?: [number, number, number];
  /** Deterministic layout seed. Same seed, same city, every visit. */
  seed?: number;
};

/**
 * A small deterministic PRNG. Not for anything that needs to be unpredictable —
 * it is here so the horizon is reproducible rather than random per reload.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const scratch = new THREE.Object3D();
const scratchColour = new THREE.Color();

export function CityField({
  count = 420,
  radius = 190,
  /*
   * Generous by default. A block placed between the camera and the subject
   * projects enormous and reads as debris in the sky rather than as a distant
   * horizon — measured the hard way when the ring was tight enough to include
   * them. The city belongs beyond the subject, always.
   */
  innerRadius = 26,
  maxHeight = 7,
  position = [0, 0, 0],
  seed = 20260822,
}: CityFieldProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const blocks = useMemo(() => {
    const random = mulberry32(seed);
    const out: Array<{
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      lit: number;
      rot: number;
    }> = [];

    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      /*
       * sqrt distributes blocks evenly by AREA rather than by radius. Without
       * it the field is dense at the centre and sparse at the rim, which reads
       * as a target rather than as a city.
       */
      const r = innerRadius + Math.sqrt(random()) * (radius - innerRadius);
      const falloff = 1 - (r - innerRadius) / (radius - innerRadius);

      out.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        w: 1.1 + random() * 2.2,
        d: 1.1 + random() * 2.2,
        // Taller near the middle, so the horizon settles rather than fencing.
        h: 0.6 + random() * maxHeight * (0.35 + falloff * 0.65),
        // Most blocks are dark. The reference's city is mostly unlit, and that
        // is what makes the lit ones read as windows instead of as noise.
        lit: random() < 0.26 ? 0.35 + random() * 0.65 : 0,
        rot: Math.round(random() * 4) * (Math.PI / 8),
      });
    }
    return out;
  }, [count, radius, innerRadius, maxHeight, seed]);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;

    const base = new THREE.Color(PALETTE.dark);
    const window = new THREE.Color(PALETTE.structure);

    blocks.forEach((block, i) => {
      scratch.position.set(block.x, block.h / 2, block.z);
      scratch.rotation.set(0, block.rot, 0);
      scratch.scale.set(block.w, block.h, block.d);
      scratch.updateMatrix();
      instanced.setMatrixAt(i, scratch.matrix);

      /*
       * Near-black, always. In the reference the city is barely above the
       * ground value and only a scatter of windows lifts off it at all; the
       * first pass lerped to half the structure tone and the result read as
       * pale slabs floating in the sky rather than as a horizon. The lit
       * fraction is also squared, so the few bright ones stay bright while the
       * bulk stays dark.
       */
      scratchColour.copy(base).lerp(window, block.lit * block.lit * 0.34);
      instanced.setColorAt(i, scratchColour);
    });

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [blocks]);

  return (
    <group position={position}>
      {/*
        The floor. The blocks had nothing to stand on in the first pass and
        read as detached rectangles hanging in the frame. It is unlit and
        near-black — its whole job is to occlude, to catch the fog, and to give
        the horizon somewhere to end.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[radius * 1.15, 64]} />
        <meshBasicMaterial color={PALETTE.dark} toneMapped={false} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]}>
        <boxGeometry args={[1, 1, 1]} />
        {/*
          Unlit material on purpose. These blocks are not lit BY anything —
          there is no key light in this world (§3.7) — so a standard material
          would render them black and cost shading for the privilege. Their
          colour IS their appearance.
        */}
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
