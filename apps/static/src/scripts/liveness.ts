/**
 * ONE MEASUREMENT, EVERY INSTRUMENT.
 *
 * The stations show liveness in four places — the rail's status pill, station
 * 01's stat strip, its request trace, and station 06's control room. Before
 * this, each would have fetched `/health` for itself: four requests for one
 * fact, four chances to disagree, and a page that could show LIVE in the rail
 * and a dash in the strip at the same instant. Honesty rule 10 is about the
 * machine and human layers, but the principle underneath it is the one that
 * matters here — two readouts of the same fact must not be able to disagree.
 *
 * So the measurement happens once, and its result is written to `<html>` as
 * `data-liveness`. Every instrument reads that one attribute and its own
 * `data-live-*` hooks. Adding a fifth readout costs no request.
 *
 * WHAT IS MEASURED, PRECISELY
 * `performance.now()` either side of `fetch('/health')`, no cache. That is the
 * visitor's own round trip to this origin — DNS and TLS already warm, so it is
 * the request time and not the connection time. It is stated that way in the
 * caption rather than being called "latency", which would imply a server-side
 * figure this site does not publish.
 *
 * WHAT HAPPENS WHEN IT FAILS, WHICH TODAY IT DOES
 * The control plane is behind a Cloudflare tunnel that is currently down, so
 * `/health` returns 530. Every instrument then reads `down`: the pill says the
 * plane is not answering, the strip keeps its em dashes, and the trace says it
 * was never measured. Nothing shows a stale value, a cached value or a zero.
 * Rule 12 — liveness is never faked, and degraded says so on the same
 * instrument that would have said LIVE.
 *
 * NO-JS IS A FIRST-CLASS STATE, NOT A FALLBACK
 * Everything this file touches is rendered complete by the server first: the
 * dashes, the idle trace dots and the caption that says nothing has been
 * measured. With scripting off the page states exactly what it knows, which is
 * that it has not asked. That is a true page, not a degraded one.
 */

/*
 * RECORDED BY DESIGN (S17). No control plane runs behind this site: the GCP
 * VM is gone by decision and /live/ replays recorded runs of the real system,
 * re-verified by CI on every push. Probing /health on every visit then only
 * ever produced "offline — checked just now", which read as the experience
 * being broken when it is not. So unless the build opts in with
 * PUBLIC_LIVE_BACKEND=on, nothing is requested and every instrument states the
 * designed state instead: recorded. The round trip stays a dash — there is no
 * measurement, so no figure — and the live probe below is kept, unchanged, for
 * a deployment that has a control plane again.
 */
type Liveness = 'live' | 'down' | 'recorded';

const backendConfigured = (): boolean =>
  (import.meta.env as Record<string, string | undefined>)['PUBLIC_LIVE_BACKEND'] === 'on';

/** Fill every readout bound to one key. */
function fill(key: string, text: string): void {
  for (const node of document.querySelectorAll<HTMLElement>(`[data-live-value="${key}"]`)) {
    node.textContent = text;
  }
}

function setState(state: Liveness): void {
  document.documentElement.dataset['liveness'] = state;
  for (const trace of document.querySelectorAll<HTMLElement>('[data-trace]')) {
    trace.dataset['state'] = state;
  }
}

/** One honest measurement: the full round trip, as this browser saw it. */
async function sample(): Promise<number> {
  const started = performance.now();
  const response = await fetch('/health', { cache: 'no-store' });
  const rtt = Math.round(performance.now() - started);
  if (!response.ok) throw new Error(`health ${response.status}`);
  return rtt;
}

function recorded(): void {
  setState('recorded');
  fill('state', 'recorded');
  fill('state-line', 'Engineering experience — recorded · verified by CI');
  /*
   * Everything else a recorded instrument says is written into the page as
   * `data-recorded-value` — the demonstration count read from the recording at
   * build time, the trace's total and caption — so it is in the markup, not in
   * this script, which has to stay small enough to be inlined.
   */
  for (const node of document.querySelectorAll<HTMLElement>('[data-recorded-value]')) {
    node.textContent = node.dataset['recordedValue'] ?? node.textContent;
  }
}

export function initLiveness(): void {
  if (!backendConfigured()) {
    recorded();
    return;
  }
  void (async () => {
    try {
      const rtt = await sample();

      setState('live');
      fill('rtt', String(rtt));
      /*
       * TWO KEYS FOR ONE FACT, because two instruments need two lengths.
       * The stat strip column is a figure slot and must stay one short line;
       * the status line above it is a sentence. Binding both to one key made
       * "Control plane — not answering" wrap inside a 34px numeral slot and
       * shove the strip two lines taller.
       */
      fill('state', 'live');
      fill('state-line', 'Live system — responding');
      for (const node of document.querySelectorAll<HTMLElement>('[data-trace-total]')) {
        node.textContent = `${rtt}ms`;
      }
      // The trace pulse runs at this speed, scaled ×25 so it can be seen.
      for (const trace of document.querySelectorAll<HTMLElement>('[data-trace]')) {
        trace.style.setProperty('--trace-ms', String(rtt));
      }
      for (const node of document.querySelectorAll<HTMLElement>('[data-trace-caption]')) {
        node.textContent =
          `Your browser completed this request in ${rtt}ms. ` +
          `The light that crossed the rail took 25 times that, so it could be seen. ` +
          `Per-hop timings are not shown because they are not measured — this is one ` +
          `round trip, end to end, and you can reproduce it in your own devtools.`;
      }

      /*
       * The demonstration count comes from the API's own registry — the same
       * one the live surface reads — rather than from a number typed here.
       * A failure to read it leaves the dash rather than substituting the
       * count this repository happens to believe.
       */
      try {
        const response = await fetch('/v1/demonstrations', { cache: 'no-store' });
        if (response.ok) {
          const body = (await response.json()) as { demonstrations?: unknown[] };
          if (Array.isArray(body.demonstrations)) fill('demos', String(body.demonstrations.length));
        }
      } catch {
        /* Left as the dash. An unread count is unread, not zero. */
      }
    } catch {
      /*
       * OFFLINE, SAID ONCE AND PLAINLY. It read "no answer" in alarm red in
       * seven places, which a visitor took for the page being broken. The
       * state is the same and still stated on every instrument that would
       * have shown a reading — one calm word, in the register's "cannot reach
       * it" amber, and a sentence saying when it was checked.
       */
      setState('down');
      fill('state', 'offline');
      fill('state-line', 'Live system offline — checked just now');
      for (const node of document.querySelectorAll<HTMLElement>('[data-trace-total]')) {
        node.textContent = 'offline';
      }
      for (const node of document.querySelectorAll<HTMLElement>('[data-trace-caption]')) {
        node.textContent =
          'The live system is offline right now, so nothing on this panel is a ' +
          'measurement. Your browser checks it on every visit, and no figure from an ' +
          'earlier visit is ever shown in its place.';
      }
    }
  })();
}
