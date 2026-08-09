# Multi-stage: the shipped image carries no compiler, no dev dependencies, and
# no source. One image serves both the API and the worker — they differ only by
# command, so they cannot drift apart in dependency versions or in build date.

FROM node:24-bookworm-slim AS build
WORKDIR /build

# Copy manifests first so the dependency layer is cached independently of source
# changes. The root manifest and lockfile come along because this is an npm
# workspace and `npm ci` resolves the whole tree.
COPY package.json package-lock.json ./
COPY services/api/package.json services/api/
RUN npm ci --workspace @portfolio/api --include-workspace-root

COPY services/api/tsconfig.json services/api/
COPY services/api/scripts services/api/scripts
COPY services/api/src services/api/src
RUN npm run build --workspace @portfolio/api

# Re-resolve with production dependencies only, into a clean tree.
RUN npm ci --workspace @portfolio/api --include-workspace-root --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Drop root. The container is on a public attack surface by design; a process
# that does not need root should not have it available to a bug.
RUN useradd --system --uid 10001 --create-home --shell /usr/sbin/nologin apiuser

COPY --from=build --chown=apiuser:apiuser /build/node_modules ./node_modules
COPY --from=build --chown=apiuser:apiuser /build/services/api/node_modules ./services/api/node_modules
COPY --from=build --chown=apiuser:apiuser /build/services/api/dist ./services/api/dist
COPY --from=build --chown=apiuser:apiuser /build/services/api/package.json ./services/api/package.json
COPY --from=build --chown=apiuser:apiuser /build/package.json ./package.json

USER apiuser
WORKDIR /app/services/api

# Build metadata, surfaced by /health so a deployed version is identifiable
# without shelling into the box.
ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=${APP_VERSION}

EXPOSE 8080

# Liveness only — never readiness. A healthcheck that tested the database would
# restart the API every time Postgres hiccupped, turning a recoverable blip into
# a crash loop.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--import", "./dist/telemetry/register.js", "dist/index.js"]
