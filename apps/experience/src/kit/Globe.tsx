/**
 * K8 — GLOBE. Earth, for reference 06's control room.
 *
 * WHY THERE ARE NO IMAGE TEXTURES
 * The decomposition budgeted albedo / night-lights / normal maps for this
 * primitive, and then the honesty rule made them unnecessary. Reference 06's
 * earth is covered in glowing city lights across continents this project has no
 * presence in — a map of a global footprint that does not exist. Rendering a
 * photographic earth and lighting only the two regions that are real would look
 * broken; rendering it fully lit would be a claim.
 *
 * So the globe is a WIREFRAME GRATICULE: a latitude/longitude sphere in
 * structure tone, with markers only where something real is. It keeps the
 * reference's composition — a planet behind the control ring, arcs leaving it —
 * and drops the invented geography. It also ships nothing: no texture download,
 * no atlas, no cache-bust.
 *
 * MARKERS ARE MEASUREMENTS
 * A region marker only lights when a real reading exists for it. The visitor's
 * own measured edge PoP is the one that always can.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { DARK, type Glow } from './glow.ts';

export type GlobeMarker = {
  id: string;
  label: string;
  /** Degrees. */
  lat: number;
  lon: number;
  /** Real measured round trip, or null when unmeasured. */
  rttMs: number | null;
  tone: string;
};

export type GlobeProps = {
  radius?: number;
  position?: [number, number, number];
  markers?: GlobeMarker[];
  glow?: Glow;
  reducedMotion?: boolean;
};

/** Lat/lon to a point on the sphere. */
export function geoToVector(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function Globe({
  radius = 16,
  position = [0, 0, 0],
  markers = [],
  glow = DARK,
  reducedMotion = false,
}: GlobeProps) {
  const group = useRef<THREE.Group>(null);

  const graticule = useMemo(() => new THREE.SphereGeometry(radius, 36, 24), [radius]);
  const shell = useMemo(() => new THREE.SphereGeometry(radius * 0.995, 48, 32), [radius]);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    /*
     * Very slow. This rotation is decoration — the planet is not turning
     * because anything measured it — so it is kept below the threshold where a
     * viewer reads it as animation, and it stops entirely under reduced motion.
     */
    group.current.rotation.y = clock.getElapsedTime() * 0.012;
  });

  return (
    <group ref={group} position={position}>
      {/* An opaque body, so the graticule's far side is occluded and the
          sphere reads as solid rather than as a wire ball. */}
      <mesh geometry={shell}>
        <meshBasicMaterial color={PALETTE.dark} toneMapped={false} />
      </mesh>

      <lineSegments>
        <wireframeGeometry args={[graticule]} />
        <lineBasicMaterial
          color={PALETTE.structure}
          transparent
          opacity={0.13 + glow.intensity * 0.1}
          toneMapped={false}
        />
      </lineSegments>

      {/* Atmosphere rim: a slightly larger back-facing shell. */}
      <mesh scale={1.035}>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial
          color={PALETTE.structure}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {markers.map((marker) => {
        const at = geoToVector(marker.lat, marker.lon, radius * 1.01);
        // Unmeasured markers still show WHERE, dimly — the location is a fact.
        // Only the brightness claims a reading.
        const measured = marker.rttMs !== null;
        return (
          <mesh key={marker.id} position={at}>
            <sphereGeometry args={[0.28, 10, 10]} />
            <meshBasicMaterial
              color={marker.tone}
              toneMapped={false}
              transparent
              opacity={measured ? 0.95 : 0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}
