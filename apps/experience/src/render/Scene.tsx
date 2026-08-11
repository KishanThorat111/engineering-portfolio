/**
 * The canvas, the camera rig, the post chain, and the quality governor.
 *
 * ONE CONTINUOUS TAKE (§3.8). There is exactly one Canvas for the life of the
 * page and it is never unmounted, never remounted, and never crossfaded.
 * Anything that would read as a cut — a loading screen, a route transition, a
 * component swap that recreates the renderer — is the thing this surface exists
 * to not do.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { World } from './World.tsx';
import { PALETTE } from './shaders.ts';
import {
  QualityGovernor,
  initialTier,
  settingsFor,
  type QualitySettings,
  type Tier,
} from './quality.ts';
import { useWorld } from '../state/store.ts';

/**
 * The camera has weight (§3.8): "slight lead-in and settle. Never linear. Never
 * snappy. It behaves like a physical rig, not a lerp."
 *
 * Implemented as a critically-damped spring rather than an easing function,
 * because a spring produces the settle for free and cannot overshoot when it is
 * damped at 1. A lerp toward a target is the thing the dossier explicitly
 * names as wrong, so the difference is not cosmetic.
 */
/**
 * Time dilation (§2.5 step 2): "everything else slows".
 *
 * R3F's clock drives every useFrame delta in the scene, so scaling it here
 * slows the entire world at once — packets, volume drift, the camera — rather
 * than requiring every component to know about the choreography. That is the
 * whole reason the timeline exposes a timeScale instead of animating each
 * element: one number, applied at the root, and nothing downstream has to
 * participate.
 */
function TimeDilation() {
  const timeScale = useWorld((s) => s.breakOut.timeScale);
  const { clock } = useThree();
  useFrame(() => {
    // Guarded: a zero would stop the clock permanently rather than dilate it,
    // and the hold is meant to be near-stillness, not a frozen frame.
    (clock as unknown as { _tScale?: number })._tScale = Math.max(timeScale, 0.02);
  });
  return null;
}

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const approach = useWorld((s) => s.breakOut.approach);
  const velocity = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3(0, 2.4, 26));
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      // Parallax bounded hard. This is a rig responding to attention, not a
      // camera the visitor drives — §3.9 keeps the take continuous.
      pointer.current.x = (event.clientX / innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / innerHeight - 0.5) * 2;
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (reducedMotion) {
      // No drift, no parallax, no breathing. The frame is composed and static.
      camera.position.set(0, 2.4, 26);
      camera.lookAt(lookAt.current);
      return;
    }

    // A slow orbital drift: the world is alive without anyone touching it
    // (§3.6, "idle is alive"). Amplitude is small enough to read as breathing.
    const t = state.clock.elapsedTime;
    /*
     * The rig closes on the boundary as the request approaches it, and the
     * spring below carries it back afterwards without a second animation. The
     * pull is bounded so the world never loses its scale — §3.8 wants one
     * continuous take, not a cut to a close-up.
     */
    const pull = approach * 5.5;
    target.current.set(
      Math.sin(t * 0.045) * 2.6 + pointer.current.x * 1.5,
      2.4 + Math.sin(t * 0.07) * 0.55 - pointer.current.y * 0.9,
      26 + Math.cos(t * 0.035) * 1.4 - pull,
    );

    // Critically damped spring. omega sets how quickly it converges; damping at
    // 1 means it settles without overshoot, which is what "weight" feels like.
    const omega = 1.9;
    const displacement = target.current.clone().sub(camera.position);
    velocity.current.addScaledVector(displacement, omega * omega * dt);
    velocity.current.addScaledVector(velocity.current, -2 * omega * dt);
    camera.position.addScaledVector(velocity.current, dt);

    camera.lookAt(lookAt.current);
  });

  return null;
}

/** Samples real frame deltas and lets the governor decide. A8. */
function FrameGovernor({
  onTier,
  onReport,
}: {
  onTier: (tier: Tier, reason: string) => void;
  onReport: (report: { p50: number; p95: number; fps: number }) => void;
}) {
  const governor = useMemo(() => new QualityGovernor(initialTier(), onTier), [onTier]);

  useFrame((_, delta) => {
    governor.sample(delta * 1000);
    const report = governor.report;
    if (report.samples > 0) onReport({ p50: report.p50, p95: report.p95, fps: report.fps });
  });

  /*
   * Exposed for measurement, not for the product.
   *
   * The performance budget is a claim this project has to be able to prove, and
   * "it looked smooth" is not a measurement. A harness reads this to get real
   * p50/p95 out of a real browser session. It publishes nothing a visitor sees
   * and changes no behaviour.
   */
  useEffect(() => {
    const w = window as unknown as { __frameReport?: () => unknown };
    w.__frameReport = () => governor.report;
    return () => {
      delete w.__frameReport;
    };
  }, [governor]);

  return null;
}

function Post({ quality }: { quality: QualitySettings }) {
  if (!quality.bloom) return null;
  return (
    <EffectComposer
      // Multisampling off: the bloom pass is the only effect and MSAA on the
      // composer's buffers costs more than it returns at this scale.
      multisampling={0}
    >
      <Bloom
        // Restrained (§3.7). A high threshold means only genuinely bright
        // things bloom — the membrane flare and dense packet traffic — rather
        // than the whole scene acquiring a haze it did not earn.
        luminanceThreshold={0.62}
        luminanceSmoothing={0.28}
        intensity={0.85}
        mipmapBlur
        resolutionScale={quality.bloomResolutionScale}
      />
    </EffectComposer>
  );
}

export function Scene() {
  const reducedMotion = useWorld((s) => s.reducedMotion);
  const setTier = useWorld((s) => s.setTier);
  const setFrame = useWorld((s) => s.setFrame);
  const setWebglAvailable = useWorld((s) => s.setWebglAvailable);
  const [tier, setLocalTier] = useState<Tier>(() => initialTier());

  const quality = useMemo(() => settingsFor(tier), [tier]);

  const handleTier = useMemo(
    () => (next: Tier, reason: string) => {
      setLocalTier(next);
      setTier(next, reason);
    },
    [setTier],
  );

  return (
    <Canvas
      className="scene-canvas"
      // aria-hidden because the DOM document beside it carries the same
      // information in text. A canvas announced to a screen reader as an
      // unlabelled graphic is noise; the document is the accessible path.
      aria-hidden="true"
      dpr={quality.pixelRatio}
      gl={{
        antialias: quality.antialias,
        powerPreference: 'high-performance',
        // The scene composites over the page background rather than owning it,
        // so the CSS token stays the single source of the dark.
        alpha: true,
        stencil: false,
        depth: true,
      }}
      camera={{ position: [0, 2.4, 26], fov: 46, near: 0.1, far: 120 }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color(PALETTE.dark), 0);
        // Distance reads as haze (§3.7) without a volumetric pass.
        scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.dark), 0.021);
        setWebglAvailable(true);
      }}
      fallback={null}
      // A context loss is a real failure and must be visible, not silent.
      onError={() => setWebglAvailable(false)}
    >
      <Suspense fallback={null}>
        <TimeDilation />
        <CameraRig reducedMotion={reducedMotion} />
        <FrameGovernor onTier={handleTier} onReport={setFrame} />
        <World quality={quality} />
        <Post quality={quality} />
      </Suspense>
    </Canvas>
  );
}
