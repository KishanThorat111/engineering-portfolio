/**
 * The estate (§2.7) — read from the machine layer, never re-authored.
 *
 * RULE 10 DECIDES THIS FILE. `/api/profile.json` is generated at build from the
 * same content collections the case-study pages render, and a CI gate asserts
 * the two cannot disagree. So the estate reads it. Re-typing the three
 * platforms' names, statuses, and limitations into this surface would create a
 * third copy that drifts silently — and the drift would be in the direction
 * that flatters, which is exactly what the constitution exists to prevent.
 *
 * WHAT THE OTHER THREE NODES CARRY, AND WHAT THEY DO NOT
 * §15 leaves hospital telemetry permissions unanswered, and until it is
 * answered "the estate layer shows only already-published facts". So the three
 * production platforms carry their published status, their disclosed
 * limitations, and a link to their case study — and no live signal of any kind.
 * They are explicitly not attackable, which §2.7 makes the point rather than a
 * caveat: this one is yours to break; those three are load-bearing.
 */

export type EstateNode = {
  id: string;
  name: string;
  statusLabel: string;
  url: string;
  summary: string;
  limitations: string[];
  /** True only for the demo plane. The three real platforms are never live here. */
  attackable: boolean;
  /** Whether this node carries live telemetry. Only the demo plane does. */
  liveSignal: boolean;
};

type ProfileSystem = {
  name: string;
  statusLabel: string;
  statusDetail?: string;
  url: string;
  summary: string;
  limitations?: Array<{ limitation: string }>;
};

type Profile = { systems?: ProfileSystem[] };

/**
 * The demo plane's own node.
 *
 * It is the only one that is live, the only one that is attackable, and the
 * only one whose numbers move. §2.7: "The thing they just tried to break is the
 * smallest of them."
 */
export const DEMO_NODE: EstateNode = {
  id: 'demo-plane',
  name: 'This demonstration plane',
  statusLabel: 'LIVE — DEMO',
  url: '/live/',
  summary:
    'The system you have been inside. A real multi-tenant control plane built to be attacked, ' +
    'with nothing real behind it. It is the smallest system here.',
  limitations: [
    'A single VM. When it is down, it is down, and this page says so rather than pretending.',
    'Every tenant it creates is destroyed on a TTL, so nothing here accumulates.',
  ],
  attackable: true,
  liveSignal: true,
};

export async function loadEstate(): Promise<EstateNode[]> {
  const response = await fetch('/api/profile.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`the machine layer returned ${response.status}`);
  const profile = (await response.json()) as Profile;

  const systems = (profile.systems ?? []).map<EstateNode>((system) => ({
    id: new URL(system.url).pathname.split('/').filter(Boolean).pop() ?? system.name,
    name: system.name,
    statusLabel: system.statusDetail
      ? `${system.statusLabel} (${system.statusDetail})`
      : system.statusLabel,
    // Relative, so the link works on whatever origin is serving. The absolute
    // form in profile.json carries the configured origin, which is correct
    // there and unnecessary here.
    url: new URL(system.url).pathname,
    summary: system.summary,
    limitations: (system.limitations ?? []).map((entry) => entry.limitation),
    // Never. These are load-bearing systems other people depend on.
    attackable: false,
    // §15: unanswered permissions mean no live signal, not an estimated one.
    liveSignal: false,
  }));

  return [DEMO_NODE, ...systems];
}
