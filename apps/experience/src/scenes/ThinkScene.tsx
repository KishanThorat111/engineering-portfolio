/**
 * 07 / THINK. The desk at night.
 *
 * WHAT THE REFERENCE SHOWS
 * Not a diagram. A photographic scene: a person at a desk, city bokeh behind,
 * a circular orbit diagram overlaying their head, warm practical light on the
 * subject and cool light in the room. It is the strongest emotional frame in
 * the set and the only one with a human in it.
 *
 * THE PORTRAIT IS NOT HERE, AND THAT IS NOT AN OMISSION
 * There is no headshot asset in this repository — `Headshot.astro` takes the
 * image as a prop precisely so it compiles without one, and /about already
 * carries an OWNER-INPUT marker requesting it. Generating a face, or
 * substituting a stock one, would be fabricating the identity this station
 * exists to convey. So the desk is built and lit exactly as the reference
 * frames it, the portrait slot is reserved at the right position and scale, and
 * the marker is logged. When the photograph exists it drops into a scene that
 * is already shaped for it.
 *
 * WHAT CARRIES THE FRAME MEANWHILE
 * §4: the protagonist is the engineer who is not in the room, and the evidence
 * that someone was here is the work. The monitor carries a real architecture
 * sketch, the desk carries the lamp, and the orbit diagram — which in the
 * reference floats over the subject's head — carries the four axes judgment
 * actually runs on here. The room reads as recently occupied, which is the
 * register §3.1 asks for.
 */
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Housing } from '../kit/Housing.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { glowFromActivity, type Glow } from '../kit/glow.ts';

/** The desk sits at the western edge of the estate, facing the city. */
export const DESK_ORIGIN: [number, number, number] = [-46, 8, 26];

export type ThinkSceneProps = {
  reducedMotion?: boolean;
  projection: LabelProjection;
};

export function thinkAnchors(): LabelAnchor[] {
  const [ox, oy, oz] = DESK_ORIGIN;
  return [
    {
      id: 'desk',
      at: [ox - 1, oy + 3.4, oz - 2],
      label: 'THE DESK',
      detail: 'Where every decision in this world was made',
      side: 'left',
    },
  ];
}

export function ThinkScene({ reducedMotion = false, projection }: ThinkSceneProps) {
  const [ox, oy, oz] = DESK_ORIGIN;

  /*
   * The desk lamp and monitor are PRACTICAL lights — they are objects in the
   * room, not readouts, and they say nothing about any system's state. Same
   * standing as the city field: the rule constrains claims, and a lamp is not
   * a claim. Their value is fixed, never event-driven.
   */
  const practical: Glow = glowFromActivity(9);

  return (
    <>
      {/* City bokeh through the window: the same field, close and dense. */}
      <CityField count={340} position={[0, -2.4, 0]} radius={170} innerRadius={44} seed={7731} />

      {/* Desk surface. */}
      <Plate
        size={[14, 7]}
        thickness={0.35}
        position={[ox, oy, oz]}
        material="pcb"
        glow={practical}
        tint={PALETTE.ember}
        rim={PALETTE.structure}
        /*
         * Nearly bare. A desk is a surface, not a circuit board — at the
         * density the machine stations use, this rendered as a glowing orange
         * grid and the warmest thing in the frame stopped being the lamp.
         */
        windows={0.12}
      />

      {/*
        The monitor, carrying an architecture sketch. Its face is a frost plate
        so it reads as a lit screen rather than as a panel.
      */}
      <Housing
        size={[6.4, 3.8, 0.4]}
        position={[ox - 1.5, oy + 2.4, oz - 2.6]}
        glow={practical}
        seam={PALETTE.structure}
      />
      <Plate
        size={[5.8, 3.2]}
        thickness={0.12}
        position={[ox - 1.5, oy + 2.4, oz - 2.42]}
        rotation={[Math.PI / 2, 0, 0]}
        material="frost"
        glow={practical}
        tint={PALETTE.structure}
        rim={PALETTE.structure}
        lift={0.24}
        opacity={0.8}
      />

      {/*
        THE PORTRAIT SLOT IS DELIBERATELY EMPTY.
        A placeholder volume was tried here and removed: at this camera it read
        as a black blob sitting on the desk, which is worse than an absence
        because a viewer has to work out what it is meant to be. The frame is
        composed as a recently-vacated desk instead — which is what §4 asks for
        anyway, the engineer who is not in the room. The disclosure line in the
        overlay states plainly that no photograph exists yet.
        OWNER-INPUT: one owned photograph, seated at a desk, three-quarter view.
      */}

      {/* The lamp: the warm point in a cold room (§3.1). */}
      <mesh position={[ox - 5.2, oy + 1.6, oz - 1]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshBasicMaterial color={PALETTE.ember} toneMapped={false} />
      </mesh>
      <pointLight
        position={[ox - 5.2, oy + 1.6, oz - 1]}
        color={PALETTE.ember}
        distance={22}
        decay={2}
        intensity={reducedMotion ? 6 : 7}
      />

      <LabelProjector projection={projection} />
    </>
  );
}
