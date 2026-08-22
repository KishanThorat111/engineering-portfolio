/**
 * 08 / BUILD. The next system, undefined.
 *
 * WHAT THE REFERENCE SHOWS
 * The deepest apparent depth in the set: a vast lit lattice-city, a glowing
 * cube hovering over it inside a wireframe boundary, a warm ground trail
 * leading the eye from the lower left up to the cube, and a figure in the right
 * third looking out at it.
 *
 * WHY THE CUBE IS EMPTY AND STAYS EMPTY
 * The reference labels it NEXT SYSTEM · STATE: UNDEFINED, and that is the most
 * honest thing in the entire reference set — so it is preserved literally. The
 * cube carries no content, no count, no capability list. It is a boundary with
 * nothing inside it yet, and that is the station's whole argument: the work is
 * the next constraint, not a portfolio of finished things.
 *
 * This is also why it is NOT a contact page with a 3D flourish. The geometry
 * says "unbuilt"; the interface says what would have to be true to build it.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Core } from '../kit/Core.tsx';
import { Conduit, type ConduitPacket } from '../kit/Conduit.tsx';
import { CityField } from '../kit/CityField.tsx';
import { Field } from '../kit/Field.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { glowFromActivity, type Glow } from '../kit/glow.ts';

/** Out beyond the estate, over open ground. */
export const BUILD_ORIGIN: [number, number, number] = [-30, 10, -46];

export type BuildSceneProps = {
  reducedMotion?: boolean;
  projection: LabelProjection;
  packets?: ConduitPacket[];
};

export function buildAnchors(): LabelAnchor[] {
  const [ox, oy, oz] = BUILD_ORIGIN;
  return [
    {
      id: 'next',
      at: [ox + 4.5, oy + 4.6, oz],
      label: 'THE NEXT SYSTEM',
      detail: 'State: undefined. Awaiting the right problem.',
      side: 'right',
      tone: PALETTE.record,
    },
  ];
}

/** The cube: nested emissive shells inside a wireframe cage. */
function NextSystem({ glow, reducedMotion }: { glow: Glow; reducedMotion: boolean }) {
  const inner = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!inner.current || reducedMotion) return;
    /*
     * The one piece of ambient motion in the world, and it is defensible: this
     * object represents something that does not exist yet, so it is not
     * reporting a measurement and cannot be wrong about one. It breathes
     * slowly, which is what an empty boundary waiting to be filled should do.
     */
    const t = clock.getElapsedTime();
    inner.current.rotation.y = t * 0.18;
    inner.current.rotation.x = Math.sin(t * 0.3) * 0.12;
  });

  return (
    <group>
      <mesh ref={inner}>
        <boxGeometry args={[2.6, 2.6, 2.6]} />
        <meshBasicMaterial
          color={PALETTE.record}
          toneMapped={false}
          transparent
          opacity={0.16 + glow.intensity * 0.24}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(5.4, 5.4, 5.4)]} />
        <lineBasicMaterial
          color={PALETTE.record}
          transparent
          opacity={0.3 + glow.intensity * 0.4}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

export function BuildScene({ reducedMotion = false, projection, packets = [] }: BuildSceneProps) {
  const [ox, oy, oz] = BUILD_ORIGIN;

  /*
   * The cube's light is NOT bound to telemetry, because there is no system to
   * measure — that is the point of it. It is bound to a fixed value and is
   * therefore atmosphere, in the same class as the city and the desk lamp. An
   * undefined system reporting live load would be the exact contradiction this
   * station is built around.
   */
  const potential: Glow = glowFromActivity(7);

  return (
    <>
      {/* The city at its widest extent — this is the deepest frame in the set. */}
      <CityField count={520} position={[0, -2.4, 0]} radius={300} innerRadius={26} seed={4409} />
      <Field
        count={1600}
        radius={70}
        position={[ox, oy - 8, oz]}
        colourA={PALETTE.structure}
        colourB={PALETTE.record}
        glow={potential}
        mode="disc"
        reducedMotion={reducedMotion}
        pointSize={1.4}
      />

      <Plate
        size={[11, 11]}
        thickness={0.6}
        position={[ox, oy - 4.2, oz]}
        material="pcb"
        glow={potential}
        tint={PALETTE.record}
        windows={1.4}
      />

      <group position={[ox, oy, oz]}>
        <NextSystem glow={potential} reducedMotion={reducedMotion} />
      </group>

      <Core
        position={[ox, oy, oz]}
        radius={0.5}
        glow={potential}
        colour={PALETTE.record}
        shaftHeight={0}
        reducedMotion={reducedMotion}
      />

      {/*
        The warm ground trail. In the reference it leads the eye from the lower
        left up to the cube, and it is the only warm thing in a cold frame —
        the path from the systems that exist to the one that does not.
      */}
      <Conduit
        path={[
          [ox - 46, oy - 12, oz + 52],
          [ox - 20, oy - 8, oz + 22],
          [ox, oy - 4, oz],
        ]}
        packets={packets}
        colour={PALETTE.ember}
        restOpacity={0.4}
      />

      <LabelProjector projection={projection} />
    </>
  );
}
