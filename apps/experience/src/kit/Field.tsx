/**
 * K10 — FIELD. A GPU point field driven from a vertex shader.
 *
 * Reference 05's GPU field and shader surface; reference 08's lattice haze.
 * Hundreds of thousands of points would be the obvious reading of the
 * reference, and it is the wrong one for a 60fps budget on a mid-range device
 * — this runs at a few thousand and gets the same read, because what the eye
 * takes from those frames is the SHAPE of the field, not its cardinality.
 *
 * ALL MOTION HERE IS IN THE VERTEX SHADER
 * Nothing is animated on the CPU. The attribute buffers are written once; the
 * shader displaces from a time uniform and a per-point seed. That is what keeps
 * a field of this size free, and it is the only reason a field can share a
 * frame with the rest of the kit.
 *
 * WHY THIS ONE IS ALLOWED TO MOVE WITHOUT A MEASUREMENT
 * It is a rendering demonstration, not a readout — reference 05 is the LAB, and
 * the thing on display there is the renderer itself. The field says nothing
 * about any system's state, and it is labelled as what it is. Its amplitude is
 * still bound to a `Glow` so that a lab bench with no experiment running is
 * visibly idle rather than churning for decoration.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DARK, type Glow } from './glow.ts';

export type FieldProps = {
  count?: number;
  /** Extent in world units. */
  radius?: number;
  position?: [number, number, number];
  colourA: string;
  colourB: string;
  glow?: Glow;
  /** 'disc' scatters on a plane; 'surface' displaces a grid into a sheet. */
  mode?: 'disc' | 'surface';
  reducedMotion?: boolean;
  pointSize?: number;
};

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  uniform float uSize;
  uniform float uMode;
  attribute float aSeed;
  varying float vMix;

  void main() {
    vec3 p = position;
    float wave = sin(p.x * 0.35 + uTime * 0.7 + aSeed * 6.28)
               * cos(p.z * 0.3 - uTime * 0.5 + aSeed * 3.14);

    // A surface field lifts into a sheet; a disc field drifts in place.
    p.y += wave * mix(0.6, 2.4, uMode) * uGlow;

    vMix = clamp(wave * 0.5 + 0.5, 0.0, 1.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Perspective-correct point size, so distant points do not stay fat.
    gl_PointSize = uSize * (14.0 / -mv.z) * (0.5 + uGlow);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform float uGlow;
  varying float vMix;

  void main() {
    // Round points. Square points read as compression artefacts.
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float falloff = 1.0 - smoothstep(0.0, 0.25, d);
    vec3 colour = mix(uA, uB, vMix);
    gl_FragColor = vec4(colour * falloff, falloff * (0.25 + uGlow * 0.75));
  }
`;

export function Field({
  count = 4000,
  radius = 14,
  position = [0, 0, 0],
  colourA,
  colourB,
  glow = DARK,
  mode = 'disc',
  reducedMotion = false,
  pointSize = 2.2,
}: FieldProps) {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      if (mode === 'surface') {
        // A regular grid, so the displacement reads as one continuous sheet.
        const side = Math.ceil(Math.sqrt(count));
        const gx = (i % side) / side - 0.5;
        const gz = Math.floor(i / side) / side - 0.5;
        positions[i * 3] = gx * radius * 2;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = gz * radius * 2;
      } else {
        const angle = Math.random() * Math.PI * 2;
        // sqrt for even area density, same reason as the city field.
        const r = Math.sqrt(Math.random()) * radius;
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
        positions[i * 3 + 2] = Math.sin(angle) * r;
      }
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, [count, radius, mode]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uSize: { value: pointSize },
      uMode: { value: mode === 'surface' ? 1 : 0 },
      uA: { value: new THREE.Color(colourA) },
      uB: { value: new THREE.Color(colourB) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  uniforms.uA.value.set(colourA);
  uniforms.uB.value.set(colourB);
  uniforms.uGlow.value = glow.intensity;
  uniforms.uSize.value = pointSize;
  uniforms.uMode.value = mode === 'surface' ? 1 : 0;

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <points ref={points} geometry={geometry} position={position} frustumCulled={false}>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
