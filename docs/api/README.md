# API Documentation

Status: M3 (Identity & Authentication) and M4 (Student Profile) endpoints exist; no
OpenAPI/schema-derived spec generation wired up yet — see below.

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

## Profile endpoints (M4)

Schemas: `packages/contracts/src/profile/`. Both routes act **only** on the authenticated user —
identity comes from the session cookie, never from the URL, query string or body — and there is no
`/profile/:id`. Rationale and trade-offs: [ADR-017](../adr/adr-017-student-profile.md).

| Method | Path       | Auth    | Notes                                                                                                  |
| ------ | ---------- | ------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/profile` | session | The caller's profile plus their account `email` and `role`. Never writes; an unsaved profile is nulls. |
| PATCH  | `/profile` | session | Updates `firstName`, `lastName`, `nickname`, `avatarId`. `Origin` checked; body capped at 4 KB.        |

Response (`GET` and `PATCH`): `{ userId, firstName, lastName, nickname, avatarId, email, role }` —
the name/nickname/avatar fields are `string | null` (`avatarId` is a catalog id or `null`); `email`
and `role` come from the authentication identity and are read-only here.

`PATCH` body — every field optional, and **any other key is a `400`** (this is the mass-assignment
defence, so `role`, `userId`, `email` and `emailVerified` can never be set through it):

| Field                   | Omitted   | `null`  | String                                                      |
| ----------------------- | --------- | ------- | ----------------------------------------------------------- |
| `firstName`, `lastName` | unchanged | cleared | trimmed, 1–100 characters, no control characters            |
| `nickname`              | unchanged | cleared | trimmed, 2–30 characters, no control characters             |
| `avatarId`              | unchanged | invalid | one of `avatar-01` … `avatar-06` (exact match; never a URL) |

An empty or whitespace-only string is a `400`, never stored. Unicode is preserved exactly.

Errors: `401 {error}` (no/invalid session), `403 {error}` (cross-origin `Origin`), `413` (oversized
body), `400 { error, fields? }` where `fields` maps `firstName`/`lastName`/`nickname`/`avatarId` to
a safe message that never echoes the input. Unexpected failures are a generic `500`.

**Path note:** `/profile` is also the profile page's route in the web app. The Vite dev proxy
(`apps/web/vite.config.ts`) serves the SPA for browser navigations and forwards the app's own
`fetch` (which sends `Accept: application/json`) to this API. A production reverse proxy must make
the same distinction — see ADR-017.

## Future direction

Once more endpoints exist (M4+), the planned approach is an OpenAPI/schema-derived spec generated
from the same Zod schemas (so documentation can't drift from the actual validated shapes), rather
than a hand-maintained document. Exact generation tooling is deferred (see
[dependency-management.md](../development/dependency-management.md) before adding any such
dependency).
