/**
 * The beat choreography. GSAP, per the locked stack (§12.1).
 *
 * WHY A TIMELINE AND NOT AN ENVELOPE FUNCTION
 * P4 drew the membrane flare with a hand-written envelope, which was right for
 * a phase with no beats. §2.5's peak is not an envelope: it is a sequence with a
 * HOLD in the middle, several properties moving on different curves, and a
 * resume that has to land after the hold rather than blend through it. A
 * timeline expresses "stop, and stay stopped, and then resume" directly;
 * hand-rolled interpolation expresses it as arithmetic nobody can read.
 *
 * THE CHOREOGRAPHY IS LOCKED (§12.1). §2.5 specifies it exactly:
 *
 *   1. the request travels through the lattice toward the other tenant
 *   2. TIME DILATES as it approaches the boundary — everything else slows
 *   3. IMPACT. the membrane flares cyan and HOLDS. 403
 *   4. SILENCE AND STILLNESS FOR ONE BEAT. nothing moves
 *   5. the world resumes at normal speed
 *   6. ~200ms later an audit pulse returns to the visitor's own volume
 *
 * "Slow, stop, hold, resume. That is the shape of a moment people describe to
 * other people." The timings below are that shape and are not free to drift.
 *
 * WHAT IS REAL HERE
 * The choreography is triggered by a real 403 from the control plane and the
 * audit pulse is triggered by the real audit event arriving over the socket.
 * The dilation curve is a deliberate, documented interpretation of a real
 * event — the dossier asks for it explicitly — and it is the only place on this
 * surface where motion is authored rather than measured. It is authored because
 * §2.5 authored it, and it represents an event that genuinely happened.
 */
import gsap from 'gsap';

export type BreakOutState = {
  /** 1 = normal, approaching 0 = dilated. Multiplies the world's clock. */
  timeScale: number;
  /** 0..1 membrane flare. Cyan, and only ever this. */
  flare: number;
  /** 0..1 the returning audit pulse. */
  auditPulse: number;
  /** How far the attacking packet has travelled, 0..1. */
  approach: number;
};

export const NEUTRAL: BreakOutState = { timeScale: 1, flare: 0, auditPulse: 0, approach: 0 };

/**
 * Build the peak.
 *
 * `onUpdate` is called every frame with the current state; the renderer reads
 * it. Returns the timeline so the caller can kill it on unmount — a timeline
 * left running after its component is gone keeps mutating state nobody is
 * drawing.
 */
export function breakOutTimeline(
  onUpdate: (state: BreakOutState) => void,
  options: { reducedMotion: boolean; onImpact?: () => void; onComplete?: () => void },
): gsap.core.Timeline {
  const state: BreakOutState = { ...NEUTRAL };
  const emit = () => onUpdate({ ...state });
  const done = options.onComplete;

  if (options.reducedMotion) {
    /*
     * Reduced motion keeps the INFORMATION and drops the movement (§11).
     * The visitor still learns they were stopped, the membrane still marks the
     * boundary, the audit pulse still confirms the record — but nothing
     * travels, nothing dilates, and states change instantly.
     */
    const timeline = gsap.timeline(done ? { onComplete: done } : {});
    timeline
      .call(() => {
        state.approach = 1;
        state.flare = 1;
        emit();
        options.onImpact?.();
      })
      .to({}, { duration: 0.9 })
      .call(() => {
        state.flare = 0;
        state.auditPulse = 1;
        emit();
      })
      .to({}, { duration: 0.6 })
      .call(() => {
        state.auditPulse = 0;
        emit();
      });
    return timeline;
  }

  const timeline = gsap.timeline(done ? { onUpdate: emit, onComplete: done } : { onUpdate: emit });

  // 1–2. The approach, and the dilation. The packet accelerates away from the
  // edge and then the world slows around it as it nears the boundary, so the
  // last stretch takes longer than the first despite being shorter.
  timeline
    .to(state, { approach: 0.72, duration: 0.75, ease: 'power2.in' }, 0)
    .to(state, { timeScale: 0.12, duration: 0.55, ease: 'power3.out' }, 0.45)
    .to(state, { approach: 1, duration: 0.5, ease: 'power1.out' }, 0.75);

  // 3. IMPACT. The flare is fast in — a boundary does not ease into refusing.
  timeline
    .call(() => options.onImpact?.(), undefined, 1.25)
    .to(state, { flare: 1, duration: 0.09, ease: 'power4.out' }, 1.25);

  // 4. THE HOLD. Nothing moves. This is the beat people remember and it is
  // deliberately long enough to feel like a stop rather than a pause.
  timeline.to(state, { flare: 1, timeScale: 0.06, duration: 0.62 }, 1.34);

  // 5. The world resumes. Time comes back before the flare fades, so the
  // resumption is felt as motion returning rather than as a light going out.
  timeline
    .to(state, { timeScale: 1, duration: 0.85, ease: 'power2.inOut' }, 1.96)
    .to(state, { flare: 0, duration: 1.1, ease: 'power2.out' }, 2.1);

  // 6. ~200ms after the resume begins, the audit pulse returns to the
  // visitor's own volume: the system recording what was just attempted.
  timeline
    .to(state, { auditPulse: 1, duration: 0.22, ease: 'power3.out' }, 2.16)
    .to(state, { auditPulse: 0, duration: 1.0, ease: 'power2.out' }, 2.42);

  return timeline;
}

/**
 * The cold open (§2.2).
 *
 * "Geometry begins assembling out of the dark, its timing driven by the
 * visitor's actual handshake latency." So `rttMs` is a real measurement and it
 * genuinely sets the pace: a visitor on a slow connection watches the world
 * assemble more slowly, because it did.
 *
 * Clamped, because a 2ms local RTT should not make the beat imperceptible and a
 * 3-second timeout should not hold someone hostage. The clamp is disclosed
 * rather than silent — the arrival panel prints the real number it measured.
 */
export function coldOpenTimeline(
  onUpdate: (assembly: number) => void,
  options: { rttMs: number; reducedMotion: boolean; onComplete?: () => void },
): gsap.core.Timeline {
  const state = { assembly: 0 };
  const emit = () => onUpdate(state.assembly);
  const done = options.onComplete;

  if (options.reducedMotion) {
    const timeline = gsap.timeline(done ? { onComplete: done } : {});
    timeline.call(() => {
      state.assembly = 1;
      emit();
    });
    return timeline;
  }

  // Real latency, mapped to a duration an eye can read. 40ms → ~1.1s,
  // 400ms → ~2.4s. Monotonic: slower really does look slower.
  const duration = Math.min(3.2, Math.max(0.9, 0.75 + Math.log10(options.rttMs + 1) * 0.62));

  const timeline = gsap.timeline(done ? { onUpdate: emit, onComplete: done } : { onUpdate: emit });
  timeline.to(state, { assembly: 1, duration, ease: 'power2.out' });
  return timeline;
}
