# Current State

Last updated: 2026-09-21

## Milestone

**M7 — Exercises** — implemented on `feature/exercises`, branched from `feature/lessons` (M6) → `feature/content-languages`
(M5) → `feature/student-profile` (M4) → `feature/authentication` (M3) → `ci/jenkins-sonarqube` (M1+M2); `main` only has M0.
**`feature/exercises` is not pushed and nothing is merged**; Jenkins/SonarQube are deliberately not connected (M6 was pushed on
2026-09-21). M0–M6 remain the base — see [docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists (M7)

The generic exercise engine and the first student-facing practice. Rationale and trade-offs:
[ADR-020](../docs/adr/adr-020-exercises.md); reference: [exercise-architecture.md](../docs/architecture/exercise-architecture.md),
[content-architecture.md](../docs/architecture/content-architecture.md) (Exercises section), [docs/api/README.md](../docs/api/README.md).

- **An exercise is content, not a record**: a validated file under `levels/<level>/exercises/<id>.json`, tied to a lesson by
  `lessonId`, with a permanent language-prefixed `ExerciseId`, M5's `status`, an explicit `order` (unique per lesson) and a
  type-specific `configuration`. No exercises table (deliberate, as for lessons); only `exercise_attempts` is in PostgreSQL.
- **Three types** — `multiple-choice`, `text-answer`, `true-false` — each with a strict Zod configuration schema, a pure
  deterministic evaluator (`parseAnswer` + `evaluate`) and a presenter, dispatched by `ExerciseTypeRegistry` (no
  `if (type === …)` chain). The server judges every answer; the client sends only `{ answer }` (strict). A malformed answer is
  refused (`400`), never judged or stored. Text policy: NFC + trim + language-aware lower-casing when not case-sensitive;
  diacritics and punctuation are never stripped; variants are listed explicitly.
- **Answer keys never leave the server before an answer**: presenters build the presentation field by field, response schemas
  are allowlists, tests inspect raw HTTP bodies and Playwright records the real responses. **The correct answer is shown after
  every submission by design** (practice mode).
- **Attempts**: table `exercise_attempts` (identity id, FK to `users` cascade, `exercise_id` text with a `CHECK`, `jsonb` answer
  bounded by a `CHECK`, `correct`, `answered_at` from the `Clock`), one index `(user_id, exercise_id, answered_at)`. Own context
  `packages/data/src/exercises/`, migrations via `db:generate:exercises` / `db:migrate:exercises`. **Append-only**: every
  well-formed submission is a row, retries never touch earlier rows, the current result (latest correctness + count) is derived in
  one query held to `summarizeAttempts`. No points/XP/streak/score is computed or stored.
- **API** (authenticated, `private, no-store`): `GET /lessons/:lessonId/exercises`, `GET /exercises/:exerciseId`,
  `POST /exercises/:exerciseId/answer` (60/min, 2 KB body, `Origin` checked); reads 120/min. Fixed error bodies
  (`404 Exercise not found.`, `400 Invalid answer.`, `501` unsupported type, generic `500`); the submitted answer is never logged.
- **Frontend**: pages at `/learn/exercises/:exerciseId` (behind login; `/exercises` is the API path and its old placeholder route
  was removed); generic `ExerciseRenderer` → `exercise-view-registry.ts` → three views (native radio groups / labelled text box);
  `ExercisePlayer` (verdict in words, focus to the result, Try again, Next exercise / Back to lesson); the lesson page has a
  **Practice** section (`practice` slot in `LessonViewer`; lesson completion semantics unchanged). TanStack Query root
  `["exercises", …]` (user-scoped); one submission in flight at a time.
- **Polish A1**: nine original seed exercises across the three types on the three existing lessons — representative, not a bank.
- **Content validation** extended (same loader as `pnpm content:validate`, the Jenkins stage and API start-up): exercise
  schemas, unique ids (never equal to a content id), lesson exists/is a lesson/same language and level, unique order per lesson,
  published exercises only on published lessons in available levels.
- **Guards**: `no-raw-html.test.ts` (no `dangerouslySetInnerHTML`/`innerHTML`/`eval`/computed dynamic import in web/ui) and the
  existing no-language-branching scan now also cover the exercise code.

## Verification (M7, run locally on 2026-09-21)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 content items, 9 exercises), `lint`, `typecheck`,
  `build`: pass. `format:check`: passes for everything committed (the user's separate uncommitted `README.md` edit is not formatted).
- **2127 Vitest tests / 164 files** pass (1435 / 132 at end of M6): domain 404, contracts 450, application 192, data 215,
  config 12, api 329, web 494, ui 30, shared 1. Coverage: 96.88% statements / 92% branches / 97.32% functions / 96.77% lines
  (thresholds 80/75/80/80); the three evaluators and the text normaliser are 100% on all four.
- **103 Playwright E2E tests** pass (69 + 34 in `tests/e2e/exercises.spec.ts`) with `--workers=2`. Ports 3000 and 5173 must be free.
  **With the default 4 workers this machine (≈0.5 GB free RAM) crashed processes (exit 0xC0000409: the Vite dev server, a worker,
  browser tabs) in two full runs; those runs are invalid, not test failures.** The same tests pass serially/with 2 workers.
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M7** (user chose not to connect them yet; no credentials
  here). The two new coverage exclusions (`exercise-dependencies.ts`, `exercises/db/client.ts`) are mirrored in `vitest.config.ts`
  and `sonar-project.properties` but untested against a real instance.
- Accessibility rests on role/label/keyboard tests, a Playwright keyboard flow and manual review; there is no axe-style scanner.
- Repository tests run on PGlite (serialises queries): constraints, the `jsonb` column and the latest-attempt SQL are proved; true
  multi-connection concurrency on Neon/Postgres is not. Web bundle is 537 kB (520 kB at M6; Vite warns above 500 kB).

## Earlier milestones (short)

- **M6 (lessons)**: a lesson is a content item; `lesson_progress` per student; `/learn/lessons` pages — [ADR-019](../docs/adr/adr-019-lessons.md).
- **M5 (languages & content)**: validated JSON under `content/languages/`, `ContentRepository` port, four public read-only catalog
  endpoints, `/learn` pages, fictional-language extensibility tests — [ADR-018](../docs/adr/adr-018-content-languages.md).
- **M4 (student profile)**: `GET`/`PATCH /profile` on the session user only — [ADR-017](../docs/adr/adr-017-student-profile.md).
  A local Jenkins (Multibranch `TFM-BIC`, containers in WSL Ubuntu) and SonarQube exist but no build result was ever read back.
- **M3 (auth)**: register/verify/login/logout/reset, server-side sessions, Argon2id, rate limits, `Origin` CSRF check,
  in-memory email only — ADR-006, [security-baseline](../docs/security/security-baseline.md).

## What does NOT exist yet (do not assume otherwise)

- Points, XP, achievements, streaks, leaderboards, scoring/progress rollups (M8+), adaptive learning, recommendations, spaced
  repetition, vocabulary/phonetics content, teacher dashboard, subscriptions, newsletter, account deletion/data export, AI
  services, audio/video generation, pronunciation.
- More exercise types (matching, ordering, fill-in-the-blank, listening, …), an exercise editor/CMS, an attempt-history endpoint,
  pagination of exercise lists, attempt retention/deletion workflows.
- Block-level resume in a lesson; a lesson-completed event; more than one real language or any level beyond Polish A1; CEFR
  descriptors; interface localisation; persistence of a student's chosen language/level (enrolment); content hot-reload.
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step.

## Pending decisions

None block M8. Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; a deployment must ship `content/` with
the API (or set `CONTENT_DIR`) and run the Identity, Profile, Lessons and Exercises migrations in that order (Profile, Lessons and
Exercises are independent of each other; all reference `users`).

## Known risks / rough edges

- **The correct answer is shown after every submission** (including the first wrong one), so a student can retry with it in view —
  a product choice for practice, recorded in ADR-020; revisit if a later milestone wants exam-like behaviour.
- **Case-insensitive text comparison uses the runtime's ICU** (`toLocaleLowerCase(languageId)`); verified on Node 24 only.
- **Attempt immutability rests on the absence of any update/delete path**, not on a database trigger; attempts are kept until user
  deletion (later GDPR milestone) and outlive an archived exercise (not listed, harmless).
- **Lesson bodies are still public** via M5's `GET /content/:id`; exercise content is only reachable through the authenticated API.
- **`/learn/pl/a1` (public content browser) and `/learn/lessons` (student lessons) overlap** in what they show.
- **Content changes need a restart/release** (read once at start-up); invalid content or exercises stop the API from starting.
- **`/profile` is both page and API path** (only the Vite dev proxy separates them; ADR-017). M5–M7 avoided repeating this.
- Merely opening a lesson marks it in progress (by design); a failed `start` is silent.
- The skip-to-content link in the root layout still uses white on the orange accent (~2.8:1).
- Profile routes have no rate limit; no unsaved-changes guard; names stored as typed (escape on output).
- Four `pg` pools per API process (identity, profile, lessons, exercises); real Neon connectivity unverified.
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for the exercise routes too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.
- Full Playwright runs are memory-hungry (Vite + API with in-process Postgres + Chromium workers); use `--workers=2` on small machines.
- Commit order: `feat(exercises): add exercise API` imports `loadContentRepositories`, which was committed in the next commit
  (`serve content and exercises from one validated catalog`), so that intermediate commit does not build on its own.

## Next milestone

`M8 — Gamification` (not started).
