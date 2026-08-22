/**
 * THE GLOW RULE — the C2 ruling, made mechanical.
 *
 * Ruled 22 Aug 2026 (docs/REFERENCE_DECOMPOSITION.md §0.2): the ten approved
 * references are reconstructed at full visual fidelity — their composition,
 * lighting, depth and material language — and the locked §3.2 register is
 * preserved as PROVENANCE rather than as restraint:
 *
 *     Nothing emits light unless it is carrying a real measurement.
 *     An unlit panel means idle, not unstyled.
 *
 * This is stricter than §3.2 as written, which restrained saturation. This
 * restrains cause. It is also the only reason the references are safe to follow
 * literally: a luminous world whose every lumen is earned is not the genre
 * §3.2 warned about, because the genre's glow is decoration and this one is a
 * readout.
 *
 * WHY THIS IS A MODULE AND NOT A COMMENT
 * A rule stated in prose gets violated by the third person who needs a frame to
 * look less empty, and nothing fails when they do. Routing every emissive value
 * in the kit through `glow()` means the violation has to be written on purpose:
 * you cannot get light out of this function without handing it a measurement,
 * and handing it `null` — the honest representation of "not measured" on the
 * wire contract — returns darkness rather than a default.
 *
 * THE FAILURE THIS PREVENTS, CONCRETELY
 * `LiveEvent.durationMs` is `number | null`, and null means the span was never
 * timed. The tempting `durationMs ?? 0` draws a fully-lit object for a request
 * nobody measured. That is a visual produced without the backend being real,
 * which is exactly what dossier §1.3's corollary rules out. `glow()` cannot be
 * given that shape by accident.
 */

/**
 * A measurement, or the honest absence of one.
 *
 * `null` is not zero and must never be coerced to it. Unknown is a third state
 * and the whole kit is built to render it as darkness.
 */
export type Measurement = number | null;

/** How bright a thing is allowed to be, and why it is allowed to be that. */
export type Glow = {
  /** 0 when unmeasured. Multiply emissive intensity by this and nothing else. */
  readonly intensity: number;
  /** False when there is no measurement behind this object. */
  readonly earned: boolean;
};

/** Darkness, and the reason for it: nothing measured this. */
export const DARK: Glow = Object.freeze({ intensity: 0, earned: false });

export type GlowOptions = {
  /**
   * The measurement's value at full brightness. A load of `ceiling` or more
   * lights the object completely.
   */
  ceiling: number;
  /**
   * Brightness at the smallest non-zero measurement. Above zero so that a
   * system doing a little work is visibly doing a little work rather than
   * looking identical to one doing none.
   */
  floor?: number;
  /**
   * Gamma applied to the normalised value. Below 1 lifts small measurements,
   * which matters because real telemetry is long-tailed: a linear ramp leaves
   * a genuinely busy system sitting at 4% brightness because one outlier set
   * the ceiling.
   */
  curve?: number;
};

/**
 * Turn a measurement into brightness.
 *
 * Returns {@link DARK} for `null`, for `NaN`, and for negatives — all three
 * mean "this was not measured", and none of them should be able to produce
 * light. Zero is a real measurement of no activity and also produces darkness,
 * which is correct and is what "idle means dark" means at the pixel level.
 */
export function glow(measurement: Measurement, options: GlowOptions): Glow {
  if (measurement === null || !Number.isFinite(measurement) || measurement < 0) return DARK;
  if (measurement === 0) return { intensity: 0, earned: true };

  const { ceiling, floor = 0.12, curve = 0.6 } = options;
  if (!(ceiling > 0)) return DARK;

  const normalised = Math.min(measurement / ceiling, 1);
  const shaped = Math.pow(normalised, curve);
  return { intensity: floor + (1 - floor) * shaped, earned: true };
}

/**
 * Brightness from a count of things that really happened in a window.
 *
 * The kit's most common case: a plate lit by how many events its subsystem
 * handled. Separate from {@link glow} only so that call sites read as what they
 * are, and so the long-tail curve is not re-chosen at every site.
 */
export function glowFromActivity(events: Measurement, perWindow = 12): Glow {
  return glow(events, { ceiling: perWindow, floor: 0.15, curve: 0.55 });
}

/**
 * Brightness from latency, inverted: fast is bright, slow is dim.
 *
 * Motion is measurement (§3.6) and so is light. A slow system should look
 * laboured, and this is how a plate says so without a label.
 */
export function glowFromLatency(durationMs: Measurement, budgetMs = 250): Glow {
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) return DARK;
  const health = Math.max(0, 1 - durationMs / budgetMs);
  return { intensity: 0.15 + 0.85 * health, earned: true };
}

/**
 * Speed for a packet travelling a conduit, in world units per second.
 *
 * The dossier's hardest motion rule (§3.6): "packet speed IS latency — a slow
 * request looks slow because it WAS slow." Returns null for an unmeasured
 * span, and a null speed must draw no packet at all rather than a default one.
 */
export function speedFromLatency(
  durationMs: Measurement,
  distance: number,
  reference = { ms: 40, seconds: 0.9 },
): number | null {
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) return null;
  /*
   * A 40ms request crosses its conduit in 0.9s. Everything else scales
   * linearly from that, then clamps — not for prettiness, but because an
   * eight-second traversal reads as a broken animation rather than as a slow
   * request, and a 2ms one is a flicker nobody sees. The clamp is disclosed
   * here because it is the one place in the kit where a measurement is not
   * rendered proportionally.
   */
  const seconds = (Math.max(durationMs, 1) / reference.ms) * reference.seconds;
  const clamped = Math.min(Math.max(seconds, 0.18), 6);
  return distance / clamped;
}
