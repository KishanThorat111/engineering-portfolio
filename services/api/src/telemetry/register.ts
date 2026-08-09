/**
 * OpenTelemetry, started before anything else in the process.
 *
 * WHY THIS IS A SEPARATE FILE LOADED WITH --import
 * Auto-instrumentation works by patching modules as they are required. Anything
 * imported before the SDK starts is already resolved and never gets patched, so
 * a `pg` import at the top of index.ts would produce a process that emits HTTP
 * spans and no database spans — and the gap would look like "the query was
 * fast" rather than "the query was never measured". `node --import
 * ./dist/telemetry/register.js` guarantees ordering that an import statement
 * cannot.
 *
 * The spans this produces are real. P5 renders them, and a rendered span that
 * was manufactured to look good would be exactly the decoration the dossier's
 * §1.3 corollary rules out. Nothing here fabricates a span, pads a duration, or
 * emits an event for something that did not happen.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions/incubating';

const enabled = process.env['OTEL_ENABLED'] !== 'false';
const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

if (enabled && endpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env['OTEL_SERVICE_NAME'] ?? 'control-plane-api',
      [ATTR_SERVICE_VERSION]: process.env['APP_VERSION'] ?? '0.0.0-dev',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env['NODE_ENV'] ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Noise with no consumer: the filesystem is not part of any story the
        // experience tells, and its spans would bury the ones that are.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    void sdk.shutdown().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
