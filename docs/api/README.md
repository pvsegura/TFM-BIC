# API Documentation

Status: M3 (Identity & Authentication), M4 (Student Profile), M5 (Languages & Content), M6 (Lessons), M7 (Exercises) and M8 (Gamification) endpoints exist; no
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

## Language and content discovery endpoints (M5)

Schemas: `packages/contracts/src/content/`. **Public and read-only** — no session, no user data, no
state change; rationale in [ADR-018](../adr/adr-018-content-languages.md). One generic route set serves
every language and level; the codes below are examples, not routes. Each route is rate-limited
(120 requests/minute per client).

| Method | Path                              | Notes                                                                                                              |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/languages`                      | Active languages, ordered by name: `{ languages: [{ code, name, nativeName, locale, direction }] }`.               |
| GET    | `/languages/:languageCode/levels` | `{ language, levels: [{ id, label, status }] }`, lowest CEFR level first. `status` is `available` or `planned`.    |
| GET    | `/content?language=&level=`       | `{ items: [{ id, languageId, levelId, type, title, description, order, instructionLanguage }] }` — summaries only. |
| GET    | `/content/:contentId`             | One published item: the summary fields plus `blocks` (`explanation`, `example`, `dialogue`).                       |

Rules: only `published` content of an `available` level of an active language is returned, in explicit
`order`; responses never include `status`, `isActive` or file paths (allowlisting schemas).

Errors (all bodies are `{ error }` with a fixed message that never echoes the input): `400 Invalid
request.` for a malformed language code, level id or content id (also missing/repeated/oversized query
parameters); `404` for an unknown or inactive language (`Language not found.`), a planned or undeclared
level (`Level not available.`), and unpublished or missing content (`Content not found.` — the same
body for both, so unpublished content cannot be probed); `429` when rate-limited; generic `500`
otherwise. Unrelated query parameters (e.g. tracking parameters) are ignored.

The web app's pages live under `/learn` precisely so they do not share a path with these routes (no
page-vs-API proxy workaround, unlike `/profile`).

## Lesson endpoints (M6)

Schemas: `packages/contracts/src/lesson/`. **Authenticated** (session cookie; `401 { error }` otherwise),
generic across languages and levels, rationale in [ADR-019](../adr/adr-019-lessons.md). A lesson is an M5
content item of `type: "lesson"`; only the caller's progress is stored. The user always comes from the
session — never from the URL, query or body. Every response carries `Cache-Control: private, no-store`. Each
route is rate-limited (120 requests/minute per client).

| Method | Path                          | Notes                                                                                                                                                                                                        |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/lessons?language=&level=`   | `{ lessons: [{ id, languageId, levelId, title, description, order, instructionLanguage, progress }] }` — metadata and the caller's progress, **no blocks**, in explicit order. Both parameters are required. |
| GET    | `/lessons/:lessonId`          | One visible lesson: the summary fields plus `blocks` (`explanation`, `example`, `dialogue`). Never writes.                                                                                                   |
| POST   | `/lessons/:lessonId/start`    | Records that the caller opened the lesson. Idempotent and forward-only: never changes an in-progress or completed record. Returns the progress.                                                              |
| POST   | `/lessons/:lessonId/complete` | The explicit completion. Idempotent: repeating it returns the same record with the first `completedAt`. A lesson never started is started and completed at once.                                             |

`progress` is `{ status: "not_started" | "in_progress" | "completed", startedAt, completedAt }` with ISO 8601
times or `null`. `not_started` is derived from having no record. Times are the server's clock.

The two `POST` routes take **no body**: any key in one (`userId`, `completedAt`, `status`, `role`, …) is a
`400`, so a client can never set them; bodies over 1 KB are a `413`. They also pass the `Origin` check
(`403` for a cross-origin request). There is no route to create, edit, publish or delete a lesson, and none
acts on another student's progress.

Errors (bodies are `{ error }` with a fixed message that never echoes the input): `400 Invalid request.` for
a malformed lesson id, language, level or a bad/repeated/missing parameter; `401 Unauthenticated`; `403
Forbidden` (cross-origin write); `404` — `Lesson not found.` (the **same** body for a missing, draft,
archived, non-lesson or hidden-level lesson, so unpublished content cannot be probed), `Language not
found.`, `Level not available.`; `429` when rate-limited; a generic `500` otherwise (including if stored
content fails validation — it is never served).

**No pagination**: a level holds a handful of lessons and the list carries metadata only. The response is an
object, so `limit`/`cursor` can be added later without breaking clients.

**Path note:** these paths are the API; the web pages are under `/learn/lessons` so they do not share a path
with it (no page-vs-API proxy workaround, unlike `/profile`).

Database: the `lesson_progress` table has its own migration set (`pnpm --filter @tfm-bic/data
db:migrate:lessons`, after Identity's `db:migrate`).

## Exercise endpoints (M7)

Schemas: `packages/contracts/src/exercise/`. **Authenticated** (session cookie; `401 { error }` otherwise), generic
across languages, levels and exercise types, rationale in [ADR-020](../adr/adr-020-exercises.md) and
[exercise-architecture.md](../architecture/exercise-architecture.md). An exercise is content (a validated file tied to a
lesson); only the caller's attempts are stored. The user always comes from the session — never from the URL, query
or body. Every response carries `Cache-Control: private, no-store`.

| Method | Path                            | Rate limit | Notes                                                                                                                                                                                                                                   |
| ------ | ------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/lessons/:lessonId/exercises`  | 120/min    | `{ exercises: [{ id, lessonId, languageId, levelId, type, order, prompt, instructionLanguage, result }], progress: { total, answered } }` in explicit order. **No options, no answer key.**                                             |
| GET    | `/exercises/:exerciseId`        | 120/min    | One exercise as a student may see it **before** answering, plus `result`. Multiple choice adds `options: [{ id, text }]`; text answer and true/false add nothing. Never writes.                                                         |
| POST   | `/exercises/:exerciseId/answer` | 60/min     | Body `{ "answer": <string \| boolean> }` and nothing else. Returns `{ correct, feedback, correctAnswer, result, rewards }` (`rewards`: M8, below). Every accepted answer is an appended attempt. `Origin` checked; body capped at 2 KB. |

`result` is `{ status: "unanswered" | "correct" | "incorrect", attemptCount, lastAnsweredAt }` — the student's own standing,
derived from their **latest** attempt (`unanswered` = no attempts). `answer` is an option id (multiple choice), the typed
text (text answer) or a boolean (true/false); the exercise's own type decides how it is judged — the client cannot
name an evaluator. `correctAnswer` is in the same shape as an answer (an option id, text or boolean). `feedback` is the
exercise's static explanation or `null`.

The request is **strict**: any other key — `correct`, `userId`, `score`, `answeredAt`, `type`, `exerciseId` — is a
`400 Invalid request.`, never ignored. There is no route to create, edit, publish or delete an exercise, and none that
reads or changes another student's attempts (there is no attempt-history endpoint: the latest result and the count are
part of the responses above).

Errors (bodies are `{ error }` with a fixed message that never echoes the input or reveals the answer key):
`400 Invalid request.` for a malformed exercise/lesson id or a body that is not exactly `{ answer }` (an `answer` of the
wrong primitive type, too long, or extra keys); `400 Invalid answer.` for a well-shaped request whose answer is not a
valid answer _to this exercise_ (an option it does not have, an empty text, a string for true/false) — refused, not
judged, and **not** recorded; `401 Unauthenticated`; `403 Forbidden` (cross-origin write); `404` — `Exercise not found.`
(the **same** body for a missing, draft, archived exercise, or one whose lesson is hidden, not a lesson or in a level
that is not available) and `Lesson not found.` for the list; `413` for an oversized body; `415` for a non-JSON body;
`429` when rate-limited; `501 This kind of exercise is not supported.` for a type with no registered evaluator; a
generic `500` otherwise (including an exercise whose stored configuration is broken — nothing is recorded).

The submitted answer is never logged. Database: the `exercise_attempts` table has its own migration set (`pnpm
--filter @tfm-bic/data db:migrate:exercises`, after Identity's `db:migrate`).

**Path note:** these paths are the API; the web pages are under `/learn/exercises` so they do not share a path with it
(no page-vs-API proxy workaround, unlike `/profile`).

## Gamification endpoints (M8)

Schemas: `packages/contracts/src/gamification/`. **Authenticated** (session cookie; `401 { error }` otherwise) and
**read-only**, rationale in [ADR-021](../adr/adr-021-gamification.md) and
[gamification-architecture.md](../architecture/gamification-architecture.md). The student is always the session's: there
is **no `:userId` in any path**, and any query key that is not documented (a `userId` above all) is a
`400 Invalid request.`, never ignored. Every response carries `Cache-Control: private, no-store`. There is **no route that
creates points, unlocks an achievement or edits a transaction**: rewards are granted only as a consequence of the two
actions below.

| Method | Path                                              | Rate limit | Notes                                                                                                                                                                                                                         |
| ------ | ------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/gamification/summary`                           | 120/min    | `{ totalPoints, achievements: { unlockedCount, totalCount }, inProgressAchievements: [achievement], recentTransactions: [transaction] }` — up to 3 in progress (closest first) and the 5 latest rewards. No query parameters. |
| GET    | `/gamification/achievements`                      | 120/min    | `{ achievements: [achievement], unlockedCount, totalCount }` in catalog order. No query parameters.                                                                                                                           |
| GET    | `/gamification/point-transactions?limit=&before=` | 120/min    | `{ transactions: [transaction], nextBefore }`, newest first. `limit` 1–50 (default 20); `before` is the last id of the previous page; `nextBefore` is `null` on the last page. Digits only; anything else is a `400`.         |

`achievement` is `{ key, title, description, iconId, rewardPoints, unlocked, unlockedAt | null, progress: { current, target } }`
(`key` is a stable language-neutral slug; `title`/`description` are the only localised strings — chosen from
`Accept-Language`, default English; `progress.current` never exceeds `target`). `transaction` is
`{ id, amount, reason, sourceId, title | null, createdAt }` — `reason` is `exercise-completed`, `lesson-completed` or
`achievement-unlocked` (`title` is the achievement's title for an unlock). No user id appears in any response.

**Rewards on existing actions.** `POST /exercises/:id/answer` adds
`rewards: { pointsAwarded, achievementsUnlocked: [{ key, title, description, iconId, rewardPoints }] }`, and
`POST /lessons/:id/complete` now returns the progress **plus** the same `rewards` (`start` and every read are unchanged).
`pointsAwarded` is the total of that action, achievements included: the first correct answer to an exercise is +10, the
first completion of a lesson +25, each achievement unlocked +50; a wrong answer, a repeat or a concurrent duplicate is `0`.
Both requests keep their strict bodies — `points`, `correct`, `userId` or any other key is still a `400`. If the reward
could not be stored the request answers with the generic `500` (the attempt or completion is kept and repeating the action
grants the reward).

Database: `point_transactions` and `user_achievements` have their own migration set
(`pnpm --filter @tfm-bic/data db:migrate:gamification`, after Identity's `db:migrate`). The pages are `/dashboard` and
`/achievements` (not API paths, so the dev proxy needs no page-vs-API bypass for `/gamification`).

## Future direction

Once more endpoints exist (M4+), the planned approach is an OpenAPI/schema-derived spec generated
from the same Zod schemas (so documentation can't drift from the actual validated shapes), rather
than a hand-maintained document. Exact generation tooling is deferred (see
[dependency-management.md](../development/dependency-management.md) before adding any such
dependency).
