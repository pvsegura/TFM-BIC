# ADR-005: Database

Status: ACCEPTED
Date: 2026-09-15
Updated: 2026-09-17 (M3 — provider, ORM, and migration tool resolved)

## Context

Product brief mandates: remote PostgreSQL, no AWS, evaluate managed providers with a free tier
suitable for MVP, without assuming the free tier persists indefinitely.

## Decision

**Architecture (ACCEPTED)**: PostgreSQL, accessed only through `packages/data` repository
implementations behind domain-owned repository interfaces (ADR-001). No ORM chosen yet — deferred
to scaffold time.

**Provider (PENDING)** — research done 2026-09-15:

- **OPTION A — Neon.** Free tier: 1 project, 10 branches, 3 GiB/branch, 0.5 GB storage,
  100 compute-hours/month, shared compute (1 GB RAM), described as hostable "indefinitely at $0,
  no card required." Serverless/branching model fits preview-environment workflows well.
- **OPTION B — Supabase.** Free tier: 750 MB storage, native Postgres, also indefinite/no card.
  Bundles auth/storage/realtime/edge-functions — potentially redundant with this project's own
  Identity & Authentication context (ADR-006), which is a reason to be cautious about adopting
  Supabase's bundled auth rather than just its Postgres.
- **OPTION C — Railway.** No permanent free Postgres tier (one-time trial credit only, then
  usage-based paid) — weaker fit for a free MVP baseline.

No provider selected in M0. Recommendation for the decision owner: Neon or Supabase (using only
the Postgres feature, not the bundled auth) over Railway, given the free-tier durability
difference found above.

Source: aggregated provider-comparison search results dated 2026-09-15 (see AI integration
strategy doc's research note for methodology); **exact current limits should be re-verified on
each provider's pricing page immediately before signing up**, since free-tier terms change.

## M3 update (2026-09-17): provider, ORM, migrations — RESOLVED

**Provider: Neon**, per the 2026-09-15 recommendation above (free-tier durability, no bundled
auth to conflict with ADR-006's own Identity & Authentication context). Access is entirely
through the standard `DATABASE_URL` Postgres connection-string env var, so the same code path
works against Neon or any other wire-compatible Postgres — nothing in `packages/data` is
Neon-specific.

**Actual account creation/credential provisioning against Neon is a deployment-time action, out
of M3's scope** (M3 implements authentication; M17 — Production Deployment — is explicitly out of
scope per the M3 brief). This agent session has no ability to create third-party accounts. For
local development and automated tests in M3:

- **Local dev**: `infrastructure/docker/docker-compose.yml` runs a disposable Postgres 17
  container, pointed at by the dev `.env`'s `DATABASE_URL` — this is dev tooling, not the
  production architecture (the "no local-only production DB" rule targets what the app is
  deployed against, not how a developer runs it locally).
- **Automated tests** (`pnpm test`, run in Jenkins with no external services): repository tests
  run against **PGlite** (`@electric-sql/pglite`) — real Postgres (compiled to WASM), not a
  driver mock, running in-process with no network/Docker dependency. This keeps the M2 Jenkins
  pipeline unchanged (no new service dependency to provision) while still exercising real SQL,
  constraints, and migrations. Chosen over a hand-rolled repository-interface fake specifically
  so schema/constraint bugs (e.g. the email-uniqueness constraint) are caught by the same tests
  that run in CI.

**ORM / query layer: Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) over the
`pg` driver. Chosen over Kysely (query builder only, no schema/migration story) and Prisma
(separate schema DSL + generated client, which conflicts with this repo's "workspace packages
resolve to TypeScript source, no build-order coupling" convention — ADR-002). Schema lives in
`packages/data/src/identity/db/schema.ts`; migrations are plain generated SQL under
`packages/data/src/identity/db/migrations/`, applied via `drizzle-kit migrate`. Verified versions
at time of writing: `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `pg@8.23.0` (see
[dependency-upgrades skill](../../.claude/skills/dependency-upgrades/SKILL.md) for how these were
checked).

## Options considered

See above.

## Consequences

- Repository interfaces in `packages/domain`/`packages/application` must not leak
  provider-specific SQL dialects or connection details — confirmed by construction: the Drizzle
  schema and query code live only in `packages/data`, behind `UserRepository`/`SessionRepository`/
  etc. interfaces owned by `packages/application`.
- Neon's free-tier limits become a tracked risk once real deployment provisioning happens (see
  [risk-register.md](../risk-register.md)) — not exercised in M3.
- Supabase's bundled Auth product is explicitly not used — this project keeps its own Identity &
  Authentication context (ADR-006).
- PGlite gives fast, Docker-free, real-Postgres-semantics tests in CI; it is not a substitute for
  eventually validating against the actual Neon connection before a real deployment — tracked as
  a known limitation (see `.claude/current-state.md`).

## References

- [risk-register.md](../risk-register.md)
- [database skill](../../.claude/skills/database/SKILL.md)
- [ADR-006 — Authentication](adr-006-authentication.md)
