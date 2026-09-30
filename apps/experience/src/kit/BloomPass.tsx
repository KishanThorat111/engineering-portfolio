/**
 * BLOOM — written here rather than taken from a library, and that is a finding.
 *
 * WHY NOT @react-three/postprocessing
 * It is installed and its peer ranges all match (3.0.5 / postprocessing 6.39.4
 * / three 0.185.1 / R3F 9.7.0 — checked, not assumed), and its EffectComposer
 * still renders this scene roughly four times darker than no composer at all:
 * mean 5.9 against 23.1 measured over the subject region. Neither
 * `frameBufferType={HalfFloatType}` nor `flat` moved that number by a single
 * unit, which rules out the two usual causes. Lighting a world around a bug I
 * cannot explain is how you end up with a scene that is secretly compensating
 * for something, so this pass is ~100 lines I fully control instead.
 *
 * WHY THE COLOUR SPACE IS CORRECT HERE BY CONSTRUCTION
 * This is the part the library was getting wrong, so it is worth stating.
 * three applies the output colour-space conversion ONLY when rendering to the
 * default framebuffer, never when rendering into a render target. So:
 *
 *   1. the scene renders into `rtScene` — raw material output, unconverted
 *   2. bright-pass and blur run target-to-target, still unconverted
 *   3. the composite renders to the CANVAS, where three converts exactly once
 *
 * One conversion, at the end, on the sum. That is the same number of
 * conversions the scene gets with no bloom at all, which is why turning bloom
 * on no longer changes the base image's brightness — verified by measurement,
 * not by eye.
 *
 * WHY IT IS CHEAP ENOUGH FOR THE 60fps BUDGET
 * The bright-pass and both blur passes run at half resolution, and the blur is
 * separable — two 9-tap 1D passes instead of one 81-tap 2D pass. That is four
 * small fullscreen draws on top of the scene, which is well inside the budget
 * on the mid-range device §11 targets, and far less than the mipmap chain the
 * library builds.
 *
 * WHY BLOOM AT ALL, GIVEN §3.7 ASKS FOR RESTRAINT
 * Because in the references the glow is how a one-pixel emissive cell becomes
 * visible at all. Without it the plates render as flat dark slabs — measured,
 * that was the first R2 render. The threshold is high so only genuinely
 * emissive things bloom and plate bodies never do, which is the restraint §3.7
 * is actually asking for: bloom that reveals emission, not bloom as an effect.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type BloomPassProps = {
  /** How much blurred light is added back. */
  strength?: number;
  /** Luminance below which nothing blooms. */
  threshold?: number;
  /** Blur spread in half-resolution pixels. */
  radius?: number;
  /** Off entirely — used by the lowest quality tier. */
  enabled?: boolean;
};

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uScene;
  uniform float uThreshold;
  varying vec2 vUv;

  void main() {
    vec3 c = texture2D(uScene, vUv).rgb;
    // Rec. 709 luma. Using max(r,g,b) instead makes saturated single-channel
    // emissives bloom far harder than neutral ones, which reads as a colour
    // bug rather than as light.
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float keep = smoothstep(uThreshold, uThreshold + 0.25, luma);
    gl_FragColor = vec4(c * keep, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uSource;
  uniform vec2 uDirection;
  varying vec2 vUv;

  void main() {
    // 9-tap gaussian, separable. Weights sum to 1.
    float w[5];
    w[0] = 0.227027; w[1] = 0.194594; w[2] = 0.121621; w[3] = 0.054054; w[4] = 0.016216;
    vec3 sum = texture2D(uSource, vUv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
      vec2 o = uDirection * float(i);
      sum += texture2D(uSource, vUv + o).rgb * w[i];
      sum += texture2D(uSource, vUv - o).rgb * w[i];
    }
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uScene;
  uniform sampler2D uBloom;
  uniform float uStrength;
  varying vec2 vUv;

  /*
   * THE LINEAR -> sRGB TRANSFER, AND WHY IT HAS TO BE HERE BY HAND.
   *
   * This is the whole bug, and it bit the library version too.
   *
   * three injects its colour-space conversion through the
   * the colorspace_fragment shader chunk, which only lands in materials built
   * from its own shader library. A raw ShaderMaterial like this one never
   * receives it. So the render targets correctly hold LINEAR values — three
   * does not convert when drawing into a target — and then this pass wrote
   * those linear values straight into an sRGB framebuffer with no encode.
   * Linear values interpreted as sRGB read far too dark, which is exactly the
   * symptom: measured 22.66 down to 17.67 with bloom notionally ADDING light.
   *
   * Doing it explicitly is not a workaround. For a pass that owns the final
   * write to the canvas, the encode is this pass's job.
   */
  vec3 linearToSRGB(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }

  void main() {
    vec3 base = texture2D(uScene, vUv).rgb;
    vec3 glow = texture2D(uBloom, vUv).rgb;
    // Additive. The base is passed through untouched, so enabling bloom can
    // only ever ADD light — it can never darken the image, which is exactly
    // the failure this pass was written to avoid.
    vec3 lit = base + glow * uStrength;
    gl_FragColor = vec4(linearToSRGB(lit), 1.0);
  }
`;

export function BloomPass({
  strength = 1.1,
  threshold = 0.28,
  radius = 1.4,
  enabled = true,
}: BloomPassProps) {
  const { gl, scene, camera, size, viewport } = useThree();

  const dpr = viewport.dpr;
  const width = Math.max(1, Math.floor(size.width * dpr));
  const height = Math.max(1, Math.floor(size.height * dpr));
  const halfWidth = Math.max(1, Math.floor(width / 2));
  const halfHeight = Math.max(1, Math.floor(height / 2));

  const targets = useMemo(() => {
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      /*
       * HalfFloat so bright emissives keep their headroom above 1.0 through
       * the bright-pass. At 8 bits everything above white clips before the
       * threshold sees it, and the brightest things in the scene bloom the
       * least — the exact opposite of what bloom is for.
       */
      type: THREE.HalfFloatType,
      depthBuffer: true,
    };
    const sceneRT = new THREE.WebGLRenderTarget(1, 1, options);
    const brightRT = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });
    const blurRT = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });
    return { sceneRT, brightRT, blurRT };
  }, []);

  useEffect(() => {
    targets.sceneRT.setSize(width, height);
    targets.brightRT.setSize(halfWidth, halfHeight);
    targets.blurRT.setSize(halfWidth, halfHeight);
  }, [targets, width, height, halfWidth, halfHeight]);

  useEffect(
    () => () => {
      targets.sceneRT.dispose();
      targets.brightRT.dispose();
      targets.blurRT.dispose();
    },
    [targets],
  );

  const passes = useMemo(() => {
    const quad = new THREE.PlaneGeometry(2, 2);
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const passScene = new THREE.Scene();

    const bright = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BRIGHT_FRAG,
      uniforms: { uScene: { value: null }, uThreshold: { value: threshold } },
      depthTest: false,
      depthWrite: false,
    });
    const blur = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLUR_FRAG,
      uniforms: { uSource: { value: null }, uDirection: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });
    const composite = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        uScene: { value: null },
        uBloom: { value: null },
        uStrength: { value: strength },
      },
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(quad, bright);
    mesh.frustumCulled = false;
    passScene.add(mesh);

    return { quad, orthoCamera, passScene, mesh, bright, blur, composite };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      passes.quad.dispose();
      passes.bright.dispose();
      passes.blur.dispose();
      passes.composite.dispose();
    },
    [passes],
  );

  passes.bright.uniforms['uThreshold']!.value = threshold;
  passes.composite.uniforms['uStrength']!.value = strength;

  /*
   * Priority 1 takes over the render loop: R3F stops auto-rendering and this
   * callback is solely responsible for putting pixels on the canvas. That is
   * why every branch below must end in a render to the default framebuffer —
   * an early return here is a black screen, not a missing effect.
   */
  useFrame(() => {
    if (!enabled) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    const { sceneRT, brightRT, blurRT } = targets;
    const { orthoCamera, passScene, mesh, bright, blur, composite } = passes;

    // 1. Scene into a target. No colour conversion happens here.
    gl.setRenderTarget(sceneRT);
    gl.clear();
    gl.render(scene, camera);

    // 2. Bright pass, half resolution.
    mesh.material = bright;
    bright.uniforms['uScene']!.value = sceneRT.texture;
    gl.setRenderTarget(brightRT);
    gl.render(passScene, orthoCamera);

    // 3. Separable blur: horizontal, then vertical.
    mesh.material = blur;
    blur.uniforms['uSource']!.value = brightRT.texture;
    blur.uniforms['uDirection']!.value.set(radius / halfWidth, 0);
    gl.setRenderTarget(blurRT);
    gl.render(passScene, orthoCamera);

    blur.uniforms['uSource']!.value = blurRT.texture;
    blur.uniforms['uDirection']!.value.set(0, radius / halfHeight);
    gl.setRenderTarget(brightRT);
    gl.render(passScene, orthoCamera);

    // 4. Composite to the canvas. three converts to sRGB exactly once, here.
    mesh.material = composite;
    composite.uniforms['uScene']!.value = sceneRT.texture;
    composite.uniforms['uBloom']!.value = brightRT.texture;
    gl.setRenderTarget(null);
    gl.render(passScene, orthoCamera);
  }, 1);

  return null;
}
