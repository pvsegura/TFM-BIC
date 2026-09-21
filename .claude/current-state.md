# Current State

Last updated: 2026-09-21

## Milestone

**M6 — Lessons** — implemented on `feature/lessons`, branched from `feature/content-languages` (M5), which sits
on `feature/student-profile` (M4) → `feature/authentication` (M3) → `ci/jenkins-sonarqube` (M1+M2); `main` only
has M0. **Nothing from M5 or M6 has been pushed or merged.** M0–M5 remain the base (architecture/governance,
monorepo/tooling, CI/CD, authentication, student profile, languages & content — see
[docs/product/project-constitution.md](../docs/product/project-constitution.md)).

## What actually exists (M6)

The first student-facing lesson experience. Rationale and trade-offs: [ADR-019](../docs/adr/adr-019-lessons.md);
reference: [content-architecture.md](../docs/architecture/content-architecture.md) (Lessons section) and
[docs/api/README.md](../docs/api/README.md).

- **A lesson is an M5 content item with `type: "lesson"`**, identified by its `ContentId` (`LessonId`). No lessons
  table, no second id or slug, no copy of content. Visibility (published, active language, `available` level) is
  M5's rule, reused; anything else — missing, draft, archived, `explanation`, hidden level — is one `404`.
- **Progress is separate and per student**: table `lesson_progress`, PK `(user_id, lesson_id)`, columns `status`,
  `started_at`, `completed_at`, `updated_at`, FK to `users` (cascade), CHECKs. `lesson_id` is the
  content id as text (not a FK — content is files). "Not started" is derived (no row). Own bounded context
  `packages/data/src/lessons/`, migrations via `db:generate:lessons` / `db:migrate:lessons`.
- **Domain**: `LessonId`, `isLesson`, `LessonProgress`, pure forward-only idempotent `startLesson` /
  `completeLesson`, `LessonNotFoundError`. **Application**: `LessonProgressRepository` port (atomic `start` /
  `complete`, batched `findByUserAndLessons`), `ListLessons`, `GetLesson`, `StartLesson`, `CompleteLesson`
  (built on the content use cases; times from the `Clock`).
- **API** (authenticated, rate-limited 120/min, `Cache-Control: private, no-store`): `GET /lessons?language=&level=`,
  `GET /lessons/:lessonId`, `POST /lessons/:lessonId/start`, `POST /lessons/:lessonId/complete`. The user is always
  the session's; the two POSTs take no body (strict empty schema → a body with `userId`/`completedAt`/`status` is
  `400`); writes pass the `Origin` check.
- **Semantics**: opening a lesson starts it (once); completion is only ever the explicit **Complete lesson**
  action; both are idempotent and awards nothing. **Resume position within a lesson is not part of M6; lesson
  status is persisted.**
- **Frontend**: pages under `/learn/lessons` (language → level → lessons; choice in `?language=&level=`) and
  `/learn/lessons/:lessonId`, behind the login route (`/lessons` is the API path, so no dev-proxy bypass — ADR-019
  §6). Generic `LessonCard`/`LessonList`/`LessonStatusBadge`/`LessonViewer`/`LessonCompletion`, shared
  `LanguageLevelPicker` (extracted from the M5 page), existing `ContentBlocks` for safe rendering. TanStack Query
  root `["lessons", …]` (user-scoped, dropped on logout); "Lessons" nav link for signed-in students. One completion
  request in flight at a time (a disabled button alone let a double-click send two).
- **Also changed**: primary `Button` is now navy text on the orange accent (AA contrast, ~5.5:1; white was ~2.8:1).
- Polish A1 content is unchanged from M5 (three lessons, two explanations) — representative, not a course.

## Verification (M6, run locally on 2026-09-21)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 items), `lint`, `typecheck`, `build`:
  pass. `format:check`: passes for everything committed (the user's separate uncommitted `README.md` edit is not
  formatted).
- **1435 Vitest tests / 132 files** pass (1107 / 110 at end of M5): domain 253, contracts 298, application 137,
  data 147, config 12, api 234, web 323, ui 30, shared 1. Coverage: 96.11% statements / 90.23% branches / 96.81%
  functions / 95.98% lines (thresholds 80/75/80/80).
- **69 Playwright E2E tests** pass (46 earlier + 23 in `tests/e2e/lessons.spec.ts`). Ports 3000 and 5173 must be free.
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M6.** The branch is not on GitHub and there
  are no Jenkins/SonarQube credentials in this environment (see the M4 note below; pushing needs the user's
  approval). The two new coverage exclusions (`lesson-dependencies.ts`, `lessons/db/client.ts`) are mirrored
  in `vitest.config.ts` and `sonar-project.properties` but untested against a real instance.
- Accessibility rests on role/label/keyboard tests and manual review; there is no axe-style scanner. Contrast was
  calculated, not measured with a tool.
- Repository tests run on PGlite, which serialises queries: constraints and SQL semantics are proved, true
  multi-connection concurrency on Neon/Postgres is not.

## Earlier milestones (short)

- **M5 (languages & content)**: validated JSON under `content/languages/`, `ContentRepository` port, four public
  read-only catalog endpoints, `/learn` pages, fictional-language extensibility tests — [ADR-018](../docs/adr/adr-018-content-languages.md).
- **M4 (student profile)**: `GET`/`PATCH /profile` on the session user only, `student_profiles` table, avatar
  catalog — [ADR-017](../docs/adr/adr-017-student-profile.md). Its branch was pushed on 2026-09-20 (publishing M3
  too); a local Jenkins (Multibranch `TFM-BIC`, containers in WSL Ubuntu) and SonarQube exist but no build result
  was ever read back.
- **M3 (auth)**: register/verify/login/logout/reset, server-side sessions, Argon2id, rate limits, `Origin` CSRF
  check, in-memory email only — ADR-006, [security-baseline](../docs/security/security-baseline.md).

## What does NOT exist yet (do not assume otherwise)

- Exercises, scoring, points, achievements/gamification, vocabulary/phonetics content, teacher dashboard,
  subscriptions, newsletter, account deletion/data export, AI services, audio/video generation.
- Block-level (position-in-lesson) resume; a lesson-completed event; pagination of the lesson list.
- More than one real language, or any level beyond Polish A1; CEFR descriptors; interface localisation (the UI is
  English-only; `instructionLanguage` is data, not behaviour).
- Persistence of a student's chosen language/level (enrolment); content hot-reload (content is read at start-up).
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step.

## Pending decisions

None block M7. Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; a deployment must ship
`content/` with the API (or set `CONTENT_DIR`) and run the Identity, Profile and Lessons migrations in that order
(Profile and Lessons are independent of each other).

## Known risks / rough edges

- **Lesson bodies are still public**: `GET /content/:id` (M5, unauthenticated by design) returns the same text as
  the authenticated `GET /lessons/:id`. Gating bodies is a later, deliberate decision (subscriptions) — ADR-019.
- **`/learn/pl/a1` (public content browser) and `/learn/lessons` (student lessons) overlap** in what they show.
- **Progress rows outlive content** if a lesson is archived (unlisted, harmless); no orphan clean-up.
- **Content changes need a restart/release** (read once at start-up); invalid content stops the API from starting.
- **`/profile` is both page and API path** (only the Vite dev proxy separates them; ADR-017). M5 and M6 avoided
  repeating this (`/learn`, `/learn/lessons`).
- Merely opening a lesson marks it in progress (by design); a failed `start` is silent.
- The skip-to-content link in the root layout still uses white on the orange accent (~2.8:1).
- A first Playwright run once timed out (60s) waiting for the servers with both ports free; a rerun passed. Not
  reproduced since.
- Profile routes have no rate limit; no unsaved-changes guard; names stored as typed (escape on output).
- Three `pg` pools per API process (identity, profile, lessons); real Neon connectivity unverified.
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for the lesson routes too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.

## Next milestone

`M7 — Exercises` (not started).
