/**
 * The surface: one canvas, one document, one event source, one tenant.
 *
 * THE FUSION RULE (§13, P5): every visual state traces to a real backend event.
 * So the order here is not cosmetic — the world does nothing until the control
 * plane has actually answered, and when it cannot, the surface says so and
 * replays recorded real traces rather than filling the silence.
 *
 * The source decision is unchanged from P4 and still the honest one: try live,
 * and after three failed attempts fall back to the recording behind a badge
 * that says what it is. A quiet live plane is left quiet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Scene } from './render/Scene.tsx';
import { LiveDocument } from './ui/Document.tsx';
import { Arrival } from './ui/Arrival.tsx';
import { Stations } from './ui/Stations.tsx';
import { Estate } from './ui/Estate.tsx';
import { COPY } from './content/copy.ts';
import { useWorld } from './state/store.ts';
import { LiveSocketSource, ReplaySource, type EventSource } from './live/source.ts';
import { RECORDING } from './live/recording.ts';
import * as api from './live/api.ts';
import { clearSession, loadSession, markColdOpenPlayed, saveSession } from './state/session.ts';
import { breakOutTimeline, coldOpenTimeline } from './beats/choreography.ts';
import { currentRoute } from './router.ts';
import { StatusBar } from './ui/StatusBar.tsx';

function liveUrl(key: string | null): string {
  // Runtime override first, for the same reason apiBase() has one: the harness
  // points a production build at a local control plane without rebuilding it.
  const runtime = (globalThis as { __LIVE_URL__?: string }).__LIVE_URL__;
  const configured = runtime ?? (import.meta.env['VITE_LIVE_URL'] as string | undefined);
  const base =
    configured ?? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/v1/live`;
  /*
   * The socket authenticates from the credential, exactly as every HTTP route
   * does. A browser cannot set headers on a handshake, so the key travels as a
   * query parameter — a knowing trade-off recorded in the gateway, bounded by
   * the keys being short-lived and scoped to a plane with nothing real behind
   * it.
   */
  return key ? `${base}${base.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}` : base;
}

function useWebglSupport(): boolean {
  const [supported] = useState(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(
        canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
      );
    } catch {
      return false;
    }
  });
  return supported;
}

export function App() {
  const ingest = useWorld((s) => s.ingest);
  const setSource = useWorld((s) => s.setSource);
  const setReducedMotion = useWorld((s) => s.setReducedMotion);
  const setWebglAvailable = useWorld((s) => s.setWebglAvailable);
  const setEdge = useWorld((s) => s.setEdge);
  const setAssembly = useWorld((s) => s.setAssembly);
  const setTenant = useWorld((s) => s.setTenant);
  const setProvisionError = useWorld((s) => s.setProvisionError);
  const setBreakOut = useWorld((s) => s.setBreakOut);
  const setBeat = useWorld((s) => s.setBeat);
  const setStation = useWorld((s) => s.setStation);

  const reducedMotion = useWorld((s) => s.reducedMotion);
  const tenant = useWorld((s) => s.tenant);
  const breakOutTrigger = useWorld((s) => s.breakOutTrigger);

  const sourceRef = useRef<EventSource | null>(null);
  const webgl = useWebglSupport();

  /* --- reduced motion, watched rather than read once ------------------ */
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [setReducedMotion]);

  useEffect(() => setWebglAvailable(webgl), [webgl, setWebglAvailable]);

  /* --- stations are real URLs (§2.9) ---------------------------------- */
  useEffect(() => {
    const apply = () => setStation(currentRoute().station);
    apply();
    addEventListener('popstate', apply);
    return () => removeEventListener('popstate', apply);
  }, [setStation]);

  const startColdOpen = useCallback(
    (rttMs: number, alreadyPlayed: boolean): (() => void) | undefined => {
      if (alreadyPlayed) {
        // §2.9: the cold open plays once per visitor. A returning visitor lands
        // in the world already assembled rather than sitting through it again.
        setAssembly(1);
        setBeat('recognition');
        return undefined;
      }
      const timeline = coldOpenTimeline(setAssembly, {
        rttMs,
        reducedMotion,
        onComplete: () => {
          setBeat('recognition');
          markColdOpenPlayed();
        },
      });
      return () => timeline.kill();
    },
    [reducedMotion, setAssembly, setBeat],
  );

  /* --- the real lifecycle --------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    let stopColdOpen: (() => void) | undefined;

    const handlers = { onEvent: ingest, onState: setSource };

    const startReplay = (reason: string) => {
      sourceRef.current?.stop();
      const replay = new ReplaySource(RECORDING, reason, handlers);
      sourceRef.current = replay;
      replay.start();
    };

    const connect = (key: string | null) => {
      sourceRef.current?.stop();
      const live = new LiveSocketSource(liveUrl(key), handlers, startReplay);
      sourceRef.current = live;
      live.start();
    };

    void (async () => {
      // A6: the edge answers first, and it answers without the VM.
      const edge = await api.readEdge();
      if (cancelled) return;
      setEdge(edge);

      const existing = loadSession();
      stopColdOpen = startColdOpen(edge.rttMs, existing?.coldOpenPlayed === true);

      if (existing) {
        setTenant({
          orgId: existing.orgId,
          publicRef: existing.publicRef,
          apiKey: existing.apiKey,
          expiresAt: existing.expiresAt,
          /*
           * null, not 0. The stored session never carried a count, and this
           * used to hardcode a zero — so a returning visitor was told "0 rows
           * seeded" about a tenant that had eight. That is a placeholder
           * standing in for an unknown, which rule 4 forbids outright, and it
           * made a working system look empty. The real number arrives from
           * `me()` below; until it does, the line says nothing rather than
           * something false.
           */
          seededRecords: null,
        });
        setBeat('ownership');
        connect(existing.apiKey);
        // Confirm it still exists rather than trusting local storage: a tenant
        // can be purged between visits and a stale key would produce a world
        // full of 410s with no explanation.
        try {
          const self = await api.me(existing.apiKey);
          if (!cancelled) {
            setTenant({
              orgId: existing.orgId,
              publicRef: existing.publicRef,
              apiKey: existing.apiKey,
              expiresAt: self.tenant.expiresAt,
              seededRecords: self.records,
            });
          }
        } catch {
          clearSession();
          if (!cancelled) setTenant(null);
        }
        return;
      }

      try {
        const provisioned = await api.provision('visitor');
        if (cancelled) return;
        saveSession({
          apiKey: provisioned.credential.apiKey,
          publicRef: provisioned.tenant.publicRef,
          orgId: provisioned.tenant.id,
          expiresAt: provisioned.tenant.expiresAt,
          coldOpenPlayed: false,
        });
        setTenant({
          orgId: provisioned.tenant.id,
          publicRef: provisioned.tenant.publicRef,
          apiKey: provisioned.credential.apiKey,
          expiresAt: provisioned.tenant.expiresAt,
          seededRecords: provisioned.seededRecords,
        });
        setBeat('ownership');
        connect(provisioned.credential.apiKey);
      } catch (error) {
        if (cancelled) return;
        /*
         * Provisioning genuinely failed. Say so, and watch the world without a
         * tenant — the socket still carries other tenants' events, and if it
         * cannot connect either, the replay takes over and says THAT instead.
         * At no point does the surface manufacture a tenant to keep the
         * stations usable.
         */
        setProvisionError((error as Error).message);
        connect(null);
      }
    })();

    return () => {
      cancelled = true;
      stopColdOpen?.();
      sourceRef.current?.stop();
      sourceRef.current = null;
    };
  }, [ingest, setSource, setEdge, setTenant, setProvisionError, setBeat, startColdOpen]);

  /* --- the locked break-out choreography (§2.5) ----------------------- */
  useEffect(() => {
    if (breakOutTrigger === 0) return undefined;
    setBeat('confrontation');
    const timeline = breakOutTimeline(setBreakOut, {
      reducedMotion,
      onComplete: () => setBeat('recognition'),
    });
    // Braced so the cleanup returns void. `() => timeline.kill()` returns the
    // timeline, which React's EffectCallback type rightly refuses.
    return () => {
      timeline.kill();
    };
  }, [breakOutTrigger, reducedMotion, setBreakOut, setBeat]);

  return (
    <div className="surface">
      <a className="skip-link" href="#document">
        {COPY.actions.skipToDocument}
      </a>
      {webgl ? (
        <div className="scene-layer" aria-hidden="true">
          <Scene />
        </div>
      ) : null}
      {/*
        The status bar sits above the document and stays there. It states what
        the page already knew — source, tenant, expiry, connections — in the
        place a control room states it, so a visitor learns what this is without
        reading a panel to find out.
      */}
      <StatusBar />
      <main className="document" id="document">
        <Arrival />
        {tenant ? <Stations apiKey={tenant.apiKey} /> : null}
        <LiveDocument />
        {/* §2.8: the record comes AFTER operating the system, deliberately. */}
        <Estate />
      </main>
    </div>
  );
}
