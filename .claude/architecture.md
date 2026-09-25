# Architecture Summary

Full detail: [docs/architecture/](../docs/architecture/). This is the condensed version for
between-session recall — don't treat it as more authoritative than the linked docs.

## Layering (strict, one direction)

```
React UI -> hooks/presentation services -> API client -> Contracts
  -> Node API (routes/controllers) -> Application (use cases) -> Domain
  -> Repository interfaces -> Data/Infrastructure -> PostgreSQL
```

Domain (`packages/domain`) imports nothing external — no infra, no PostgreSQL client, no Gemini/
Hyperframes SDK, no React (`packages/shared`'s pure type utilities are the one allowed dependency).
This is the rule most likely to be violated by a careless change — check it before adding an
import to anything in `packages/domain` or `packages/application`. Enforced by an ESLint
`no-restricted-imports` rule scoped to both `packages/domain/src/**` and
`packages/application/src/**` in `eslint.config.mjs`, plus code review — see
`packages/domain/src/identity/` → `packages/application/src/identity/` →
`packages/data/src/identity/` (Drizzle/Argon2/Crypto adapters) → `apps/api/src/routes/
auth.route.ts` for the full, real Identity & Authentication chain (M3), or
`packages/domain/src/profile/` → `packages/application/src/profile/` →
`packages/data/src/profile/` → `apps/api/src/routes/profile.route.ts` for the Student Profile chain
(M4), or `apps/api/src/routes/health.route.ts` for the smaller M1 example.

## External services

Never called directly from domain/application logic. Always: interface (owned by
application/contracts) → adapter (in `packages/data`) → real provider.
`VideoGenerationService` → `FakeVideoGenerationService` (default everywhere — dev, test, CI) or
`HyperframesCliProvider` (real, `VIDEO_GENERATION_PROVIDER=hyperframes` only, implemented but
**unverified end-to-end** — see ADR-012 and `content/video-scripts/README.md`) → Hyperframes (M11).
`AudioGenerationService` → `GeminiAudioProvider` → Gemini API (not yet implemented — M12+).
`EmailService` → `InMemoryEmailService` (the only adapter wired — no real provider account
exists; Resend is the documented target, ADR-014).

## Content

`content/languages/<code>/language.json` + `levels/<levelId>/content/<contentId>.json` — validated JSON,
the single source of truth, read once at API start-up through the `ContentRepository` port
(`packages/data` file-system adapter). Never branch on language identity; parameterize by `languageId`.
CEFR levels are a fixed constant (`CEFR_LEVELS`, domain); per-language availability (`available` |
`planned`) is data. Visibility rules (active / available / published, explicit order) are enforced by
the application use cases. Public read-only API; UI under `/learn`. See
[docs/architecture/content-architecture.md](../docs/architecture/content-architecture.md) and
[ADR-018](../docs/adr/adr-018-content-languages.md).

## Lessons

A lesson is an M5 content item of `type: "lesson"` (`LessonId` = `ContentId`); progress is the only thing stored
per student (`lesson_progress`, its own `packages/data/src/lessons/` context). `ListLessons`/`GetLesson`/
`StartLesson`/`CompleteLesson` sit on the content use cases and a `LessonProgressRepository` port with atomic
`start`/`complete`. Four authenticated routes under `/lessons`; pages under `/learn/lessons`. See
[ADR-019](../docs/adr/adr-019-lessons.md) and the Lessons section of
[content-architecture.md](../docs/architecture/content-architecture.md).

## Exercises

An exercise is content (a validated file tied to a lesson; `ExerciseId` is permanent), evaluated by a per-type
strategy: each type owns its configuration, a pure `parseAnswer`/`evaluate` pair and a presenter, dispatched by an
`ExerciseTypeRegistry` (no `if (type === …)` chain). Only `exercise_attempts` — append-only, one row per submitted
answer — is stored (own `packages/data/src/exercises/` context). `ListLessonExercises`/`GetExercise`/
`SubmitExerciseAnswer` sit on the lesson/content visibility use cases; three authenticated routes; pages under
`/learn/exercises`. See [ADR-020](../docs/adr/adr-020-exercises.md) and
[exercise-architecture.md](../docs/architecture/exercise-architecture.md).

## Gamification

Points are a domain concept: an **append-only ledger** (`point_transactions`, unique per `(user, reason, source)`) is the
single source of truth — a total is derived, never stored. Rewards (+10 first correct answer to an exercise, +25 first
completion of a lesson, +50 per achievement) are granted only by `AwardRewardsUseCase`, wrapped around the unchanged
M7/M6 use cases (`SubmitExerciseAnswerWithRewards`, `CompleteLessonWithRewards`), in **one transaction exclusive per
student** (advisory lock). Achievements are `AchievementRule`s in a validated `AchievementRegistry` (code, not a table),
evaluated on domain events from the ledger's facts; `user_achievements` stores what a student unlocked. Its own
`packages/data/src/gamification/` context; three read-only authenticated routes under `/gamification`; pages `/dashboard`
and `/achievements`. See [ADR-021](../docs/adr/adr-021-gamification.md) and
[gamification-architecture.md](../docs/architecture/gamification-architecture.md).

## Vocabulary

An entry is content — a validated file grouped in a category of its own language
(`content/languages/<code>/vocabulary/<categoryId>.json`), read through a `VocabularyRepository` port, the same
loaded-once-at-startup approach as lessons and exercises. Only a student's **relationship to a word**
(`saved`/`learning`/`learned`, `new` derived) is stored, in `user_vocabulary` — its own
`packages/data/src/vocabulary/` context. Save/status-change are atomic (`INSERT … ON CONFLICT DO UPDATE`, the
allowed-transition SQL generated from the domain's own rule list); a refused step is reported (`409`), not a silent
no-op. A shared query engine (`queryVisibleVocabulary`) backs both browsing and "My Vocabulary" so the two can never
disagree about visibility, filters or order. Eight authenticated routes under `/vocabulary`/`/user-vocabulary`;
pages under `/learn/vocabulary`. A `VocabularyItemLearnedEvent` is published through a `VocabularyEventPublisher`
port (no-op in M9) so gamification can react later without a direct dependency. See
[ADR-022](../docs/adr/adr-022-vocabulary.md).

## Monorepo layout

`apps/{web,api}`, `packages/{domain,application,contracts,data,shared,ui,config,testing}`,
`content/`, `infrastructure/`, `tests/{e2e,integration}`, `docs/`, `.claude/`. Full rationale:
[docs/architecture/folder-structure.md](../docs/architecture/folder-structure.md). Tooling: pnpm
workspaces ([ADR-002](../docs/adr/adr-002-monorepo.md)); every workspace package's `main`/`types`
point at `src/index.ts` (TypeScript source, not a pre-built `dist/`) — Vite/Vitest/`tsx` all
transpile on the fly, so there's no build-order coupling in dev. `pnpm -r <script>` still runs in
each package's own dependency order.

## Bounded contexts

Identity & Auth, Users, Student Profile, Teachers/Students, Languages, Courses/Levels, Lessons,
Exercises, Scoring/Progress, Gamification, Vocabulary, Phonetics, Media, Email, Newsletter,
Subscriptions, Invitations, Privacy & Data Management. Relationships:
[docs/architecture/domain-model.md](../docs/architecture/domain-model.md).

## Key constraint

No AWS. No microservices/CQRS/event-sourcing without a documented ADR justifying the exception —
default is modular monolith.
