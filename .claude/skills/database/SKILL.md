---
name: database
description: PostgreSQL access patterns for this project - repository pattern, no AWS, provider Neon, ORM Drizzle. Use when writing packages/data repositories or discussing schema/queries.
---

# Database

Provider: Neon ([ADR-005](../../../docs/adr/adr-005-database.md) — docs-only; real account
provisioning is a deployment-time action, M17, out of scope until then). ORM: Drizzle
(`drizzle-orm` + `drizzle-kit`).

## Rules

- Domain/application never import a DB driver or write SQL — they depend on repository
  _interfaces_ they own; `packages/data` implements them.
- Drizzle's parameterized query builder only — never string-concatenated SQL (SQL injection).
- Teacher/student queries must use pagination + filtering and avoid N+1 (constitution §15) —
  check any query that loads "students for a teacher" or similar fan-out for this before merging.
- Credentials scoped to least privilege; no shared admin credential reused across environments.
- Migrations: `drizzle-kit generate` (from `packages/data`, reading `drizzle.config.ts`) produces
  SQL under `packages/data/src/<context>/db/migrations/` — never hand-edit the schema without a
  migration.

## Testing

Repository implementations are tested against **PGlite** (`@electric-sql/pglite`) — a real,
WASM-compiled Postgres running in-process, colocated with the adapter (e.g.
`packages/data/src/identity/user.repository.test.ts`) — not a hand-rolled driver fake and not a
separate `tests/integration/` tier. See
[testing-strategy.md](../../../docs/testing/testing-strategy.md#integration-vs-unit-boundary) for
why this was chosen over the original two-tier plan, and
`packages/data/src/identity/db/test-support/create-test-db.ts` for the reusable factory. Local
Docker Postgres (`infrastructure/docker/docker-compose.yml`) exists for manual dev testing against
a real networked database; it is not used by any automated test.

## Before implementing a repository in a new bounded context

Reuse the Identity context's pattern (`packages/data/src/identity/`) — schema in `db/schema.ts`,
one file per repository, PGlite-backed colocated tests — rather than reopening the
provider/ORM/testing-strategy questions ADR-005 already settled.
