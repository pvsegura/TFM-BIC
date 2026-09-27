# infrastructure/docker

Container definitions for `apps/web`, `apps/api`, and local dev dependencies.

## `docker-compose.yml` (M3)

Local-only Postgres 17 for `pnpm --filter @tfm-bic/api dev` — see
[ADR-005](../../docs/adr/adr-005-database.md). Not used by automated tests (those run against an
in-process PGlite instance) and not the production architecture (production targets Neon, a
remote managed Postgres — account provisioning is a deployment-time action, out of M3 scope).

```
cd infrastructure/docker && docker compose up -d
```

Default local connection string: `postgres://tfm_bic:tfm_bic_dev_only@localhost:5432/tfm_bic`
(dev-only credentials, not used anywhere else — set your own `DATABASE_URL` in `.env`). The port is
published on `127.0.0.1` only (M16), so the committed dev password is not reachable from the local network.

## `app.Dockerfile` (M17)

The production image: one process (the API) that also serves the built SPA ([ADR-028](../../docs/adr/adr-028-production-runtime-and-deployment.md)).
Build from the repository root; validate with `validate-image.sh <image> [version]`. See the
[runbook](../../docs/production/M17-PRODUCTION-RUNBOOK.md).
