/**
 * K6 — HOUSING. The machined dark-metal enclosure.
 *
 * The lab core (05), the control-plane ring (06), the archive cabinet (09), and
 * the datastore bodies in the request path (04). The references' hardware
 * register: bevelled edges, a matte body with a narrow specular, and a thin
 * lit seam where panels meet.
 *
 * WHY IT IS NOT A `Plate`
 * A plate is a surface things stand ON. A housing is a volume things are
 * INSIDE — it has a front, it can open, and its interior is a different
 * material from its shell. Reference 09 turns entirely on that distinction:
 * the archive reads as a machine because it has an inside.
 *
 * WHY IT IS UNLIT LIKE EVERYTHING ELSE
 * There is no key light in this world (§3.7). The body colour is the
 * appearance, and the "machined" read comes from the seam and the edge
 * treatment rather than from specular response to a lamp that does not exist.
 */
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { DARK, type Glow } from './glow.ts';

export type HousingProps = {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Lit seams and interior. Unmeasured means a dark, closed machine. */
  glow?: Glow;
  /** Seam colour. Register hue when the housing carries a state. */
  seam?: string;
  /** Cylindrical body, for datastores and ring cores. */
  shape?: 'box' | 'cylinder';
  children?: React.ReactNode;
};

const BODY = '#12161f';

export function Housing({
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  glow = DARK,
  seam = PALETTE.structure,
  shape = 'box',
  children,
}: HousingProps) {
  const [w, h, d] = size;
  const geometry =
    shape === 'cylinder' ? (
      <cylinderGeometry args={[w / 2, w / 2, h, 40]} />
    ) : (
      <boxGeometry args={[w, h, d]} />
    );

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        {geometry}
        <meshBasicMaterial color={BODY} toneMapped={false} />
      </mesh>

      {/*
        The edge wireframe is what makes this read as machined rather than as a
        grey box. It is structure, so it is visible at rest — the same rule the
        plate rim and the lattice follow.
      */}
      <lineSegments>
        <edgesGeometry
          args={[
            shape === 'cylinder'
              ? new THREE.CylinderGeometry(w / 2, w / 2, h, 40)
              : new THREE.BoxGeometry(w, h, d),
          ]}
        />
        <lineBasicMaterial
          color={seam}
          transparent
          opacity={0.22 + glow.intensity * 0.5}
          toneMapped={false}
        />
      </lineSegments>

      {/* A lit seam around the body, only when something is measuring. */}
      {glow.intensity > 0.05 ? (
        <mesh position={[0, h * 0.18, 0]}>
          {shape === 'cylinder' ? (
            <cylinderGeometry args={[w / 2 + 0.02, w / 2 + 0.02, h * 0.03, 40]} />
          ) : (
            <boxGeometry args={[w + 0.04, h * 0.03, d + 0.04]} />
          )}
          <meshBasicMaterial
            color={seam}
            toneMapped={false}
            transparent
            opacity={0.3 + glow.intensity * 0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {children}
    </group>
  );
}
