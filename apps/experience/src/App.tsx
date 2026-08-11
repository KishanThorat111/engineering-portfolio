/**
 * The surface: one canvas, one document, one event source.
 *
 * The source decision is the honest one and it lives here so it is easy to
 * audit: try the live plane, and if it cannot be reached after three attempts,
 * fall back to the RECORDED REAL TRACES and say so in the badge. There is no
 * third path. A quiet live plane is left quiet rather than topped up from the
 * recording, because §6.3 and principle 12 both turn on the visitor always
 * knowing which one they are looking at.
 */
import { useEffect, useRef, useState } from 'react';
import { Scene } from './render/Scene.tsx';
import { LiveDocument } from './ui/Document.tsx';
import { COPY } from './content/copy.ts';
import { useWorld } from './state/store.ts';
import { LiveSocketSource, ReplaySource, type EventSource } from './live/source.ts';
import { RECORDING } from './live/recording.ts';

/**
 * Where the live plane is.
 *
 * Same-origin by default so the deployed surface needs no configuration and no
 * CORS. `VITE_LIVE_URL` overrides it for local development against the Compose
 * stack, which is the only case where the two are not on one host.
 */
function liveUrl(): string {
  const configured = import.meta.env['VITE_LIVE_URL'] as string | undefined;
  if (configured) return configured;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/v1/live`;
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
  const sourceRef = useRef<EventSource | null>(null);
  const webgl = useWebglSupport();

  /*
   * prefers-reduced-motion, watched rather than read once.
   *
   * The dossier is explicit that reduced motion is invisible to every gate and
   * must be verified by execution (§11). Subscribing to the query means a
   * visitor who changes the OS setting mid-session gets the change immediately,
   * which is the behaviour the setting is supposed to have.
   */
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [setReducedMotion]);

  useEffect(() => {
    setWebglAvailable(webgl);
  }, [webgl, setWebglAvailable]);

  useEffect(() => {
    const handlers = { onEvent: ingest, onState: setSource };

    const startReplay = (reason: string) => {
      sourceRef.current?.stop();
      const replay = new ReplaySource(RECORDING, reason, handlers);
      sourceRef.current = replay;
      replay.start();
    };

    const live = new LiveSocketSource(liveUrl(), handlers, startReplay);
    sourceRef.current = live;
    live.start();

    return () => {
      sourceRef.current?.stop();
      sourceRef.current = null;
    };
  }, [ingest, setSource]);

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
      <LiveDocument />
    </div>
  );
}
