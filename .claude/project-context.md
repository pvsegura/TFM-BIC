# Project Context

Language-learning platform (first language: Polish, architected for many more). Modular
monolith, TypeScript monorepo, Clean/Hexagonal layering. **Milestones 0–10 complete**
(architecture/governance, monorepo/tooling, CI/CD, Identity & Authentication, Student Profile,
Content & Languages, Lessons, Exercises, Gamification, Vocabulary, Phonetics) —
see [current-state.md](current-state.md) for what that means concretely.

## Quick facts

- Repo: `pvsegura/TFM-BIC` on GitHub, `main` branch protected, `develop` for integration; M3 was
  built on `feature/authentication`, M4 on `feature/student-profile` (branched from it).
- Stack: React/Vite/TS (frontend), Node/TS/Fastify (backend), PostgreSQL — Neon (provider,
  ACCEPTED, account provisioning deferred) accessed via Drizzle ORM, Jenkins + SonarQube for
  CI/CD/quality.
- No AWS, anywhere, ever.
- External AI services: Hyperframes (video, self-hosted OSS) and Gemini API (audio TTS, Preview
  status) — both isolated behind service interfaces, neither implemented yet (later milestone).
- TDD is mandatory (RED/GREEN/REFACTOR) for all feature work.
- Authentication (M3): server-managed sessions via a signed HttpOnly/SameSite=Strict cookie,
  Argon2id password hashing, email verification + password reset with single-use expiring
  tokens, STUDENT/TEACHER role model — see [ADR-006](../docs/adr/adr-006-authentication.md).
- Student Profile (M4): first/last name, nickname and a predefined avatar (no upload), in its own
  `student_profiles` table keyed to `users`; identity (email, role) stays on `users`. The two
  routes `GET /profile` and `PATCH /profile` act only on the session's user — see
  [ADR-017](../docs/adr/adr-017-student-profile.md).

- Languages & Content (M5): languages, CEFR level availability and educational content are validated
  JSON under `content/languages/<code>/` (the single source of truth, no DB copy), read through a
  `ContentRepository` port and served by four **public, read-only** endpoints (`GET /languages`,
  `/languages/:c/levels`, `/content`, `/content/:id`). Adding a language or level is data only —
  `pnpm content:validate`. Polish A1 has a small seed set (not a course). UI pages live under
  `/learn`. See [ADR-018](../docs/adr/adr-018-content-languages.md).

- Lessons (M6): a lesson is an M5 content item of `type: "lesson"` (identity = its `ContentId`; no lessons
  table, no copy). Only a student's **progress** is stored (`lesson_progress`, PK `(user_id, lesson_id)`,
  `in_progress` | `completed`; "not started" is derived). Four **authenticated** routes (`GET /lessons`,
  `GET /lessons/:id`, `POST /lessons/:id/start`, `POST /lessons/:id/complete`); the user is always the
  session's and the POSTs take no body. Completion is explicit and idempotent; resume position within a
  lesson is not stored. Pages live at `/learn/lessons[/:lessonId]` because `/lessons` is the API path. See
  [ADR-019](../docs/adr/adr-019-lessons.md).

- Exercises (M7): an exercise is content — a validated file under `levels/<level>/exercises/` tied to a lesson —
  with three types (`multiple-choice`, `text-answer`, `true-false`), each with its own configuration schema, pure
  evaluator and presenter behind an `ExerciseTypeRegistry`. The **server judges every answer**; the client sends only
  `{ answer }`; answer keys never appear before an answer. Only `exercise_attempts` is stored — **append-only, every
  well-formed submission is an attempt**, retries included; the current result is derived. Three **authenticated**
  routes (`GET /lessons/:id/exercises`, `GET /exercises/:id`, `POST /exercises/:id/answer`); pages at
  `/learn/exercises/:exerciseId` because `/exercises` is the API path. Polish A1 has nine seed exercises (not a bank).
  See [ADR-020](../docs/adr/adr-020-exercises.md).

- Gamification (M8): points are an **append-only ledger** (`point_transactions`) — the single source of truth, no stored
  balance; a reward is identified by `(user, reason, source)` and is unique in the database, so repeats and concurrent
  requests pay once. Rewards: +10 the first correct answer to an exercise, +25 the first completion of a lesson, +50 per
  achievement (`first-exercise`, `first-lesson`, `ten-correct-exercises`, `hundred-points`, defined as rules in code with
  language-neutral keys and localisable texts). Only `AwardRewardsUseCase` creates points, inside the exercise/lesson use
  cases, in one transaction per student. Three **authenticated, read-only** routes (`GET /gamification/summary`,
  `/achievements`, `/point-transactions`); the answer and lesson-completion responses carry a `rewards` field. Pages are
  `/dashboard` and `/achievements`. See [ADR-021](../docs/adr/adr-021-gamification.md).

- Vocabulary (M9): an entry is content — a validated file under `content/languages/<code>/vocabulary/<categoryId>.json`,
  grouped by category, with optional grammar (`partOfSpeech`, `gender`, `plural`) and an optional CEFR-style `levelId`.
  Only a student's **relationship to a word** is stored (`user_vocabulary`, PK `(user_id, vocabulary_item_id)`,
  `saved` | `learning` | `learned`; "new" is derived). Save/unsave/mark-learned/set-status are atomic; a status step
  the domain refuses is a `409`, not a silent no-op. Eight **authenticated** routes (`GET /vocabulary`,
  `/vocabulary/categories`, `/vocabulary/:id`, `/user-vocabulary`, `POST /vocabulary/:id/save|unsave|learned`,
  `PUT /vocabulary/:id/status`); pages at `/learn/vocabulary[/mine][/:vocabularyId]` because `/vocabulary` and
  `/user-vocabulary` are API paths. A `VocabularyItemLearnedEvent` is published (no-op listener) so a future reward
  can be added without coupling vocabulary to gamification. Polish has a six-category, ~30-entry seed set (not a
  course). See [ADR-022](../docs/adr/adr-022-vocabulary.md).

- Phonetics (M10): a representation is content — a validated file under
  `content/languages/<code>/phonetics/<topicId>.json`, optionally grouped by topic (unlike vocabulary's
  always-required category), with required `ipa` (Unicode text) and `description`, and optional `levelId`, `note`,
  `exampleWords` (free text, never a `VocabularyItemId` — Phonetics shares no data with Vocabulary). Only a
  student's **progress** is stored (`user_phonetic_progress`, PK `(user_id, phonetic_representation_id)`,
  `viewed` | `practiced` | `completed`; forward-only, no backward step at all, unlike vocabulary). Opening a
  representation's detail page records a view automatically, every time. Six **authenticated** routes
  (`GET /phonetics`, `/phonetics/topics`, `/phonetics/:id`, `POST /phonetics/:id/view|practice|complete`); pages at
  `/learn/phonetics[/:phoneticId]` because `/phonetics` is the API path. A vocabulary entry links to its language's
  phonetics hub ("View pronunciation guide") — UI only, no shared id. Polish has a two-topic, eight-representation
  seed set with IPA sourced from standard phonology references (not a full inventory). See
  [ADR-023](../docs/adr/adr-023-phonetics.md).

## Where things live

- Full architecture: [docs/architecture/](../docs/architecture/)
- Decisions: [docs/adr/](../docs/adr/) — check status (`ACCEPTED` vs `PENDING`) before assuming a
  decision is final.
- Product scope: [docs/product/](../docs/product/)
- Current milestone status: [current-state.md](current-state.md)
- Conventions (git, commits, testing, layering rules): [conventions.md](conventions.md)
- Full architecture summary for quick recall: [architecture.md](architecture.md)

## Read this first, every session

[current-state.md](current-state.md) — tells you what milestone is active and what's actually
been built vs. only documented.
