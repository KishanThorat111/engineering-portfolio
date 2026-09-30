/**
 * K4 — CORE. The emissive centre a scene is organised around.
 *
 * The plasma at the apex of the stack (01), the engineering core between the
 * islands (02), the service mesh inside the core-services layer (03), the lab
 * core (05), the cube over the city (08), the spire on the estate (10). Six of
 * the ten references have exactly one, and in every case it is both the
 * brightest object and the compositional centre.
 *
 * THIS OBJECT IS THE GLOW RULE'S HARDEST CASE
 * A core is the thing most tempting to light for free, because a dark centre
 * looks like a bug. It is not a bug — it is an idle system, and §3.7 says the
 * world is genuinely darker when idle. So the core takes a `Glow` like
 * everything else and renders as cold dark glass when nothing is measured. The
 * shafts do not draw at all below a threshold, because a volumetric shaft at
 * 3% opacity is the visual equivalent of a rounding error being presented as
 * activity.
 *
 * WHY BILLBOARD SHAFTS AND NOT RAYMARCHING
 * The vertical light shafts above the 01 plasma and the 10 spire are the
 * signature of both frames. Raymarched volumetrics are a per-pixel loop and
 * the single most expensive thing that could be put in this scene. Three
 * camera-facing quads with a soft gradient and additive blending are visually
 * near-identical at these distances — the crops show a soft cone, not
 * structured scattering — and cost three transparent quads. Tier 1 drops to
 * one quad.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { DARK, type Glow } from './glow.ts';

export type CoreProps = {
  position?: [number, number, number];
  /** Radius of the emissive centre. */
  radius?: number;
  /** How lit, and whether earned. */
  glow?: Glow;
  colour?: string;
  /** Height of the light shafts. Zero disables them. */
  shaftHeight?: number;
  /** From the active quality tier. */
  shafts?: number;
  /** Whether the visitor asked for less motion. Collapses the breath. */
  reducedMotion?: boolean;
};

const shaftFragment = /* glsl */ `
  precision highp float;
  uniform vec3  uColour;
  uniform float uGlow;
  varying vec2 vUv;

  void main() {
    // Bright at the base, gone at the top, soft across. A cone of light
    // leaving the core, not a bar.
    float vertical = pow(1.0 - vUv.y, 2.2);
    float horizontal = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.8);
    float a = vertical * horizontal * uGlow;
    gl_FragColor = vec4(uColour * a, a);
  }
`;

const shaftVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function Core({
  position = [0, 0, 0],
  radius = 0.6,
  glow = DARK,
  colour = PALETTE.record,
  shaftHeight = 6,
  shafts = 3,
  reducedMotion = false,
}: CoreProps) {
  const group = useRef<THREE.Group>(null);
  const centre = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  const shaftUniforms = useMemo(
    () => ({ uColour: { value: new THREE.Color(colour) }, uGlow: { value: 0 } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /*
   * Shafts below this are not drawn. Chosen so that the faintest shaft that
   * ever renders is one a person can actually see; anything below it was
   * decoration pretending to be a signal.
   */
  const visible = glow.intensity > 0.08 && shaftHeight > 0;
  shaftUniforms.uColour.value.set(colour);
  shaftUniforms.uGlow.value = glow.intensity * 0.5;

  useFrame(({ clock }) => {
    if (!centre.current || !light.current) return;

    /*
     * The breath is amplitude-scaled by the measurement, not added to it. An
     * idle core is perfectly still — "idle is alive" (§3.6) describes a world
     * carrying other people's real traffic, not an animation that runs when
     * nothing is happening.
     */
    const breath = reducedMotion
      ? 1
      : 1 + Math.sin(clock.getElapsedTime() * 1.6) * 0.04 * glow.intensity;

    centre.current.scale.setScalar(breath);
    light.current.intensity = glow.intensity * 12;
  });

  return (
    <group ref={group} position={position}>
      {/*
        The emitter. Small and very bright rather than large and flat — the
        first pass drew a matte ball the size of the reference's whole plasma
        bloom, which reads as a sphere sitting on a stack instead of as a light
        source. The visible size now comes from the halo and from bloom, which
        is how it works in the reference too.
      */}
      <mesh ref={centre}>
        <icosahedronGeometry args={[radius * 0.55, 3]} />
        <meshBasicMaterial
          color={colour}
          toneMapped={false}
          transparent
          // Unlit is not invisible: the core is still a physical object in the
          // world when it is doing nothing.
          opacity={0.2 + glow.intensity * 0.8}
        />
      </mesh>

      {/* Additive halo. Only when something is measuring. */}
      {glow.intensity > 0.05 ? (
        <mesh scale={1 + glow.intensity * 0.9}>
          <icosahedronGeometry args={[radius * 1.5, 2]} />
          <meshBasicMaterial
            color={colour}
            toneMapped={false}
            transparent
            opacity={0.1 + glow.intensity * 0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      <pointLight ref={light} color={colour} distance={radius * 40} decay={2} intensity={0} />

      {visible &&
        Array.from({ length: shafts }, (_, i) => (
          <mesh
            key={i}
            position={[0, shaftHeight / 2, 0]}
            rotation={[0, (i / shafts) * Math.PI, 0]}
          >
            <planeGeometry args={[radius * 3.2, shaftHeight]} />
            <shaderMaterial
              vertexShader={shaftVertex}
              fragmentShader={shaftFragment}
              uniforms={shaftUniforms}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
    </group>
  );
}
