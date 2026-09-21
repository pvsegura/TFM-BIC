# Current State

Last updated: 2026-09-21

## Milestone

**M8 — Gamification** — implemented on `feature/gamification`, branched from `feature/exercises` (M7) → `feature/lessons` (M6)
→ `feature/content-languages` (M5) → `feature/student-profile` (M4) → `feature/authentication` (M3) →
`ci/jenkins-sonarqube` (M1+M2); `main` only has M0. **`feature/exercises` and `feature/gamification` are not pushed and
nothing is merged**; Jenkins/SonarQube are deliberately not connected (M6 was pushed on 2026-09-21). M0–M7 remain the base —
see [docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists (M8)

The first gamification layer: points, their history, achievements and their automatic unlocking. Rationale and trade-offs:
[ADR-021](../docs/adr/adr-021-gamification.md); reference:
[gamification-architecture.md](../docs/architecture/gamification-architecture.md), [docs/api/README.md](../docs/api/README.md).

- **Points are an append-only ledger and the single source of truth**: `point_transactions` (identity id, `user_id` FK cascade,
  `reason`, `source_id`, `amount` 1–10 000, `created_at` from the `Clock`), **unique per `(user_id, reason, source_id)`**, index
  `(user_id, id)`, `CHECK`s on reason/source/amount and a **`BEFORE UPDATE` trigger that refuses edits**. There is no
  `total_points` anywhere: a total and the per-reason counts come from one `GROUP BY` aggregate. Nothing else stores points.
- **Reward rules** (domain, one place): **+10** the first time a student answers a given exercise correctly, **+25** the first
  time they complete a given lesson, **+50** (the rule's own `rewardPoints`) the first time they unlock an achievement.
  Repeats, wrong answers and concurrent duplicates pay 0. Attempts and lesson progress are untouched (M7/M6 use cases are
  reused as they are and wrapped: `SubmitExerciseAnswerWithRewardsUseCase`, `CompleteLessonWithRewardsUseCase`).
- **Only `AwardRewardsUseCase` creates points.** It runs inside `GamificationRepository.transactionForUser` — one PostgreSQL
  transaction that first takes a **per-student advisory lock** — and writes the reward, every unlocked achievement and each
  achievement's own payout together or not at all. Idempotency is the database's: `INSERT … ON CONFLICT DO NOTHING …
RETURNING` on the unique keys, never check-then-write. A failure is a `RewardAwardError` (reason + source id, no student).
- **Achievements are rules in code** (`AchievementRule`: key, icon id, reward, triggering event types, `progress(facts)`) in a
  validated `AchievementRegistry` — no `achievements` table (ADR-021 §5). Four exist: `first-exercise`, `first-lesson`,
  `ten-correct-exercises` (10 **distinct** rewarded exercises), `hundred-points` (total ≥ 100). Rules read `GamificationFacts`
  derived from the ledger only, are evaluated **on events** (`exercise-completed`, `lesson-completed`, `points-awarded`) —
  never on reads — and can chain (a lesson can unlock `first-lesson`, whose +50 crosses 100 and unlocks `hundred-points`).
  `user_achievements` (PK `(user_id, achievement_key)`) stores what a student unlocked. Titles/descriptions are a
  `AchievementTextCatalog` (locale → key → text) validated at start-up; only English exists; keys are language-neutral.
- **API** (authenticated, `private, no-store`, 120/min): `GET /gamification/summary`, `/achievements`,
  `/point-transactions?limit=&before=` (keyset paging, digits-only). **Read-only, no `:userId`, any undocumented query key is a
  `400`, no route creates points.** `POST /exercises/:id/answer` and `POST /lessons/:id/complete` now return `rewards`
  (`{ pointsAwarded, achievementsUnlocked[] }`); their strict bodies are unchanged. A reward that cannot be stored is a generic
  `500`; the attempt/completion stays and repeating the action grants it (ADR-021 §4).
- **Frontend**: `/dashboard` is now real (one request for the points card), `/achievements` lists every achievement (locked or
  unlocked, in words and by icon, with a native `<progress>`) plus the paged history; a `RewardNotice` appears inside the exercise
  verdict and the lesson completion live regions (nothing for a repeat or a wrong answer); nav link "Achievements". TanStack
  Query root `["gamification", …]` is user-scoped and invalidated after an action that earned points. No animation exists, so
  reduced motion needs nothing.
- **Side changes**: the lessons and exercises services share `services/api-request.ts` (they had identical copies); the 401
  helper moved to `session-cache.ts`; the `api` and `web` Vitest projects got a 30 s timeout (see Verification); two M6/M7 E2E
  assertions were updated for the new response shape.
- **Not built, on purpose**: streaks, leaderboards, rankings, XP levels, spending points, notifications, backfill/reconciliation
  jobs, a balance projection, an achievements table.

## Verification (M8, run locally on 2026-09-21)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 content items, 9 exercises), `lint`, `typecheck`,
  `build`: pass. `format:check`: passes for everything committed (only the user's separate uncommitted `README.md` edit is flagged).
- **2513 Vitest tests / 184 files: 2508 pass, 5 skipped** (the opt-in real-Postgres file), 0 fail — domain 478, contracts 495,
  application 272, data 258 (253 + 5 skipped), config 12, api 383, web 584, ui 30, shared 1 (2127 / 164 files at end of M7).
  Coverage **97.13% statements / 92.48% branches / 97.43% functions / 97.02% lines** (thresholds 80/75/80/80). The gamification code:
  domain 100%, application 98.4% lines / 93.2% branches, data 93.6%, contracts 100%, api 98.1%, web 98.6%.
- **121 Playwright E2E tests pass** (103 + 18 in `tests/e2e/gamification.spec.ts`) with `--workers=2`. Ports 3000 and 5173 must be
  free; the machine's memory rules from M7 still apply (a crash under 4 workers is an invalid run).
- **Real PostgreSQL 17** (throwaway container from the project's own dev image, on port 55432, removed afterwards): all five
  migration sets applied with the real `drizzle-kit` CLI on an empty database, re-applied as a no-op, the trigger refused an
  `UPDATE`, the unique constraint refused a duplicate reward, and a manual rollback (drop trigger/function/tables, delete the
  tracking rows) re-applied cleanly — drizzle-kit has no down migrations. The opt-in `gamification.repository.postgres.test.ts`
  (`TEST_DATABASE_URL`) passed 5/5 with 12 connections; **with the advisory lock removed the threshold-race and blocking tests
  fail while the unique-constraint test still passes** (mutation check), which is why both layers exist.
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M8** (user chose not to connect them; no credentials here;
  the branch is not pushed). The two new coverage exclusions (`gamification-dependencies.ts`, `gamification/db/client.ts`) are
  mirrored in `vitest.config.ts` and `sonar-project.properties` but untested against a real instance.
- Two **load-related test timeouts** appeared in a full parallel coverage run (six first-tests of the api route files at 5 s, and
  earlier a source-scanning test and one jsdom test): all passed alone in under a second and the api/web projects now have a
  30 s timeout (commit `test: give the api and web projects a load-tolerant timeout`). One M7 Playwright test that reads response
  bodies (`exercises.spec.ts` "neither the exercise page's responses…") failed once in a full run ("body not available for a
  response that was navigated away from") and passed in every rerun — a pre-existing race in that test, not touched.
- Accessibility rests on role/label/keyboard tests, a Playwright keyboard flow and manual review; there is no axe-style scanner.

## Earlier milestones (short)

- **M7 (exercises)**: an exercise is a content file; three types via `ExerciseTypeRegistry`; the server judges every answer;
  append-only `exercise_attempts`; pages at `/learn/exercises` — [ADR-020](../docs/adr/adr-020-exercises.md).
- **M6 (lessons)**: a lesson is a content item; `lesson_progress` per student; `/learn/lessons` pages — [ADR-019](../docs/adr/adr-019-lessons.md).
- **M5 (languages & content)**: validated JSON under `content/languages/`, `ContentRepository` port, four public read-only catalog
  endpoints, `/learn` pages, fictional-language extensibility tests — [ADR-018](../docs/adr/adr-018-content-languages.md).
- **M4 (student profile)**: `GET`/`PATCH /profile` on the session user only — [ADR-017](../docs/adr/adr-017-student-profile.md).
  A local Jenkins (Multibranch `TFM-BIC`, containers in WSL Ubuntu) and SonarQube exist but no build result was ever read back.
- **M3 (auth)**: register/verify/login/logout/reset, server-side sessions, Argon2id, rate limits, `Origin` CSRF check,
  in-memory email only — ADR-006, [security-baseline](../docs/security/security-baseline.md).

## What does NOT exist yet (do not assume otherwise)

- Streaks, XP levels, leaderboards/rankings, daily goals, challenges, spending or transferring points, notifications, a reward
  marketplace, scoring/progress rollups beyond the ledger, adaptive learning, recommendations, spaced repetition,
  vocabulary/phonetics content and their rewards, teacher dashboard, subscriptions, newsletter, account deletion/data export, AI
  services, audio/video generation, pronunciation.
- More exercise types (matching, ordering, fill-in-the-blank, listening, …), an exercise editor/CMS, an attempt-history endpoint,
  pagination of exercise lists, attempt retention/deletion workflows.
- Block-level resume in a lesson; more than one real language or any level beyond Polish A1; CEFR descriptors; **interface
  localisation** (only the achievement texts have a locale seam); persistence of a student's chosen language/level (enrolment);
  content hot-reload.
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests, and the
  one-off Postgres 17 check above).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step; a Postgres service in CI (the
  multi-connection test is opt-in).

## Pending decisions

None block M9. Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; a deployment must ship `content/` with
the API (or set `CONTENT_DIR`) and run the Identity, Profile, Lessons, Exercises and **Gamification** migrations in that order
(Profile, Lessons, Exercises and Gamification are independent of each other; all reference `users`).

## Known risks / rough edges

- **A reward can lag its action.** The attempt/completion and the ledger are different stores (different pools), so a failed
  reward step leaves the attempt or completion in place and answers `500`; the reward is granted when the action is repeated (the
  next correct answer to that exercise, the next completion of that lesson). A student who never repeats has an attempt without
  its reward. There is no reconciliation job (out of M8's scope).
- **The total is an aggregate over the student's rows on every read** (served by an index). Fine for thousands of rows; a heavy
  user would want a rebuildable balance projection (ADR-021 §1) — not built.
- **New achievements are not backfilled**: a new rule evaluates on the student's next relevant event, against the whole ledger.
- **The advisory lock is proved on real Postgres only by an opt-in test** (PGlite serialises everything); CI does not run it.
- **Ledger rows are kept until user deletion** (`ON DELETE CASCADE`); the later GDPR milestone must decide retention/export.
- **`ten-correct-exercises` is not reachable end to end** with the shipped content (nine exercises); it is proved below the UI.
- **The correct answer is shown after every submission** (M7 practice mode), so a student can retry with it in view and still be
  rewarded only once per exercise — points therefore measure "first correct answer", not mastery.
- **Case-insensitive text comparison uses the runtime's ICU** (`toLocaleLowerCase(languageId)`); verified on Node 24 only.
- **Attempt immutability rests on the absence of any update/delete path**, not on a database trigger (unlike the points ledger).
- **Lesson bodies are still public** via M5's `GET /content/:id`; exercise content is only reachable through the authenticated API.
- **`/learn/pl/a1` (public content browser) and `/learn/lessons` (student lessons) overlap** in what they show.
- **Content changes need a restart/release** (read once at start-up); invalid content or exercises stop the API from starting.
- **`/profile` is both page and API path** (only the Vite dev proxy separates them; ADR-017). M5–M8 avoided repeating this.
- Merely opening a lesson marks it in progress (by design); a failed `start` is silent.
- The skip-to-content link in the root layout still uses white on the orange accent (~2.8:1).
- Profile routes have no rate limit; no unsaved-changes guard; names stored as typed (escape on output).
- **Five `pg` pools per API process** (identity, profile, lessons, exercises, gamification); real Neon connectivity unverified.
- The web bundle is 548 kB (537 kB at M7; Vite warns above 500 kB).
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for the gamification reads too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.
- Full Playwright runs are memory-hungry (Vite + API with in-process Postgres + Chromium workers); use `--workers=2` on small machines.
- Fastify's default `404` body echoes the requested path (`Route GET:/… not found`) for every unknown route, including guessed
  gamification paths; it carries no data, and it predates M8.

## Next milestone

`M9 — Vocabulary` (not started).
