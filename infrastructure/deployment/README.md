# infrastructure/deployment

Provider-independent deployment tooling (M17). The hosting target itself is PENDING
([ADR-015](../../docs/adr/adr-015-deployment.md), [options](../../docs/production/M17-HOSTING-OPTIONS.md)).

- `smoke-test.mjs` — post-deployment checks (SPA, headers, health/readiness, CSRF/CORS, and with a dedicated account:
  login, profile, lessons, exercises, gamification, logout). Read-only unless `SMOKE_ALLOW_WRITES=true`.
- `restore-drill.sh` — backup-and-restore drill into throwaway Postgres containers.

Procedures: [production runbook](../../docs/production/M17-PRODUCTION-RUNBOOK.md).
