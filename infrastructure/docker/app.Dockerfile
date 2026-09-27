# syntax=docker/dockerfile:1
#
# The TFM-BIC production image (M17, ADR-028): one image, one process — the API, which also serves
# the built SPA from the same origin. Build from the repository root:
#
#   docker build -f infrastructure/docker/app.Dockerfile \
#     --build-arg APP_VERSION="0.1.0+$(git rev-parse --short=12 HEAD)" \
#     --build-arg GIT_COMMIT="$(git rev-parse HEAD)" \
#     -t tfm-bic:<git-sha> .
#
# No secret is passed at build time or stored in any layer: every credential is injected at run time
# by the platform (docs/production/M17-SECRETS-MANAGEMENT.md). The image defaults to
# NODE_ENV=production, whose configuration guards refuse fake providers and development settings.
#
# Base image: an explicit Node 24 patch release on Debian bookworm-slim — never `latest` or a
# floating major. Upgrade deliberately (docs/production/M17-PRODUCTION-RUNBOOK.md, "Base image").
ARG NODE_IMAGE=node:24.19.0-bookworm-slim

# ---------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /repo
ENV CI=true \
    HUSKY=0
RUN corepack enable pnpm

# The whole workspace (minus .dockerignore) — every package.json is needed to install it.
COPY . .

# Lockfile-exact install; fails instead of updating pnpm-lock.yaml.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Content is validated with the same loader the API runs at start-up, then both apps are built.
RUN pnpm content:validate \
 && pnpm --filter @tfm-bic/web build \
 && pnpm --filter @tfm-bic/api build

# Assemble exactly what the runtime needs:
#   dist/        the bundled API and migration runner (plain JavaScript)
#   web/         the built SPA
#   content/     the course content the API validates and serves
#   migrations/  every context's SQL migrations, in the layout the runner expects
#   node_modules argon2 (native addon) and its dependencies, from the lockfile install, symlinks
#                resolved — nothing else: every other dependency is inside the bundle.
RUN set -eu; \
    mkdir -p /out/migrations; \
    cp -r apps/api/dist /out/dist; \
    cp -r apps/web/dist /out/web; \
    cp -r content /out/content; \
    for dir in packages/data/src/*/db/migrations; do \
      context="$(basename "$(dirname "$(dirname "$dir")")")"; \
      mkdir -p "/out/migrations/$context/db"; \
      cp -r "$dir" "/out/migrations/$context/db/migrations"; \
    done; \
    cp -rL "$(dirname "$(readlink -f apps/api/node_modules/argon2)")" /out/node_modules; \
    printf '{\n  "name": "tfm-bic-runtime",\n  "private": true,\n  "type": "module"\n}\n' > /out/package.json

# ---------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

# No package managers at run time: nothing can be installed or fetched (npx) by the running app.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

ARG APP_VERSION=unknown
ARG GIT_COMMIT=unknown
LABEL org.opencontainers.image.title="tfm-bic" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}"

ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    WEB_DIST_DIR=/app/web \
    CONTENT_DIR=/app/content

WORKDIR /app
# Owned by root and not writable by the app user: the process cannot modify its own code or content.
COPY --from=build /out/ ./

# The unprivileged user shipped with the official Node image (uid 1000).
USER node
EXPOSE 3000

# Liveness only — never the database (that is GET /ready, for the platform's readiness/traffic check).
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# Node is PID 1 and handles SIGTERM/SIGINT itself (graceful shutdown within 8 s, see
# apps/api/src/index.ts). Migrations are a separate, explicit step:
#   docker run --rm <image> node dist/migrate.js --migrations-root /app/migrations
CMD ["node", "--enable-source-maps", "dist/index.js"]
