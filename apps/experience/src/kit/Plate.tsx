/**
 * K1 — PLATE. The load-bearing element of the whole reference set.
 *
 * Stepped platform (01), system island (02), exploded architecture layer (03),
 * lab deck (05), control ring base (06), archive plinth (09), estate ground
 * (10). Seven of the ten references are built out of this one object at
 * different scales, so it is worth getting exactly right and worth never
 * duplicating.
 *
 * TWO MATERIALS, ONE GEOMETRY
 *   PCB    dark, matte, scattered emissive windows. The city/circuit register
 *          of references 01, 02, 10.
 *   FROST  translucent, bright leading rim. The architectural-glass register of
 *          reference 03, which is visibly a different material language from
 *          01 and must stay that way — that contrast is a large part of why
 *          the dissection frame reads as a diagram and the enter frame reads
 *          as a place.
 *
 * WHY NOT MeshTransmissionMaterial FOR FROST
 * It renders the scene again per object. Reference 03 has seven slabs in frame
 * simultaneously; that is seven extra scene renders per frame, which will not
 * hold 60fps on the mid-range device §11 budgets for. A fresnel rim plus a
 * shallow interior gradient gets the read — the crops confirm the reference's
 * slabs have almost no true refraction, just edge light and internal scatter —
 * at ordinary transparent-material cost. Recorded because it is the kind of
 * decision that looks like a shortcut and is not: it is what the reference
 * actually shows.
 *
 * WHY THE RIM IS GEOMETRY AND NOT A LIGHT
 * Every plate in 03 and 09 has a bright leading top edge. A real light for
 * each would be dozens of lights. It is a fresnel term masked to the upper
 * face, which costs nothing, survives every quality tier, and — unlike a light
 * — cannot accidentally illuminate something it was not meant to.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { DARK, type Glow } from './glow.ts';

export type PlateMaterial = 'pcb' | 'frost';

/**
 * Footprint shape.
 *
 * `disc` was added for reference 02's engineering core, which is a stack of
 * concentric machined DISCS — built as square plates first, and the frame read
 * as a pile of boxes where the reference has a turbine. Reference 06's control
 * ring is the same object at a different scale, so this belongs in the kit
 * rather than in either scene.
 */
export type PlateShape = 'rect' | 'disc';

export type PlateProps = {
  /** Footprint in world units. For a disc, both entries are the diameter. */
  size: [number, number];
  shape?: PlateShape;
  thickness?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  material?: PlateMaterial;
  /**
   * How lit this plate is, and whether it earned the light.
   *
   * Defaults to {@link DARK}. A plate with no measurement behind it renders as
   * unlit structure, which is the correct appearance for an idle subsystem and
   * is the glow rule (§0.2) applied to the most-used object in the kit.
   */
  glow?: Glow;
  /** Rim hue. Structure by default — a plate edge carries no state. */
  rim?: string;
  /**
   * Interior hue, mixed in by `glow.intensity`. Ember for a data plane, record
   * for a services plane. Ignored entirely when unlit.
   */
  tint?: string;
  /** Emissive window density for PCB plates. Zero disables the mask. */
  windows?: number;
  /**
   * How far the slab's own body is lifted off the ground value, 0..1.
   *
   * Reference 03's glass runs near-white at the top of the stack and darkens
   * downward, and that gradient is what makes seven slabs read as one object
   * seen in section rather than as seven separate sheets. It is a MATERIAL
   * property, not a measurement — a slab's depth in a stack says nothing about
   * whether it is busy — so it is deliberately kept off the glow path.
   */
  lift?: number;
  /** Body opacity multiplier. Frost slabs vary; PCB plates stay solid. */
  opacity?: number;
  children?: React.ReactNode;
};

const plateVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vLocal;

  void main() {
    vUv = uv;
    vLocal = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/*
 * The window mask is a hashed grid, not a texture.
 *
 * Reference 01's plates carry hundreds of small lit windows and there are seven
 * plates plus a city behind them. As a texture that is an atlas to author, ship
 * and cache-bust; as three lines of hash it is free, resolution-independent,
 * and — the part that matters — it can be driven by load, so the number of lit
 * windows is itself a measurement rather than a decoration.
 */
const plateFragment = /* glsl */ `
  precision highp float;

  uniform vec3  uRim;
  uniform vec3  uTint;
  uniform vec3  uBase;
  uniform float uGlow;
  uniform float uWindows;
  uniform float uFrost;
  uniform float uOpacity;
  uniform float uLift;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vLocal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    float facing = clamp(dot(n, normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 3.0);

    /*
     * Which face are we on? The reference treats the three differently and
     * that distinction is most of the material read:
     *   top     circuit-board detail — small lit cells, seen from above
     *   side    almost black, with one bright line along the upper edge
     *   bottom  unlit
     */
    float top = smoothstep(0.55, 0.9, n.y);
    float side = 1.0 - smoothstep(0.0, 0.35, abs(n.y));

    /*
     * The plate body stays DARK. This was a real defect first time through:
     * the tint was mixed in at 0.55 and every plate rendered as a solid slab
     * of colour, which is the opposite of the reference — there the plates are
     * near-black and ALL the colour arrives as emitted detail. Tint is now a
     * faint interior warmth and nothing more.
     */
    // Material lift first, then earned tint on top of it.
    vec3 colour = mix(uBase, uRim, uLift);
    colour = mix(colour, uTint, uGlow * 0.14);

    if (uWindows > 0.0 && top > 0.0) {
      /*
       * The grid is built from LOCAL POSITION, not from uv.
       *
       * Box uv is 0..1 per face, so on a 21 x 0.5 slab the side faces stretch
       * a square cell into a long band — which is exactly the streaking the
       * first render showed. Local position gives cells a constant world size
       * on every plate regardless of its footprint, so a small plate and a
       * large one look like the same material rather than the same texture
       * scaled.
       */
      vec2 cell = floor(vLocal.xz * uWindows);
      float pick = hash(cell);

      // Which cells are lit is stable across frames; HOW MANY are lit tracks
      // load. A quiet system has a handful, a busy one has most of them.
      float lit = step(1.0 - clamp(uGlow, 0.0, 1.0) * 0.55 - 0.06, pick);

      // Cell interior, so lit cells read as rectangles with dark gutters
      // between them rather than as a solid field.
      vec2 within = fract(vLocal.xz * uWindows);
      float inset = step(0.16, within.x) * step(within.x, 0.84)
                  * step(0.24, within.y) * step(within.y, 0.76);

      /*
       * NO CONSTANT TERM. This read (0.32 + 1.15 * uGlow) and that was a
       * real leak in the glow rule: at uGlow = 0 — the honest value for a
       * layer nothing has measured — six percent of cells still emitted at
       * 0.32, so an idle plate quietly claimed a trickle of activity it did
       * not have. Caught by rendering the scene with every measurement removed
       * and looking at what was still lit.
       *
       * Scaling purely by uGlow means unmeasured is genuinely black, and a
       * measurement of zero is genuinely black too, which is what "idle means
       * dark" has to mean at the pixel level. Anything with real activity
       * clears glowFromActivity's 0.15 floor and is comfortably visible.
       *
       * The multiplier is held back from the first tuning (1.9x), which
       * rendered the record violet as candy pink and made the board detail
       * louder than the object carrying it.
       */
      colour += uTint * lit * inset * top * uGlow * 1.45;
    }

    /*
     * The bright line along the top edge of every slab — reference 03 and 09
     * both live on this detail. It is a shader term, not a light: a real light
     * per plate would be dozens of lights, and this cannot leak onto anything
     * it was not meant to.
     */
    float edge = side * pow(1.0 - facing, 1.5);
    colour += uRim * edge * (0.18 + 0.5 * uGlow);
    colour += uRim * fresnel * top * (0.10 + 0.28 * uGlow);

    /*
     * FROST. The glass register of reference 03.
     *
     * A translucent body alone rendered as tinted film. What makes the
     * reference's slabs read as architectural glass is the leading edge: a hard
     * bright line where the slab turns away from the viewer, plus a lifted
     * interior that is brighter than the ground behind it. Both are added here
     * and only for frost, so the PCB plates at stations 01 and 02 stay matte
     * and the two material languages stay visibly different.
     */
    float alpha = mix(1.0, mix(0.34, 0.66, fresnel), uFrost) * uOpacity;
    /*
     * A STRUCTURAL FLOOR PLUS AN EARNED COMPONENT, matching how the PCB rim
     * above already works. These two terms were unconditional at 0.85 and 0.55,
     * which lit the glass edges just as brightly on a layer nothing had touched
     * — measured, it left only a 2.3x separation between a working stack and a
     * dead one, most of it coming from slab edges rather than from anything
     * that had happened. The edge still exists at rest, because the
     * architecture exists at rest; it brightens only when the layer does.
     */
    colour += uRim * uFrost * pow(1.0 - facing, 2.0) * (0.3 + 0.62 * uGlow);
    colour += uRim * uFrost * side * pow(1.0 - facing, 1.2) * (0.16 + 0.46 * uGlow);
    colour = mix(colour, colour + uRim * 0.14, uFrost);

    gl_FragColor = vec4(colour, alpha);
  }
`;

export function Plate({
  size,
  shape = 'rect',
  thickness = 0.35,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  material = 'pcb',
  glow = DARK,
  rim = PALETTE.structure,
  tint = PALETTE.ember,
  windows = 0,
  lift = 0,
  opacity = 1,
  children,
}: PlateProps) {
  const uniforms = useMemo(
    () => ({
      uRim: { value: new THREE.Color(rim) },
      uTint: { value: new THREE.Color(tint) },
      uBase: { value: new THREE.Color(PALETTE.dark) },
      uGlow: { value: 0 },
      uWindows: { value: 0 },
      uFrost: { value: 0 },
      uOpacity: { value: 1 },
      uLift: { value: 0 },
    }),
    // Colours are re-pushed below; this memo exists to keep one uniform object
    // per plate for the lifetime of the mesh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  uniforms.uRim.value.set(rim);
  uniforms.uTint.value.set(tint);
  uniforms.uGlow.value = glow.intensity;
  uniforms.uWindows.value = material === 'pcb' ? windows : 0;
  uniforms.uFrost.value = material === 'frost' ? 1 : 0;
  uniforms.uOpacity.value = opacity;
  uniforms.uLift.value = lift;

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={false} receiveShadow={false}>
        {shape === 'disc' ? (
          /*
           * 64 segments. The core is the compositional centre of reference 02
           * and sits close to camera, so a coarser cylinder shows its facets on
           * the silhouette — which reads as a low-poly artefact rather than as
           * a machined part.
           */
          <cylinderGeometry args={[size[0] / 2, size[0] / 2, thickness, 64]} />
        ) : (
          <boxGeometry args={[size[0], thickness, size[1]]} />
        )}
        <shaderMaterial
          vertexShader={plateVertex}
          fragmentShader={plateFragment}
          uniforms={uniforms}
          transparent={material === 'frost'}
          depthWrite={material !== 'frost'}
        />
      </mesh>
      {children}
    </group>
  );
}
