/**
 * K2 — CHIP. A squircle tile standing on a plate, carrying one real thing.
 *
 * The core-services tiles of reference 03, the service clusters of 02, the
 * stage markers of 04, the experiment tiles of 05, the service row of 06. The
 * references show between six and thirty in a single frame, which decides the
 * implementation: one InstancedMesh for the whole set, not one mesh each.
 *
 * THE LABEL IS NOT HERE, AND THAT IS DELIBERATE
 * Every chip in the references carries text. None of that text is drawn in 3D.
 * The directive is explicit — real HTML so spelling is exact, content is
 * accessible, and the source is the repository — so a chip exposes an ANCHOR
 * and `LabelLayer` projects HTML onto it. This component draws the tile and
 * nothing else, which is also why it can be instanced at all: text cannot be.
 *
 * WHY A SQUIRCLE AND NOT A ROUNDED BOX
 * The reference crops show a superellipse profile, not a filleted cube — the
 * corners are continuous rather than circular-arc. It is a one-line difference
 * in a shape function and it is most of why these tiles read as designed
 * objects rather than as default primitives. Built once as an ExtrudeGeometry
 * and shared by every instance.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { DARK, type Glow } from './glow.ts';

export type ChipSpec = {
  /** Stable identity. Also the key `LabelLayer` anchors its HTML to. */
  id: string;
  /** Position on the parent plate, in the plate's local space. */
  position: [number, number, number];
  size?: [number, number];
  /** Register hue. Ignored when unlit. */
  tint?: string;
  /** How lit, and whether earned. Unmeasured chips are dark structure. */
  glow?: Glow;
  rotation?: number;
};

export type ChipFieldProps = {
  chips: ChipSpec[];
  height?: number;
  /** Emphasised chip, from hover or selection. Interface state, not system state. */
  activeId?: string | null;
};

/**
 * Superellipse outline. `n = 4` matches the reference crops closely; higher is
 * boxier, lower rounder.
 */
function squircle(width: number, height: number, n = 4, segments = 48): THREE.Shape {
  const shape = new THREE.Shape();
  const a = width / 2;
  const b = height / 2;
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = Math.sign(c) * a * Math.pow(Math.abs(c), 2 / n);
    const y = Math.sign(s) * b * Math.pow(Math.abs(s), 2 / n);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

const scratch = new THREE.Object3D();
const scratchColour = new THREE.Color();
/* A second scratch, so the tint lerp allocates nothing inside the loop. */
const scratchTint = new THREE.Color();
const base = new THREE.Color(PALETTE.dark);
const structure = new THREE.Color(PALETTE.structure);
const emphasis = new THREE.Color(PALETTE.structure);

export function ChipField({ chips, height = 0.18, activeId = null }: ChipFieldProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(squircle(1, 1), {
      depth: 1,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 12,
    });
    // Extrude builds on XY and grows in +Z; the chips stand on a horizontal
    // plate, so bake the rotation into the geometry rather than paying for it
    // per instance.
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const mesh = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;

    chips.forEach((chip, index) => {
      const [w, d] = chip.size ?? [1, 1];
      scratch.position.set(chip.position[0], chip.position[1], chip.position[2]);
      scratch.rotation.set(0, chip.rotation ?? 0, 0);
      scratch.scale.set(w, height, d);
      scratch.updateMatrix();
      instanced.setMatrixAt(index, scratch.matrix);

      const lit: Glow = chip.glow ?? DARK;
      /*
       * STRUCTURE FLOOR. An unmeasured chip used to be painted exactly the
       * plate's base colour, and with no key light in this world (§3.7) the
       * result was a black hole punched in the plate rather than an object
       * sitting on it — clearly visible on the pre-launch island, which
       * correctly has no traffic at all.
       *
       * The floor is a lift toward STRUCTURE, not toward the chip's register
       * tint, so it says "this exists" and never "this is slightly active".
       * Same reasoning as the plate rim and the lattice in World.tsx:
       * structure is visible at rest, activity is earned.
       */
      scratchTint.set(chip.tint ?? PALETTE.record);
      scratchColour.copy(base).lerp(structure, 0.16);
      scratchColour.lerp(scratchTint, lit.intensity * 0.85);
      if (chip.id === activeId) scratchColour.lerp(emphasis, 0.3);
      instanced.setColorAt(index, scratchColour);
    });

    instanced.count = chips.length;
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [chips, height, activeId]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, Math.max(chips.length, 1)]}
      frustumCulled={false}
    >
      {/*
        UNLIT, like every other surface in this world.
        This was meshStandardMaterial, which needs a light to be visible — and
        §3.7 says there is no key light here, only emission. With a 0.1 ambient
        the chips multiplied down to black and read as holes punched in the
        plate. Their instance colour IS their appearance, exactly as it is for
        the plate shader and the city field.
      */}
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** World-space anchor for a chip, for `LabelLayer` to project HTML onto. */
export function chipAnchor(chip: ChipSpec, height = 0.18): [number, number, number] {
  return [chip.position[0], chip.position[1] + height, chip.position[2]];
}
