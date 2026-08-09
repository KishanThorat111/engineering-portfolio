/**
 * API process entrypoint.
 *
 * Started as `node --import ./dist/telemetry/register.js dist/index.js` so the
 * OpenTelemetry SDK is running before any instrumented module is resolved. See
 * telemetry/register.ts for why an import statement here would not do.
 */
import { buildServer } from './server.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';
import { closeRedis } from './redis/client.js';

const app = await buildServer();

/*
 * Graceful shutdown. Compose sends SIGTERM on `down` and on a rolling deploy;
 * finishing in-flight requests before closing the pool is what makes a release
 * invisible to whoever is mid-attack on the demo at the time.
 */
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'shutting down');
    void app
      .close()
      .then(() => Promise.allSettled([closePool(), closeRedis()]))
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error({ err: error }, 'failed to start');
  process.exit(1);
}
