# API Documentation

Status: M3 endpoints exist (Identity & Authentication); no OpenAPI/schema-derived spec generation
wired up yet — see below.

## Auth endpoints (M3)

All request/response shapes are the Zod schemas in `packages/contracts/src/auth/` (imported by
both `apps/api` for validation and `apps/web` for a typed API client) — this table is a summary,
not the source of truth.

| Method | Path                               | Auth          | Rate limit | Notes                                                                |
| ------ | ---------------------------------- | ------------- | ---------- | -------------------------------------------------------------------- |
| POST   | `/auth/register`                   | none          | 5/hour     | Always creates a STUDENT; generic response (no account enumeration). |
| POST   | `/auth/login`                      | none          | 10/15min   | Sets the session cookie; generic error on failure.                   |
| POST   | `/auth/logout`                     | session (opt) | —          | Idempotent/safe with no session.                                     |
| GET    | `/auth/me`                         | session       | —          | 401 if not authenticated.                                            |
| POST   | `/auth/email-verification/confirm` | none          | 20/15min   | Single-use, expiring token.                                          |
| POST   | `/auth/email-verification/resend`  | none          | 5/hour     | Generic response (no account enumeration).                           |
| POST   | `/auth/password-reset/request`     | none          | 5/hour     | Generic response (no account enumeration).                           |
| POST   | `/auth/password-reset/confirm`     | none          | 10/hour    | Revokes every existing session on success.                           |

State-changing routes (all except `GET /auth/me`) also validate the `Origin` header
(`apps/api/src/hooks/verify-origin.ts`) as CSRF defense in depth — see
[ADR-006](../adr/adr-006-authentication.md).

`GET /auth/_test/emails?to=<email>` exists only when `NODE_ENV=test` — a diagnostic route for
Playwright E2E tests to retrieve a verification/reset link from the in-memory email adapter, see
`apps/api/src/routes/test-email.route.ts`. Never reachable in development/staging/production.

## Future direction

Once more endpoints exist (M4+), the planned approach is an OpenAPI/schema-derived spec generated
from the same Zod schemas (so documentation can't drift from the actual validated shapes), rather
than a hand-maintained document. Exact generation tooling is deferred (see
[dependency-management.md](../development/dependency-management.md) before adding any such
dependency).
