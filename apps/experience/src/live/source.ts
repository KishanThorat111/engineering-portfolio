/**
 * Where events come from, and the honesty rule around it.
 *
 * A5, binding: the fixtures are not scaffolding. They are the recorded real
 * traces §6.3 replays when the live plane is unreachable, which means they can
 * never rot unnoticed — they are user-visible, so a stale or fabricated fixture
 * is a visible defect rather than a dead file.
 *
 * PRINCIPLE 12 IS THE CONSTRAINT ON THIS FILE. There are exactly two modes and
 * the surface always knows which one it is in. A replay is never presented as
 * live, a disconnection is never smoothed over by quietly switching to the
 * recording, and a quiet live plane is never topped up with recorded events to
 * make the world look busier. When the socket drops mid-session the mode
 * changes visibly and the badge changes with it.
 */
import type { LiveEvent, ServerMessage } from '@contract';

export type SourceMode = 'connecting' | 'live' | 'replay';

export type SourceState = {
  mode: SourceMode;
  /** Honest presence. `measured: false` means unknown, not zero. */
  presence: { connections: number; measured: boolean } | null;
  /** Why we are in replay, when we are. Shown to the visitor verbatim. */
  reason: string | null;
  /** When the recording was captured. Null while live. */
  recordedAt: string | null;
};

export type SourceEvents = {
  onEvent: (event: LiveEvent) => void;
  onState: (state: SourceState) => void;
};

/** A recorded session. Timings are the real intervals, preserved exactly. */
export type Recording = {
  recordedAt: string;
  source: string;
  note: string;
  events: Array<{ offsetMs: number; event: LiveEvent }>;
};

export interface EventSource {
  start(): void;
  stop(): void;
  readonly state: SourceState;
}

/* ------------------------------------------------------------------ */

export class LiveSocketSource implements EventSource {
  #url: string;
  /** Whether the URL carries a credential, and so whether `self` is available. */
  #authenticated: boolean;
  #socket: WebSocket | null = null;
  #handlers: SourceEvents;
  #state: SourceState = { mode: 'connecting', presence: null, reason: null, recordedAt: null };
  #stopped = false;
  #attempts = 0;
  #retry: ReturnType<typeof setTimeout> | null = null;
  #onGiveUp: (reason: string) => void;

  constructor(url: string, handlers: SourceEvents, onGiveUp: (reason: string) => void) {
    this.#url = url;
    this.#authenticated = url.includes('key=');
    this.#handlers = handlers;
    this.#onGiveUp = onGiveUp;
  }

  get state(): SourceState {
    return this.#state;
  }

  #setState(next: Partial<SourceState>): void {
    this.#state = { ...this.#state, ...next };
    this.#handlers.onState(this.#state);
  }

  start(): void {
    if (this.#stopped) return;
    this.#setState({ mode: 'connecting', reason: null });

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.#url);
    } catch {
      this.#giveUpOrRetry('the live plane could not be reached');
      return;
    }
    this.#socket = socket;

    socket.onopen = () => {
      this.#attempts = 0;
      /*
       * BOTH scopes, when there is a credential.
       *
       * `world` alone was right in P4, where the surface had no tenant of its
       * own. In P5 it is a bug: the gateway routes an event to `self` when it
       * belongs to the subscriber and to `world` when it does not, so a
       * world-only subscription silently drops the visitor's OWN events — which
       * is precisely the audit row §2.5 ends on. Caught by the fusion check
       * asserting the refusal comes back over the socket.
       */
      socket.send(JSON.stringify({ type: 'subscribe', scope: 'world' }));
      if (this.#authenticated) {
        socket.send(JSON.stringify({ type: 'subscribe', scope: 'self' }));
      }
    };

    socket.onmessage = (message) => {
      let parsed: ServerMessage;
      try {
        parsed = JSON.parse(String(message.data)) as ServerMessage;
      } catch {
        return;
      }
      switch (parsed.type) {
        case 'hello':
          this.#setState({ mode: 'live', reason: null, recordedAt: null });
          return;
        case 'event':
          this.#handlers.onEvent(parsed.event);
          return;
        case 'presence':
          this.#setState({
            presence: { connections: parsed.connections, measured: parsed.measured },
          });
          return;
        default:
          return;
      }
    };

    socket.onerror = () => {
      /* onclose always follows; handled there so the reason is one path. */
    };

    socket.onclose = () => {
      if (this.#stopped) return;
      this.#socket = null;
      this.#giveUpOrRetry('the connection to the live plane closed');
    };
  }

  /*
   * Three attempts, then fall back and SAY SO.
   *
   * Retrying forever behind a "connecting" badge would leave a visitor watching
   * a permanently empty world with no explanation, which is a lie of omission.
   * Three quick attempts covers a transient blip; beyond that the honest
   * statement is that the plane is down.
   */
  #giveUpOrRetry(reason: string): void {
    this.#attempts += 1;
    if (this.#attempts >= 3) {
      this.#onGiveUp(reason);
      return;
    }
    this.#setState({ mode: 'connecting', reason });
    this.#retry = globalThis.setTimeout(() => this.start(), 1_200 * this.#attempts);
  }

  stop(): void {
    this.#stopped = true;
    if (this.#retry !== null) clearTimeout(this.#retry);
    this.#retry = null;
    const socket = this.#socket;
    this.#socket = null;
    socket?.close();
  }
}

/* ------------------------------------------------------------------ */

/**
 * Replays a recording at the intervals it was captured with.
 *
 * The timings are preserved because motion is measurement (§3.6): a replay that
 * evened out the gaps would be showing invented latencies, and packet speed is
 * supposed to BE latency. The one liberty taken is looping, which is disclosed
 * in the badge rather than hidden — the world does not pretend the recording is
 * an infinite live session.
 */
export class ReplaySource implements EventSource {
  #recording: Recording;
  #handlers: SourceEvents;
  #timers: Array<ReturnType<typeof setTimeout>> = [];
  #stopped = false;
  #state: SourceState;

  constructor(recording: Recording, reason: string, handlers: SourceEvents) {
    this.#recording = recording;
    this.#handlers = handlers;
    this.#state = {
      mode: 'replay',
      presence: null,
      reason,
      recordedAt: recording.recordedAt,
    };
  }

  get state(): SourceState {
    return this.#state;
  }

  start(): void {
    this.#handlers.onState(this.#state);
    this.#scheduleCycle(0);
  }

  #scheduleCycle(baseDelay: number): void {
    if (this.#stopped) return;
    const events = this.#recording.events;
    if (events.length === 0) return;

    const last = events[events.length - 1];
    const span = last ? last.offsetMs : 0;

    for (const entry of events) {
      const timer = globalThis.setTimeout(() => {
        if (this.#stopped) return;
        /*
         * occurredAt and publishedAt are rewritten to now, and this is the one
         * place the surface adjusts a recorded number. The alternative is worse:
         * a timestamp from last Tuesday would make every "how long ago" reading
         * in the document absurd. The INTERVALS — which are what motion draws
         * from — are untouched, and the badge says this is a recording, so
         * nothing here claims the events are happening now.
         */
        const at = new Date().toISOString();
        this.#handlers.onEvent({ ...entry.event, occurredAt: at, publishedAt: at });
      }, baseDelay + entry.offsetMs);
      this.#timers.push(timer);
    }

    const loop = globalThis.setTimeout(() => this.#scheduleCycle(0), baseDelay + span + 4_000);
    this.#timers.push(loop);
  }

  stop(): void {
    this.#stopped = true;
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers = [];
  }
}
