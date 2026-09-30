/**
 * THE TRUTH BOUNDARY between the live plane and the ten stations.
 *
 * Every number the world renders passes through this file, and this is the
 * only place allowed to decide what a station is told. The dev bench feeds the
 * same scene components hand-written values so a composition can be judged
 * before a backend exists; production feeds them THIS, and nothing here may
 * invent, default, smooth, or top up.
 *
 * THE RULE APPLIED THROUGHOUT: ABSENT IS NOT ZERO.
 * Scene props are shaped so that a missing key means "nothing measured this"
 * and renders as unlit structure, while an explicit `0` means "measured, and
 * it was none". Those are different claims and the kit draws them differently.
 * So the maps below OMIT keys rather than writing zeros — which is why they are
 * built by conditional assignment rather than by object literal.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * - It does not attribute events to the three production platforms. They
 *   publish no live signal (P6), so their islands stay unlit. The reference
 *   shows all platforms uniformly healthy; that would be a fabrication.
 * - It does not synthesise per-hop timings. This API times the span, not each
 *   hop, so six of station 04's seven stages have no duration and say so.
 * - It does not give station 06's globe a geolocation. The edge reading names
 *   a PoP, not a latitude; a marker placed from a guessed coordinate would be
 *   an invented fact rendered in 3D.
 */
import { useMemo } from 'react';
import { useWorld } from '../state/store.ts';
import type { ConduitPacket } from '../kit/Conduit.tsx';
import type { StationId } from '../kit/stations.ts';

export type StationData = {
  /** Real measured edge round trip, or null. */
  edgeRttMs: number | null;
  edgePop: string | null;
  /** Real count of events received this session. */
  eventCount: number;
  /** Real count of refusals this session. */
  deniedCount: number;
  /** Slowest real measured span this session, or null if none was measured. */
  slowestSpanMs: number | null;
  /** Per-architecture-layer activity. Keys absent where nothing is attributed. */
  activityByLayer: Record<string, number>;
  /** Per-estate-node activity. Only the demo plane can ever appear here. */
  activityByIsland: Record<string, number>;
  /** Per-lab-zone activity, for the backend-dependent zones only. */
  activityByZone: Record<string, number>;
  /** Per-hop durations for station 04. `null` means the hop was not timed. */
  hopMs: Record<string, number | null>;
  lastOutcomeDenied: boolean;
  /** Real packets in flight, converted to the kit's shape. */
  packets: ConduitPacket[];
  /** Real p95 frame time from the quality governor, or null before a window. */
  frameMs: number | null;
  /** Real trend series for sparklines. Empty draws no line at all. */
  eventSeries: number[];
  tenantRef: string | null;
  tenantExpiresAt: string | null;
  source: 'live' | 'replay' | 'unknown';
  visited: StationId[];
  openDrawer: string | null;
  /** The most recent real audit row, for the trace panels. */
  trace: {
    action: string;
    outcome: 'allowed' | 'denied' | 'error';
    durationMs: number | null;
    traceId: string | null;
    occurredAt: string;
  } | null;
  recentEvents: Array<{ id: string; action: string; outcome: string; at: string }>;
};

/**
 * Which architecture layer an audit action belongs to.
 *
 * Deliberately partial: an action this table does not recognise attributes to
 * nothing rather than to a default layer, so an unfamiliar event cannot light
 * a layer it never touched.
 */
function layerFor(action: string): string | null {
  if (action.startsWith('tenant.')) return 'gateway';
  if (action.startsWith('records.') || action.startsWith('isolation.')) return 'services';
  if (action.startsWith('payments.') || action.startsWith('fraud.')) return 'services';
  if (action.startsWith('ai.')) return 'services';
  if (action.startsWith('audit.')) return 'observability';
  return null;
}

/** Lab zones that depend on the backend. The renderer zones never appear here. */
function zoneFor(action: string): string | null {
  if (action.startsWith('ai.')) return 'routing';
  if (action.includes('limit') || action.includes('throttle')) return 'load';
  return null;
}

const HOP_IDS = ['client', 'edge', 'gateway', 'service', 'cache', 'db', 'response'] as const;

export function useStationData(): StationData {
  const edge = useWorld((s) => s.edge);
  const log = useWorld((s) => s.log);
  const packets = useWorld((s) => s.packets);
  const tenant = useWorld((s) => s.tenant);
  const source = useWorld((s) => s.source);
  const frame = useWorld((s) => s.frame);
  const visited = useWorld((s) => s.visited);

  return useMemo(() => {
    const activityByLayer: Record<string, number> = {};
    const activityByIsland: Record<string, number> = {};
    const activityByZone: Record<string, number> = {};
    let deniedCount = 0;
    let slowest: number | null = null;

    for (const event of log) {
      const layer = layerFor(event.action);
      if (layer) activityByLayer[layer] = (activityByLayer[layer] ?? 0) + 1;

      const zone = zoneFor(event.action);
      if (zone) activityByZone[zone] = (activityByZone[zone] ?? 0) + 1;

      /*
       * Every event on this wire belongs to the demo plane — it is the only
       * node with a live signal. The three production platforms are never
       * incremented here, so their islands stay unlit, which is the true state
       * rather than the reference's uniformly healthy row.
       */
      activityByIsland['demo'] = (activityByIsland['demo'] ?? 0) + 1;

      if (event.outcome === 'denied') deniedCount += 1;
      if (event.durationMs !== null && (slowest === null || event.durationMs > slowest)) {
        slowest = event.durationMs;
      }
    }

    const newest = log[0] ?? null;

    /*
     * Station 04's hops. Only `service` and `db` can ever carry a number,
     * because they are the only stages this API measures — and `service` only
     * when the span itself was timed. Everything else is explicitly null.
     */
    const hopMs: Record<string, number | null> = {};
    for (const id of HOP_IDS) hopMs[id] = null;
    if (newest && newest.durationMs !== null) hopMs['service'] = newest.durationMs;

    /*
     * The event series for sparklines: a running count per log entry, oldest
     * first. With no events it is EMPTY, and the sparkline draws nothing —
     * not a flat line at zero, which would be a measurement of stillness
     * rather than an absence of measurement.
     */
    const eventSeries =
      log.length === 0
        ? []
        : log
            .slice(0, 24)
            .reverse()
            .map((_, i) => i + 1);

    const kitPackets: ConduitPacket[] = packets.map((packet) => ({
      id: packet.id,
      // Preserved exactly: `unmeasured` packets carry null and the conduit
      // draws no bead for them at all.
      durationMs: packet.unmeasured ? null : packet.durationMs,
      outcome: packet.outcome,
      startedAt: packet.bornAt / 1000,
    }));

    const mode: StationData['source'] =
      source.mode === 'live' ? 'live' : source.mode === 'replay' ? 'replay' : 'unknown';

    return {
      edgeRttMs: edge?.rttMs ?? null,
      edgePop: edge?.pop ?? null,
      eventCount: log.length,
      deniedCount,
      slowestSpanMs: slowest,
      activityByLayer,
      activityByIsland,
      activityByZone,
      hopMs,
      lastOutcomeDenied: newest?.outcome === 'denied',
      packets: kitPackets,
      // Null until the governor has closed a window. Never a guessed 16.7.
      frameMs: frame.p95 > 0 ? frame.p95 : null,
      eventSeries,
      tenantRef: tenant?.publicRef ?? null,
      tenantExpiresAt: tenant?.expiresAt ?? null,
      source: mode,
      visited,
      openDrawer: null,
      trace: newest
        ? {
            action: newest.action,
            outcome: newest.outcome,
            durationMs: newest.durationMs,
            traceId: newest.traceId,
            occurredAt: newest.occurredAt,
          }
        : null,
      recentEvents: log.slice(0, 6).map((event) => ({
        id: event.id,
        action: event.action,
        outcome: event.outcome,
        at: new Date(event.occurredAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    };
  }, [edge, log, packets, tenant, source, frame, visited]);
}
