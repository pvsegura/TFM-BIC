# M16 — Authorization Matrix

Status: M16, 2026-09-26. Built from the route registrations in `apps/api/src/routes/` (not from
older docs). **The backend is the authority**; the web route guards (`ProtectedRoute`,
`TeacherRoute`) only hide UI.

Legend: ✅ allowed · ❌ refused (status) · "Own" = acts only on the session user; there is no
user id in the path, query or body of any route. "Origin" = `verify-origin` preHandler (CSRF
defence in depth). The route-inventory test (`apps/api/src/security/route-inventory.security.test.ts`)
fails if a route is added that is not listed in its public/token-authorized allowlists and does not
answer `401` without a session, or if a state-changing route skips the Origin check.

## Public (no session)

| Route                                                             | Anonymous | Student | Teacher | Owner only | Special                                                                                                  |
| ----------------------------------------------------------------- | --------- | ------- | ------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `GET /health`, `GET /ready`                                       | ✅        | ✅      | ✅      | —          | Minimal body, no rate limit (infrastructure probes)                                                      |
| `GET /languages`, `/languages/:code/levels`                       | ✅        | ✅      | ✅      | —          | Published/active only; 120/min                                                                           |
| `GET /content`, `/content/:contentId`                             | ✅        | ✅      | ✅      | —          | Published only; hidden = same `404`; 120/min                                                             |
| `POST /auth/register`                                             | ✅        | ✅      | ✅      | —          | Origin; always creates STUDENT; generic response                                                         |
| `POST /auth/login`                                                | ✅        | ✅      | ✅      | —          | Origin; per-IP **and per-account** limit (M16)                                                           |
| `POST /auth/logout`                                               | ✅        | ✅      | ✅      | Own        | Origin; deletes the presented session only                                                               |
| `POST /auth/email-verification/confirm`                           | ✅        | ✅      | ✅      | Token      | Origin; single-use hashed token (atomic, M16)                                                            |
| `POST /auth/email-verification/resend`                            | ✅        | ✅      | ✅      | —          | Origin; generic response                                                                                 |
| `POST /auth/password-reset/request`                               | ✅        | ✅      | ✅      | —          | Origin; generic response                                                                                 |
| `POST /auth/password-reset/confirm`                               | ✅        | ✅      | ✅      | Token      | Origin; single-use hashed token (atomic, M16); kills all sessions                                        |
| `POST /email-preferences/newsletter/confirm`                      | ✅        | ✅      | ✅      | Token      | Origin; single-use hashed token                                                                          |
| `POST /email-preferences/newsletter/unsubscribe`                  | ✅        | ✅      | ✅      | Token      | HMAC token; **no Origin check by design** (RFC 8058 mail clients send none); can only withdraw consent   |
| `POST /client-errors` (M18)                                       | ✅        | ✅      | ✅      | —          | Origin; 10/min per address; closed body (kind, class name, path); writes one log line, stores nothing    |
| `GET /media`, `/media/lessons/:id`, `/media/vocabulary/:id` (M21) | ✅        | ✅      | ✅      | —          | Read-only published media of published content; 120/min; allowlisting response schemas; no provider call |
| `GET /media/files/*` (M21)                                        | ✅        | ✅      | ✅      | —          | Manifest allowlist lookup only (no path from the URL); single byte range; 600/min                        |

## Operator (M18, not a user route)

| Route                   | Access                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /internal/metrics` | **Absent unless `METRICS_TOKEN` is set.** Then `Authorization: Bearer <METRICS_TOKEN>` only (constant-time compare), else generic `401`; 60/min; aggregates only. |

## Authenticated — any role (own data only)

| Route                                                                              | Anonymous | Student | Teacher | Owner only | Special                                                                         |
| ---------------------------------------------------------------------------------- | --------- | ------- | ------- | ---------- | ------------------------------------------------------------------------------- |
| `GET /auth/me`                                                                     | ❌ 401    | ✅      | ✅      | Own        | Safe user fields only                                                           |
| `GET /profile`, `PATCH /profile`                                                   | ❌ 401    | ✅      | ✅      | Own        | PATCH: Origin, strict 4-field body; rate limited (M16)                          |
| `GET /lessons`, `/lessons/:lessonId`                                               | ❌ 401    | ✅      | ✅      | Own        | Progress of the session user only                                               |
| `POST /lessons/:lessonId/start`, `/complete`                                       | ❌ 401    | ✅      | ✅      | Own        | Origin; empty strict body                                                       |
| `GET /lessons/:lessonId/exercises`, `/exercises/:exerciseId`                       | ❌ 401    | ✅      | ✅      | Own        | No answer key before an answer                                                  |
| `POST /exercises/:exerciseId/answer`                                               | ❌ 401    | ✅      | ✅      | Own        | Origin; `{ answer }` only; server judges                                        |
| `GET /gamification/summary`, `/achievements`, `/point-transactions`                | ❌ 401    | ✅      | ✅      | Own        | Read-only; no write route exists                                                |
| `GET /vocabulary`, `/vocabulary/categories`, `/vocabulary/:id`, `/user-vocabulary` | ❌ 401    | ✅      | ✅      | Own        |                                                                                 |
| `POST /vocabulary/:id/save`, `/unsave`, `/learned`; `PUT /vocabulary/:id/status`   | ❌ 401    | ✅      | ✅      | Own        | Origin; strict bodies                                                           |
| `GET /phonetics`, `/phonetics/topics`, `/phonetics/:id`                            | ❌ 401    | ✅      | ✅      | Own        |                                                                                 |
| `POST /phonetics/:id/view`, `/practice`, `/complete`                               | ❌ 401    | ✅      | ✅      | Own        | Origin; empty strict body                                                       |
| `POST /video-generations`                                                          | ❌ 401    | ✅      | ✅      | Own        | Origin; per-IP **and per-user** limit (M16)                                     |
| `GET /video-generations/:jobId`                                                    | ❌ 401    | ✅      | ✅      | Own        | Another user's job = same `404` as missing                                      |
| `POST /audio-generations`                                                          | ❌ 401    | ✅      | ✅      | —          | Origin; text from content only; per-IP **and per-user** limit (M16)             |
| `GET /email-preferences`                                                           | ❌ 401    | ✅      | ✅      | Own        |                                                                                 |
| `POST`/`DELETE /email-preferences/newsletter/subscription`                         | ❌ 401    | ✅      | ✅      | Own        | Origin; address from the session                                                |
| `GET /data-management/export`                                                      | ❌ 401    | ✅      | ✅      | Own        | Per-IP **and per-user** limit (M16); no-store                                   |
| `POST /data-management/account-deletion`                                           | ❌ 401    | ✅      | ✅      | Own        | Origin; current password + `confirm: true`; per-IP **and per-user** limit (M16) |

## Teacher only

| Route                                        | Anonymous | Student | Teacher                 | Owner only | Special                                                        |
| -------------------------------------------- | --------- | ------- | ----------------------- | ---------- | -------------------------------------------------------------- |
| `GET /teacher-dashboard/overview`            | ❌ 401    | ❌ 403  | ✅ own roster           | Roster     | `requireRole(TEACHER)` + use case re-checks                    |
| `GET /teacher-dashboard/students`            | ❌ 401    | ❌ 403  | ✅ own roster           | Roster     | Search/sort/filter allowlisted and bounded; no global search   |
| `GET /teacher-dashboard/students/:studentId` | ❌ 401    | ❌ 403  | ✅ linked students only | Roster     | Unlinked or non-existent student = same `404`; audit log event |

## Test-only (never registered outside `NODE_ENV=test` + E2E composition)

`GET /auth/_test/emails`, `POST /email-preferences/_test/newsletter-issues`,
`POST /teacher-dashboard/_test/links`.

## Operator-only (no HTTP route)

Promoting a user to TEACHER and linking/unlinking students: `pnpm --filter @tfm-bic/data
teacher:admin` with database access (ADR-024). Roles are never read from a request.

## Error semantics (deliberate)

- **401** — no, tampered or expired session.
- **403** — authenticated but wrong role (teacher routes), failed Origin/Fetch-Metadata check, or
  wrong password on deletion. A role check reveals nothing about any resource.
- **404** — a resource that is missing **or** belongs to someone else (video jobs, teacher
  students) or is unpublished content: identical bodies, so ids cannot be probed.
