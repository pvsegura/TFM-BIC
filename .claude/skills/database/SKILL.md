---
name: database
description: PostgreSQL access patterns for this project - repository pattern, no AWS, provider PENDING. Use when writing packages/data repositories or discussing schema/queries.
---

# Database

Provider: PENDING ([ADR-005](../../../docs/adr/adr-005-database.md), Neon or Supabase
recommended — no AWS, not decided). ORM/query-builder: not chosen.

## Rules

- Domain/application never import a DB driver or write SQL — they depend on repository
  *interfaces* they own; `packages/data` implements them.
- Parameterized queries / query builder only — never string-concatenated SQL (SQL injection).
- Teacher/student queries must use pagination + filtering and avoid N+1 (constitution §15) —
  check any query that loads "students for a teacher" or similar fan-out for this before merging.
- Credentials scoped to least privilege; no shared admin credential reused across environments.
- Migrations: no migration tool chosen yet — pick one via
  [dependency-upgrades](../dependency-upgrades/SKILL.md) at implementation time, don't assume.

## Testing

Repository implementations get a fast unit test against a faked driver, plus an integration test
in `tests/integration/` against a real disposable/test Postgres instance.

## Before implementing any repository

Re-check [ADR-005](../../../docs/adr/adr-005-database.md) status — if still PENDING, confirm with
the decision owner rather than assuming a provider.
