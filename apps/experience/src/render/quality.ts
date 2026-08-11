/**
 * Adaptive quality tiers — A8, binding, and §11's "automatic, never ask".
 *
 * WHY SUSTAINED FRAME TIME AND NOT A DEVICE PROBE
 * The tempting implementation reads the GPU string or a hardware-concurrency
 * count once at load and picks a tier. It is wrong for the device this project
 * actually targets. A mid-range Android holds 60fps for roughly ninety seconds
 * and then thermally throttles; a tier chosen at load and never revisited is
 * correct for the first minute of a twenty-minute session and wrong for the
 * other nineteen. The dossier budgets a twenty-minute visit (§1.5), so the tier
 * has to keep watching.
 *
 * WHY A ROLLING p95 AND NOT A MEAN
 * A mean hides exactly the frames a visitor notices. Two dropped frames a
 * second is a visibly stuttering world with a perfectly acceptable average. p95
 * over a window tracks the bad frames, which are the ones that decide whether
 * this reads as smooth.
 *
 * WHY DOWNGRADES ARE FAST AND UPGRADES ARE SLOW
 * Being one tier too low is invisible. Being one tier too high is the whole
 * failure. So a downgrade needs one bad window and an upgrade needs several
 * consecutive good ones plus a cooldown — otherwise a system sitting exactly on
 * the boundary oscillates, and an oscillating tier looks far worse than the
 * lower tier would have.
 */

export type Tier = 1 | 2 | 3;

export type QualitySettings = {
  tier: Tier;
  /** Render scale applied to the drawing buffer. */
  pixelRatio: number;
  bloom: boolean;
  /** Bloom at half resolution is most of the look for a quarter of the cost. */
  bloomResolutionScale: number;
  depthOfField: boolean;
  /** Volumetric haze, faked with billboards rather than raymarched. */
  atmosphere: boolean;
  /** Tenant volumes drawn beyond the near cluster. */
  maxVolumes: number;
  /** Packets in flight before the oldest are retired early. */
  maxPackets: number;
  /** Shadowing is off at every tier — see the note in Scene.tsx. */
  antialias: boolean;
};

const TIERS: Record<Tier, Omit<QualitySettings, 'tier'>> = {
  3: {
    pixelRatio: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2),
    bloom: true,
    bloomResolutionScale: 1,
    depthOfField: true,
    atmosphere: true,
    maxVolumes: 96,
    maxPackets: 160,
    antialias: true,
  },
  2: {
    pixelRatio: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 1.5),
    bloom: true,
    // Half-res bloom. The dossier asks for restraint (§3.7) and the visual
    // difference at this scale is close to nothing.
    bloomResolutionScale: 0.5,
    // Depth of field is the single most expensive pass and the least
    // load-bearing: §3.7 wants focus kept where the story is, and the camera
    // framing already does that.
    depthOfField: false,
    atmosphere: true,
    maxVolumes: 64,
    maxPackets: 96,
    antialias: true,
  },
  1: {
    pixelRatio: 1,
    bloom: false,
    bloomResolutionScale: 0.5,
    depthOfField: false,
    atmosphere: false,
    maxVolumes: 28,
    maxPackets: 40,
    antialias: false,
  },
};

export function settingsFor(tier: Tier): QualitySettings {
  return { tier, ...TIERS[tier] };
}

/** 60fps is 16.67ms. The headroom below is deliberate, not sloppy. */
const TARGET_FRAME_MS = 16.7;
/** Downgrade above this sustained. ~53fps — the point drops become visible. */
const DOWNGRADE_P95_MS = 19;
/** Upgrade only well inside budget, so the decision has margin to be wrong. */
const UPGRADE_P95_MS = 12;

const WINDOW_FRAMES = 120;
const GOOD_WINDOWS_BEFORE_UPGRADE = 4;
const UPGRADE_COOLDOWN_MS = 10_000;

export type QualityReport = {
  tier: Tier;
  p50: number;
  p95: number;
  fps: number;
  samples: number;
  changedAt: number | null;
  reason: string;
};

export class QualityGovernor {
  #frames: number[] = [];
  #tier: Tier;
  #goodWindows = 0;
  #lastChange = 0;
  #lastUpgradeAttempt = 0;
  #reason = 'initial';
  #onChange: (tier: Tier, reason: string) => void;
  #latest: QualityReport;

  constructor(startTier: Tier, onChange: (tier: Tier, reason: string) => void) {
    this.#tier = startTier;
    this.#onChange = onChange;
    this.#latest = {
      tier: startTier,
      p50: 0,
      p95: 0,
      fps: 0,
      samples: 0,
      changedAt: null,
      reason: 'initial',
    };
  }

  get tier(): Tier {
    return this.#tier;
  }

  get report(): QualityReport {
    return this.#latest;
  }

  /**
   * Feed one frame's delta in milliseconds.
   *
   * Frames longer than 200ms are discarded rather than counted: a backgrounded
   * tab, a garbage collection pause, or the browser's own compositor hitch is
   * not the scene being too heavy, and reacting to one would downgrade a device
   * that was doing fine.
   */
  sample(deltaMs: number): void {
    if (deltaMs <= 0 || deltaMs > 200) return;
    this.#frames.push(deltaMs);
    if (this.#frames.length < WINDOW_FRAMES) return;

    const sorted = [...this.#frames].sort((a, b) => a - b);
    const p50 = percentile(sorted, 0.5);
    const p95 = percentile(sorted, 0.95);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    this.#frames = [];

    this.#latest = {
      tier: this.#tier,
      p50,
      p95,
      fps: Math.round(1000 / Math.max(mean, 0.001)),
      samples: WINDOW_FRAMES,
      changedAt: this.#lastChange || null,
      reason: this.#reason,
    };

    const now = performance.now();

    if (p95 > DOWNGRADE_P95_MS && this.#tier > 1) {
      this.#goodWindows = 0;
      this.#set((this.#tier - 1) as Tier, `sustained p95 ${p95.toFixed(1)}ms over budget`, now);
      return;
    }

    if (p95 < UPGRADE_P95_MS && this.#tier < 3) {
      this.#goodWindows += 1;
      const cooledDown = now - this.#lastUpgradeAttempt > UPGRADE_COOLDOWN_MS;
      if (this.#goodWindows >= GOOD_WINDOWS_BEFORE_UPGRADE && cooledDown) {
        this.#goodWindows = 0;
        this.#lastUpgradeAttempt = now;
        this.#set((this.#tier + 1) as Tier, `sustained headroom, p95 ${p95.toFixed(1)}ms`, now);
      }
      return;
    }

    this.#goodWindows = 0;
  }

  #set(tier: Tier, reason: string, now: number): void {
    this.#tier = tier;
    this.#reason = reason;
    this.#lastChange = now;
    this.#latest = { ...this.#latest, tier, reason, changedAt: now };
    this.#onChange(tier, reason);
  }
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index] ?? 0;
}

/**
 * The tier to START at.
 *
 * A probe is a reasonable opening guess and a terrible standing decision, so it
 * is used for exactly that: pick a plausible tier, then let the governor
 * correct it from measured behaviour within a couple of seconds. Deliberately
 * conservative — starting low and rising is invisible, starting high and
 * falling is a stutter in the opening beat.
 */
export function initialTier(): Tier {
  if (typeof navigator === 'undefined') return 2;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const smallViewport = typeof innerWidth === 'number' && innerWidth < 820;
  if (coarse || smallViewport || cores <= 4) return 1;
  if (cores >= 8) return 2;
  return 2;
}

export { TARGET_FRAME_MS, DOWNGRADE_P95_MS, UPGRADE_P95_MS };
