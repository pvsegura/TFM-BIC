---
name: security
description: Security baseline for this project - authN/authZ, input validation, XSS/SQLi/CSRF protection, secrets, rate limiting, dependency auditing. Use when writing auth code, handling user input, or reviewing for security issues.
---

# Security

Full baseline: [docs/security/security-baseline.md](../../../docs/security/security-baseline.md).

## Checklist for new code

- All external input validated with Zod (`packages/contracts`) before it reaches
  application/domain code.
- All authorization checks happen server-side — never trust a client-side role check alone.
- No string-concatenated SQL — parameterized queries / query builder only.
- No `dangerouslySetInnerHTML` without a documented, reviewed sanitization reason.
- No secret (API key, DB URL, session/JWT secret) ever hardcoded or committed — comes from
  validated environment variables (see [environments.md](../../../docs/deployment/environments.md)).
- Auth endpoints (login, registration, password reset) get rate limiting.
- New dependency additions go through [dependency-upgrades](../dependency-upgrades/SKILL.md),
  including a security-advisory check.

## Password hashing / session mechanism

Not finalized — [ADR-006](../../../docs/adr/adr-006-authentication.md) is PENDING on this.
Verify current best practice (algorithm, cost factor) at implementation time rather than assuming
a specific library/parameter set from this skill.

## Roles

`STUDENT`, `TEACHER` now; `ADMIN`, `CONTENT_EDITOR`, `SUPPORT`, `MODERATOR` reserved. Model as an
enum/table, not booleans, so adding a role isn't a schema rewrite.
