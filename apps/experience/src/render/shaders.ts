/**
 * The world's materials.
 *
 * REGISTER: OPERATIONAL EVIDENCE, NOT SCI-FI GLASS (§3.2). This is the
 * correction the design review made and it constrains every line below.
 * Volumetric glowing shapes in darkness is the visual language of every AI
 * product since 2023 — genre, and genre is forgettable. So nothing here glows
 * for its own sake: light means load, edges mean structure, and the one cold
 * colour in the world means refusal.
 *
 * PALETTE, LOCKED (§3.4)
 *   deep blue-slate  the dark. 4am, not outer space.
 *   accent green     things working.
 *   amber            caution.
 *   cold white-cyan  THE ISOLATION BOUNDARY AND NOTHING ELSE, EVER.
 *
 * The cyan constant appears exactly once in this file and is used by exactly
 * one material. If a future change wants cyan anywhere else, that is a palette
 * change and §12.1 makes it an owner decision.
 *
 * WHY NO TRANSMISSION MATERIAL
 * §3.3 asks for thin translucent shells with refraction and interior light.
 * The obvious tool is MeshTransmissionMaterial, which renders the scene again
 * per object and composes badly with instancing — and instancing is exactly
 * what dozens of tenant volumes need. A fresnel shell with an interior term
 * gets the read at a fraction of the cost and instances cleanly, which is what
 * makes the 60fps budget reachable at all.
 */

export const PALETTE = {
  /** --bg from the locked tokens. */
  dark: '#0b0e14',
  /** --accent. Things working. */
  green: '#4ade80',
  /** --accent-warm. Caution, pre-launch. */
  amber: '#fbbf24',
  /** --accent-danger. Used sparingly, for refusal in the log, never as light. */
  danger: '#f87171',
  /** --text-muted. Structure, lattice, labels. */
  muted: '#9aa3b2',
  /**
   * THE ISOLATION BOUNDARY. One colour, one meaning, whole experience.
   * Do not reuse this for anything else — §3.4 is explicit and §12.1 locks it.
   */
  isolationCyan: '#a8f0ff',
} as const;

/* ------------------------------------------------------------------ *
 * Tenant volume — a thin shell, lit from within by its own activity.
 * ------------------------------------------------------------------ */

export const volumeVertex = /* glsl */ `
  attribute vec3 instanceColorTint;
  attribute float instanceLoad;
  attribute float instanceSelf;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vTint;
  varying float vLoad;
  varying float vSelf;
  varying vec3 vLocal;

  void main() {
    vTint = instanceColorTint;
    vLoad = instanceLoad;
    vSelf = instanceSelf;
    vLocal = position;

    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * worldPosition;

    // Normals must go through the instance matrix too, or every instance is lit
    // as though it were sitting at the origin unrotated.
    mat3 instanceNormal = mat3(instanceMatrix);
    vNormalW = normalize(normalMatrix * instanceNormal * normal);
    vViewDir = normalize(-mvPosition.xyz);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const volumeFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uDark;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vTint;
  varying float vLoad;
  varying float vSelf;
  varying vec3 vLocal;

  void main() {
    // Fresnel: the shell is nearly invisible face-on and gathers at its edges,
    // which is what makes it read as a thin surface rather than a solid.
    float facing = clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 2.4);

    // LOAD IS LIGHT (§3.7), literally: the interior term is driven by the
    // volume's real event rate, so a quiet tenant is genuinely darker. Nothing
    // here brightens on a timer.
    float interior = vLoad * 0.55;

    // A slow, tiny breath. Idle is alive (§3.6) — but this is the world
    // breathing, not invented traffic.
    float breath = 0.965 + 0.035 * sin(uTime * 0.6 + vLocal.y * 2.0);

    // The visitor's own volume carries a faint horizontal banding, so it is
    // identifiable at a glance without a label or a second colour.
    float band = vSelf > 0.5 ? 0.06 * smoothstep(0.35, 0.5, abs(fract(vLocal.y * 6.0) - 0.5)) : 0.0;

    vec3 colour = uDark + vTint * (fresnel * 0.85 + interior + band) * breath;

    // Alpha follows the same terms: an idle shell is faint, a loaded one is
    // present. Additive blending is deliberately NOT used — it saturates to
    // white and turns the operational register into the sci-fi one.
    float alpha = clamp(fresnel * 0.9 + interior * 0.55 + 0.03, 0.0, 0.92);

    gl_FragColor = vec4(colour, alpha);
  }
`;

/* ------------------------------------------------------------------ *
 * The isolation membrane — invisible until struck (§3.3).
 * ------------------------------------------------------------------ */

export const membraneVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalW = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/**
 * Soap-film interference. Iridescent, and only on contact.
 *
 * `uFlare` is driven by an actual policy denial arriving from the control
 * plane — never by a timer, never by proximity, never by hover. The membrane
 * flaring IS the denial (§3.6); if it flared for any other reason the brightest
 * cold moment in the world would stop meaning what the legend says it means.
 */
export const membraneFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uFlare;
  uniform vec3 uCyan;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec2 vUv;

  // Thin-film interference, cheaply: path difference shifts with view angle,
  // and the three channels sample it at slightly different phases.
  vec3 interference(float cosTheta, float thickness) {
    float phase = thickness / max(cosTheta, 0.08);
    return vec3(
      0.5 + 0.5 * cos(phase * 6.0),
      0.5 + 0.5 * cos(phase * 6.0 + 1.6),
      0.5 + 0.5 * cos(phase * 6.0 + 3.1)
    );
  }

  void main() {
    if (uFlare <= 0.001) discard;

    float facing = clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 1.8);

    float thickness = 1.6 + 0.35 * sin(vUv.y * 22.0 + uTime * 0.8);
    vec3 film = interference(facing, thickness);

    // Held to the cyan. The interference gives it life without letting it drift
    // into hues that would read as a different signal.
    vec3 colour = mix(uCyan, uCyan * film, 0.45);

    float alpha = (rim * 0.85 + 0.12) * uFlare;
    gl_FragColor = vec4(colour * (0.6 + uFlare * 0.9), clamp(alpha, 0.0, 0.95));
  }
`;

/* ------------------------------------------------------------------ *
 * Packets — data as light in glass (§3.3), speed as latency (§3.6).
 * ------------------------------------------------------------------ */

export const packetVertex = /* glsl */ `
  attribute float instanceProgress;
  attribute float instanceUnmeasured;
  attribute vec3 instanceTint;

  varying float vProgress;
  varying float vUnmeasured;
  varying vec3 vTint;

  void main() {
    vProgress = instanceProgress;
    vUnmeasured = instanceUnmeasured;
    vTint = instanceTint;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const packetFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  varying float vProgress;
  varying float vUnmeasured;
  varying vec3 vTint;

  void main() {
    // Fade in from the edge plane and out on arrival, so nothing pops.
    float envelope = smoothstep(0.0, 0.08, vProgress) * (1.0 - smoothstep(0.86, 1.0, vProgress));

    /*
     * UNMEASURED IS DRAWN DASHED.
     *
     * A packet whose duration the system never measured must not be drawn as
     * though it were fast — that would assert a latency nobody recorded, which
     * is the decoration §1.3's corollary rules out. Dashed is the honest mark,
     * and the legend says so in words.
     */
    float dash = vUnmeasured > 0.5
      ? step(0.5, fract(vProgress * 26.0 + uTime * 1.2))
      : 1.0;

    float alpha = envelope * dash * 0.95;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vTint, alpha);
  }
`;

/* ------------------------------------------------------------------ *
 * The lattice — structure, not decoration.
 * ------------------------------------------------------------------ */

export const latticeVertex = /* glsl */ `
  varying float vDepth;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/**
 * A grid that fades with distance.
 *
 * The fade is doing real work: §3.7 wants light to scatter so distance reads as
 * haze, and a grid drawn at full strength to the horizon flattens the space
 * into a backdrop. It also hides the plane's finite edge without a wall.
 */
export const latticeFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uColour;
  uniform float uOpacity;
  uniform float uFadeNear;
  uniform float uFadeFar;

  varying float vDepth;
  varying vec2 vUv;

  void main() {
    vec2 grid = abs(fract(vUv * 14.0 - 0.5) - 0.5) / fwidth(vUv * 14.0);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDepth);
    float alpha = line * uOpacity * fade;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uColour, alpha);
  }
`;
