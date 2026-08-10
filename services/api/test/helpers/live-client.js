/**
 * A minimal live-plane client for the tests.
 *
 * Speaks the real protocol over a real WebSocket to a real listening server —
 * `app.inject()` cannot upgrade a connection, so these tests bind a port. That
 * is the point: the definition of done is two independent clients seeing each
 * other's events, and two in-process fakes sharing a bus would prove nothing
 * about the transport.
 */
import { WebSocket } from 'ws';

export class LiveClient {
  constructor(url) {
    this.url = url;
    this.messages = [];
    this.socket = null;
  }

  static async connect(baseUrl, apiKey) {
    const url = apiKey
      ? `${baseUrl}/v1/live?key=${encodeURIComponent(apiKey)}`
      : `${baseUrl}/v1/live`;
    const client = new LiveClient(url);
    await client.#open();
    return client;
  }

  #open() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url);
      const fail = (error) => reject(error instanceof Error ? error : new Error(String(error)));
      this.socket.on('error', fail);
      this.socket.on('message', (raw) => {
        try {
          this.messages.push(JSON.parse(raw.toString('utf8')));
        } catch {
          this.messages.push({ type: 'unparseable', raw: raw.toString('utf8') });
        }
      });
      this.socket.on('open', () => {
        this.socket.off('error', fail);
        this.socket.on('error', () => {});
        resolve();
      });
      this.socket.on('close', (code) => {
        this.closeCode = code;
      });
    });
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  /** Wait for the first message matching `predicate`, or throw on timeout. */
  async waitFor(predicate, { timeoutMs = 5_000, label = 'message' } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = this.messages.find(predicate);
      if (found) return found;
      if (Date.now() > deadline) {
        throw new Error(
          `timed out waiting for ${label}. Received: ` +
            JSON.stringify(this.messages.map((m) => m.type ?? '?')),
        );
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  of(type) {
    return this.messages.filter((m) => m.type === type);
  }

  async close() {
    if (!this.socket) return;
    await new Promise((resolve) => {
      if (this.socket.readyState === WebSocket.CLOSED) return resolve();
      this.socket.once('close', resolve);
      this.socket.close();
      setTimeout(resolve, 1_000);
    });
  }
}
