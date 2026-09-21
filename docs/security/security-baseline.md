# Security Baseline

Status: ACCEPTED | Related: [ADR-006](../adr/adr-006-authentication.md)

Principles to be applied from the first line of implementation code, not retrofitted.

## Authentication & authorization (M3 — implemented)

- Passwords hashed with Argon2id (the `argon2` npm package, library-default cost parameters) —
  see ADR-006 for why this was chosen over Node's native `crypto.argon2`.
- All authorization checks enforced server-side (`apps/api`, via the `authenticate`/`requireRole`
  preHandler hooks — `apps/api/src/hooks/`); UI-level role hiding
  (`apps/web/src/components/protected-route.tsx`) is UX only, never the security boundary.
- Session mechanism: server-managed session, referenced by an opaque CSPRNG token in an
  `HttpOnly`/`Secure` (prod)/`SameSite=Strict` cookie, signed via `@fastify/cookie`. Session
  tokens and reset/verification tokens are stored only as SHA-256 hashes, never in recoverable
  form, and are never logged — see ADR-006 for the full threat model.

## Student profile (M4 — implemented)

Personal data (name, nickname) is exposed only to its owner. See
[ADR-017](../adr/adr-017-student-profile.md).

- **Broken access control / IDOR**: `GET`/`PATCH /profile` derive the user from the session
  (`request.currentUser`); there is no `:id` route, and a body or query `userId` is either
  rejected (`400`, `.strict()`) or ignored. Tested per route (unauthenticated `401`, user A cannot
  read or change user B, no `PATCH /profile/:id`).
- **Mass assignment**: the request schema is `.strict()` (any key beyond the four editable fields
  is a `400`); the use case's input type carries no `role`/`email`/auth field; fields are mapped
  one by one, never spread. `role`, `userId`, `emailVerified` and `email` cannot be changed through
  the profile. Email changes are a separate, security-sensitive workflow (not implemented).
- **Avatar validation**: `avatarId` must equal a catalog id (checked in the contract _and_ again in
  the use case); a URL or unknown id is a `400`. No image upload exists.
- **Input limits**: body capped at 4 KB (`413`); name 1–100, nickname 2–30 characters; control
  characters rejected; a database `CHECK` mirrors the length rules.
- **XSS**: values are rendered as text by React — no `dangerouslySetInnerHTML`. HTML- and
  SQL-looking input is stored as inert data (not sanitized away); anything that later renders a name
  outside React (HTML email, PDF) must escape it.
- **Errors and logs**: profile values are not logged by the routes; unexpected failures return a
  generic `500` (tested with a driver error naming host, port and credentials). The central error
  handler logs the underlying error server-side.
- **Client cache**: user-scoped query data is cleared on logout and login so one person's profile
  is never shown to the next person on the same browser tab (covered by unit and E2E tests).

These tests demonstrate specific behaviours; they do not prove the profile is free of
vulnerabilities.

## Languages & content (M5 — implemented)

Public, read-only discovery of the language catalog and published content. See
[ADR-018](../adr/adr-018-content-languages.md).

- **Access decision**: the catalog endpoints require **no authentication** by design — catalog
  metadata and openly published lessons are not personal data. If content bodies are ever gated
  (subscriptions), that is a deliberate change to these routes; the frontend never decides access.
- **Unpublished content**: visibility is enforced in the application use cases, not the repository or
  the UI. Draft and archived items, inactive languages and planned levels all return the same `404`
  as a missing item, so they cannot be enumerated. Tested per route.
- **No internal metadata**: responses are parsed through allowlisting schemas; `status`, `isActive`,
  schema versions and paths cannot be serialized. Tested.
- **Injection and traversal**: codes, levels and ids are validated against strict patterns (`400`)
  before use, and are only ever looked up in an in-memory map — no request value is used to build a
  file path or query. Injection-, traversal- and script-shaped values are tested.
- **Mass assignment**: not applicable — there is no write endpoint.
- **XSS**: content is structured plain text. The file schema rejects markup and control characters;
  responses re-validate (a markup-looking string that somehow reached the repository is refused with a
  generic `500`, tested); the UI renders every string through React as text inside fixed components
  keyed by block type, with no `dangerouslySetInnerHTML`. An unknown block type fails validation and,
  if it reached the client, renders a neutral notice with none of its data (tested).
- **Malformed or oversized content**: strict `.strict()` schemas, bounded lengths, at most 50 blocks
  per item, and a 256 KB file cap checked before a file is read. Invalid content stops the API from
  starting instead of being served.
- **No executable content, no dynamic imports**: the UI never imports or evaluates anything named by
  content data.
- **Abuse**: unauthenticated routes are rate-limited (120/min per client); everything is served from
  memory.

These tests demonstrate specific behaviours; they do not prove the catalog is free of vulnerabilities.

## Lessons (M6 — implemented)

Authenticated lesson list/detail and per-student progress. See [ADR-019](../adr/adr-019-lessons.md).

- **Authentication is server-side** on all four routes (the `authenticate` hook): no cookie, a tampered cookie
  or a logged-out session is `401`, and nothing is written. The frontend route guard only hides UI.
- **Identity comes from the session only.** No route takes a user id from the URL, query or body, and no
  route reads or writes another student's progress — tested with two students.
- **Mass assignment**: `start` and `complete` take no body; the request schema is a strict empty object, so
  `userId`, `completedAt`, `status`, `lessonId`, `role`, `points` … are a `400` and write nothing (tested per
  field). Times and statuses are decided by the application and its `Clock`, never the client.
- **Unpublished content**: one `Lesson not found.` `404` for missing, draft, archived, non-lesson and
  hidden-level lessons, so they cannot be enumerated; completion of any of them is refused and writes nothing.
- **Injection and traversal**: ids/languages/levels are matched against strict patterns (`400`), used only as
  bound parameters (Drizzle) and in-memory lookups; injection-, traversal- and script-shaped values are
  tested at the schema, route and E2E layers. The table also has a `CHECK` on the id shape.
- **Integrity**: primary key `(user_id, lesson_id)` (no duplicate progress), `ON DELETE CASCADE` foreign key to
  `users`, `CHECK`s on the stored statuses and on `completed_at` matching the status. Start/complete are one
  atomic upsert each.
- **CSRF**: writes pass the `Origin` check (`403` cross-origin) on top of `SameSite=Strict`.
- **XSS**: the detail response re-validates blocks (markup-looking text or an unknown block type is never
  served — generic `500`, tested); the client re-validates the same contract; the UI renders all text through
  React inside fixed components, with no `dangerouslySetInnerHTML` and no dynamic imports.
- **Caching**: `Cache-Control: private, no-store` on lesson responses; the client cache is user-scoped and is
  dropped on logout/login.
- **Abuse**: rate-limited per client (120/min); request bodies capped at 1 KB.
- **Logging**: on start/complete the request log records the lesson id and resulting status (plus the
  request id) only — no user id, email, cookie or lesson text.
- **Known limitation**: lesson _bodies_ remain readable without an account through the public M5
  `GET /content/:id` (ADR-018 §5). M6 does not gate them; that is a later, deliberate decision.
- **Not verified**: behaviour under truly concurrent connections to a real Postgres/Neon (the tests run on
  PGlite, which serialises queries); the atomicity rests on single-statement upserts.

## Exercises (M7 — implemented)

Authenticated exercise list/detail and answer submission. See [ADR-020](../adr/adr-020-exercises.md).

- **Authentication is server-side** on all three routes (the `authenticate` hook): no cookie, a tampered cookie or a
  logged-out session is `401` and nothing is written.
- **The server is authoritative.** The client submits an answer and nothing else; the request schema is strict, so a
  verdict (`correct`), `userId`, `score`, `answeredAt`, an exercise id or a type in the body is a `400` and records
  nothing (tested per field). The evaluator is chosen by the exercise's own type, never by the client.
- **Answer-key leakage** (critical): the presentation is built field by field by the type's presenter (the correct
  option, the accepted answers, the settings and the explanation are left out by construction), passed through an
  allowlisting response schema, and validated again by the client contract. Tests inspect the raw HTTP bodies of
  list and detail for every type — including a stored exercise carrying extra fields — and Playwright records every
  exercise response on the real pages. The verdict returns only `correct`, `feedback`, `correctAnswer` (the one shown
  answer, not the list of accepted variants) and the result. **By design the correct answer is shown after every
  submission** (this is practice, retry is allowed); that is a product choice, not a leak.
- **IDOR / user isolation**: identity comes from the session only; there is no user id in any URL, query or body and
  no attempt-history endpoint; two-student tests (API and E2E) show one student's attempts are invisible to and
  untouchable by another.
- **Unpublished content**: one `Exercise not found.` `404` for missing, draft, archived exercises and for exercises
  whose lesson is hidden, not a lesson or in an unavailable level; answering any of them records nothing.
- **Historical tampering**: attempts are append-only — the repository port has no update or delete, the API has no
  route that changes an attempt, and `correct` is set by the evaluator at insert time.
- **Invalid answers** are refused (`400 Invalid answer.`), not judged, and never stored, so junk cannot fill the table.
- **Injection and traversal**: ids match a strict pattern (`400`), are bound parameters (Drizzle) and in-memory
  lookups; injection-, traversal-, null-byte- and script-shaped ids and answers are tested at schema, route,
  repository (an answer such as `'; DROP TABLE exercise_attempts;--` is stored as data) and E2E layers. The table
  `CHECK`s the id shape and bounds the answer size.
- **Malicious or malformed exercise content**: content is strict, plain-text-only structured data validated at load
  (a bad exercise stops the API from starting); it cannot define functions, cannot name an evaluator and cannot make
  the application load anything. Only evaluators registered by the application can run; an unregistered type is a
  `501`; a broken stored configuration is a generic `500` that leaks nothing and records nothing.
- **XSS**: exercise text (prompt, options, feedback, correct answer) is rendered as text by React inside fixed
  components; markup-looking text is inert (tested for every view); `packages/ui` and `apps/web` are scanned by a
  test that fails on `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or a dynamic import of a computed path.
- **CSRF**: the answer route passes the `Origin` check (`403` cross-origin) on top of `SameSite=Strict`.
- **Caching**: `Cache-Control: private, no-store` on every exercise response; the client cache is user-scoped and
  dropped on logout/login.
- **Abuse**: reads 120/min, **answers 60/min** per client (each is a stored row); bodies capped at 2 KB (`413`);
  the answer text is bounded (500 characters, also by a database `CHECK`).
- **Logging**: the request log records the exercise id, whether it was correct and the request id — **never the
  submitted answer**, which is the student's own text — and no cookie, email or token.
- **Known limitations**: attempts are retained indefinitely until user deletion (a later GDPR milestone); the
  immutability of attempts rests on the absence of any write path other than insert, not on a database trigger;
  behaviour under truly concurrent connections to a real Postgres/Neon is not verified (PGlite serialises queries).

## Gamification (M8 — implemented)

Points, achievements and rewards. See [ADR-021](../adr/adr-021-gamification.md).

- **The server is the only authority on points.** No route creates points, unlocks an achievement or edits a
  transaction (tested: POST/PUT/PATCH/DELETE to any `/gamification/*` path, including `award` and `give-me-points`, is a
  `404` and writes nothing). Rewards are granted only inside the exercise and lesson use cases, after the server judged
  the answer or persisted the completion; the amount is a domain constant, never a parameter.
- **Mass assignment**: the answer and completion requests keep their strict schemas; `points`, `correct`,
  `pointsAwarded` or `userId` in a body is a `400` and earns nothing (API and E2E).
- **IDOR**: identity comes only from the session. There is no user id in any path; a `userId` (or any undocumented key)
  in a query is a `400`; `GET /users/:id/gamification` and every guessable variation is a `404`. Two-student tests (API,
  repository and E2E) show one student's points, history and unlocks are invisible to another, including with the
  other's paging cursor. No response contains a user id.
- **Authentication** is server-side on all three reads (the `authenticate` hook): no cookie, a tampered cookie or a
  logged-out session is `401`.
- **Idempotency is a security property.** A repeated, retried or concurrent request cannot pay twice: the database's
  unique `(user_id, reason, source_id)` and `(user_id, achievement_key)` refuse it, and a per-student advisory lock
  serialises reward work. Tested at the application layer (a fake with the same guarantees), the repository layer
  (constraints, rollback, many concurrent callers) and E2E (six simultaneous identical answers pay once).
- **No partial state**: a reward, an unlock and its payout commit together or roll back together; the failure path
  answers a generic `500` and leaks nothing about the reward.
- **Historical tampering**: the ledger is append-only — no update/delete in the port and a database trigger refusing
  `UPDATE`; the only removal is `ON DELETE CASCADE` with the user.
- **Injection**: every query is parameterised (Drizzle); ids and keys are slugs checked by the domain, the request
  schemas and database `CHECK`s; the history cursor and limit are digits-only and bounded (`400` otherwise).
- **XSS**: achievement titles and descriptions come from the server as plain text and are rendered as text by fixed
  components (tested with markup-looking strings); icons are symbolic ids mapped to fixed glyphs, never paths or markup.
- **Caching**: `Cache-Control: private, no-store` on every gamification response; the client cache is user-scoped and
  dropped on logout/login.
- **Abuse**: reads are rate-limited (120/min); rewards are naturally bounded because each is one-time per
  exercise/lesson.
- **Logging**: a rewarded action logs the exercise or lesson id, the points awarded and the achievement keys unlocked; a
  reward failure is a `RewardAwardError` naming the reason and source id with the underlying error as `cause`. **No user
  id, answer text, cookie, email or token is logged.**
- **Known limitations**: an attempt or completion can exist without its reward until the action is repeated (different
  stores, ADR-021 §4); ledger rows are kept until user deletion (a later GDPR milestone); the advisory lock is proved on
  PGlite (a single connection) in the default suite and on real Postgres only by the opt-in test.

## Input/output validation

- All external input (HTTP bodies, query params, route params) validated with Zod schemas from
  `packages/contracts` before reaching application/domain code.
- Output encoding handled by React's default escaping — no `dangerouslySetInnerHTML` without a
  documented, reviewed reason (e.g., sanitized rich content).

## Common vulnerability classes

- **XSS**: rely on React's default escaping; sanitize any HTML explicitly allowed into the DOM
  (e.g., rich-text lesson content) with a vetted sanitizer at the point of storage or render.
- **SQL injection**: repository implementations use Drizzle's parameterized query builder
  (`packages/data/src/identity/*.repository.ts`), never string-concatenated SQL.
- **CSRF** (M3 — implemented): primary defense is `SameSite=Strict` on the session cookie;
  defense in depth is an `Origin`-header check on every state-changing `/auth/*` route
  (`apps/api/src/hooks/verify-origin.ts`) — see ADR-006 for the full rationale and accepted
  trade-offs (no double-submit CSRF token in M3).
- **Rate limiting** (M3 — implemented): `@fastify/rate-limit`, per-route, on every auth endpoint
  — register/resend/reset-request: 5/hour; login: 10/15min; reset-confirm: 10/hour; verify-email:
  20/15min (`apps/api/src/routes/auth.route.ts`). Enforcement is covered by an automated test
  (`auth.route.test.ts`), not just configured and assumed to work.
- **Secure headers**: standard security headers (CSP, HSTS, X-Content-Type-Options, etc.) set at
  the API/reverse-proxy layer (`infrastructure/nginx/`) — exact CSP policy deferred until frontend
  asset/CDN strategy (tied to ADR-015) is known.

## Secrets

- No secret ever committed to Git. `.env.example` documents variable _names_ only.
- Environment variables validated (presence + shape) at process startup, failing fast rather than
  behaving unpredictably with a missing secret.
- CI secrets (DB URL, provider API keys, SonarQube token) stored as Jenkins credentials, never in
  `Jenkinsfile`/`sonar-project.properties`/shell steps/logs — see
  [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md#secrets) (implemented M2: the SonarQube
  token today, via the SonarQube Scanner plugin's own credential binding).

## Dependency security

- Dependency updates follow [dependency-management.md](../development/dependency-management.md),
  including a security-advisory check before upgrading.
- Automated dependency audit as a CI step — **not yet added** to the M2 `Jenkinsfile` (its stage
  list is lint/format/typecheck/test/coverage/build/E2E/SonarQube/Quality Gate only); mechanism
  (`pnpm audit` as an explicit stage vs. relying on SonarQube's dependency-vulnerability checks)
  still open.

## Audit logging

- Privacy-relevant and destructive actions (account deletion, data export, role changes) are
  audit-logged — detail owned by the Privacy & Data Management context (see
  [domain-model.md](../architecture/domain-model.md)), a later milestone.
- M3: auth routes log structured events (login success/failure, logout, email verified,
  password-reset requested/completed) via Fastify's request logger
  (`apps/api/src/routes/auth.route.ts`) — user id where known, never email/password/tokens/
  cookies (the logger's `redact` config additionally strips the `Cookie` and `Authorization`
  headers and `Set-Cookie` response header from every log line, see `apps/api/src/server.ts`).

## Least privilege

- Database credentials used by the API scoped to only what the API needs; no shared "admin"
  credential reused across environments.
- Provider API keys (Gemini, email, Hyperframes-hosted-if-applicable) scoped/rotated per current
  provider capability — verified per provider, not assumed uniform.
