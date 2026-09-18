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

## Password hashing / session mechanism (M3 — resolved)

Argon2id via the `argon2` npm package (library-default cost parameters); server-managed sessions
via an opaque CSPRNG token in a signed HttpOnly/Secure/SameSite=Strict cookie — not JWT. See
[ADR-006](../../../docs/adr/adr-006-authentication.md) for the full rationale/threat model before
touching `apps/api/src/hooks/authenticate.ts`, `apps/api/src/routes/auth.route.ts`, or
`packages/data/src/identity/argon2-password-hasher.ts`.

## Roles

`STUDENT`, `TEACHER` now; `ADMIN`, `CONTENT_EDITOR`, `SUPPORT`, `MODERATOR` reserved. Modeled as a
Postgres enum (`packages/data/src/identity/db/schema.ts`), not a boolean, so adding a role is a
migration, not a schema rewrite. Registration always assigns `STUDENT` server-side
(`RegisterUserUseCase`) — the request contract has no `role` field at all, so there is nothing a
client can supply to self-assign a privileged role.
