# ADR-028: Production runtime, artifact and deployment design

Status: ACCEPTED (runtime, artifact, migrations, guards) — hosting provider still PENDING (ADR-015)
Date: 2026-09-27

## Context

M17 had to make the application deployable without choosing a hosting provider (ADR-015 PENDING).
The repository had no production artifact (`tsx` at runtime, workspace packages exported TypeScript),
no way to serve the SPA and API from the one origin the session cookie requires, a readiness probe
that always said yes, ten hand-run migration commands, and nothing stopping production from running
with fake providers.

## Decision

1. **One image, one process.** The API serves the built SPA itself (`WEB_DIST_DIR`), in memory,
   one explicit route per file, with the SPA's security headers. Chosen by the user over nginx +
   API (two containers) for portability across Docker hosts. No new dependency (`@fastify/static`
   not needed for a three-file build).
2. **Compiled artifact.** `apps/api/build.mjs` bundles API and migration runner with esbuild;
   `argon2` stays external. The PGlite test composition is replaced by a refusing stub, and the
   build fails if any test-only package reaches the bundle.
3. **Image.** `infrastructure/docker/app.Dockerfile`: pinned `node:24.19.0-bookworm-slim`,
   multi-stage, lockfile-exact, no package managers at runtime, non-root, root-owned code,
   `NODE_ENV=production` by default, no build-time secrets. Tagged by commit (12 hex), never `latest`.
4. **Migrations are a deployment step**, not start-up: one runner, fixed order, advisory lock,
   `lock_timeout`, run with a separate migrator role before the new version starts. Migrations must
   be backward compatible with the previous version (expand/contract).
5. **Fail fast in production** on fake providers, loopback URLs, a database URL without TLS, or a
   missing SPA build. Staging may use fakes. Audio and video gain a `disabled` mode (503) — the only
   way production runs without them; email has no such mode (authentication needs it).
6. **Liveness vs readiness:** `/health` never touches dependencies; `/ready` is the database only.
7. **Single-instance recreate** deployment; build once and promote the same image.

## Options considered

- nginx serving `dist/` in front of the API — rejected by the user (two processes/containers).
- Separate static host for the SPA (incl. GitHub Pages) — breaks the one-origin cookie/CSRF design;
  GitHub Pages cannot send the required headers and its terms exclude this use.
- Running `tsx` or `tsc` output in production — dev tool at runtime / unresolvable TS imports.
- Migrations at application start — every replica would race; rejected.

## Consequences

- Production **cannot start** until a real email adapter exists (deliberate, blocker B-2).
- In-memory state keeps the deployment single-instance.
- Every release has a short outage (recreate); no zero-downtime claim.
- Hosting-specific stages (deploy, staging smoke, production approval) are added when ADR-015 is decided.

## References

- [M17 production audit](../production/M17-PRODUCTION-AUDIT.md)
- [Deployment architecture](../production/M17-DEPLOYMENT-ARCHITECTURE.md)
- [Hosting options](../production/M17-HOSTING-OPTIONS.md)
