# ADR-006: Authentication

Status: ACCEPTED (strategy) / PENDING (session mechanism)
Date: 2026-09-15

## Context

Need registration, login, logout, email verification, password reset, password hashing,
session/token management, and role-based authorization, verified server-side, extensible beyond
STUDENT/TEACHER.

## Decision

**ACCEPTED**: Authentication/authorization lives in its own Identity & Authentication bounded
context (see [domain-model.md](../architecture/domain-model.md)), independent of Student/Teacher
Profile. Roles at M0: `STUDENT`, `TEACHER`. Architecture reserves `ADMIN`, `CONTENT_EDITOR`,
`SUPPORT`, `MODERATOR` as future roles — the role model must be an enum/table, not a boolean
flag, so adding a role doesn't require a schema rewrite. All authorization checks happen
server-side (`apps/api`); the frontend may hide UI based on role but must never be the sole
enforcement point.

**PENDING**: session mechanism (signed cookie sessions vs JWT access/refresh tokens) and password
hashing library/parameters. Not decided in M0 — requires checking current OWASP guidance and
Node-ecosystem library status at implementation time (see
[security skill](../../.claude/skills/security/SKILL.md) and
[security-baseline.md](../security/security-baseline.md)).

## Options considered

- **OPTION A — Server-side sessions (signed cookie + server-side store).** Pros: easy revocation,
  simpler CSRF story with SameSite cookies. Cons: requires a session store (adds infra).
- **OPTION B — JWT access + refresh tokens.** Pros: stateless access tokens, natural fit for a
  separate `apps/web`/`apps/api` split. Cons: revocation is harder, requires careful refresh-token
  rotation/storage to avoid theft/replay.

No option selected in M0 — flagged PENDING rather than guessed.

## Consequences

- Whichever mechanism is chosen, it must be implementable without the domain layer knowing about
  cookies/JWTs — session handling belongs in `apps/api` (presentation) and
  `packages/data`/infrastructure, not in domain entities.
- Password hashing parameters (algorithm, cost factor) must be verified against current best
  practice at implementation time, not assumed from this document.

## References

- [security-baseline.md](../security/security-baseline.md)
- [domain-model.md](../architecture/domain-model.md)
