# Current State

Last updated: 2026-09-22

## Milestone

**M9 — Vocabulary** — implemented on `feature/vocabulary`, branched from `feature/gamification` (M8) → `feature/exercises` (M7)
→ `feature/lessons` (M6) → `feature/content-languages` (M5) → `feature/student-profile` (M4) → `feature/authentication` (M3) →
`ci/jenkins-sonarqube` (M1+M2); `main` only has M0. **`feature/exercises`, `feature/gamification` and `feature/vocabulary` are
not pushed and nothing is merged**; Jenkins/SonarQube are deliberately not connected (M6 was pushed on 2026-09-21; nothing since).
M0–M8 remain the base — see [docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists (M9)

A vocabulary system that works the same way for every language: entries as content, a student's saved/learning/learned status
as the only per-student state. Rationale and trade-offs: [ADR-022](../docs/adr/adr-022-vocabulary.md); reference:
[content-architecture.md](../docs/architecture/content-architecture.md#vocabulary-m9), [docs/api/README.md](../docs/api/README.md).

- **A vocabulary entry is content, grouped in a category of its own language** — a file, like a lesson or an exercise, at
  `content/languages/<code>/vocabulary/<categoryId>.json`. One file holds one category (`id`, `status`, `order`, `title`,
  `description?`, `instructionLanguage`) and its entries; an entry inherits `languageId`/`categoryId`/`instructionLanguage`
  from the file, never repeats them. Required per entry: `id`, `lemma`, `translation`, `status`, `order`. Optional:
  `levelId` (pedagogical placement, not certification), `partOfSpeech`, `gender`, `plural`, `note`, `example`. No
  `vocabulary`/`vocabulary_categories` table — same content-is-files decision as M5–M8.
- **Ids are stable slugs, language-prefixed, never derived from the lemma** (a lemma may carry diacritics or be a phrase); a
  category id is the same slug shape but shared across languages (`food` in every language's own folder).
- **Lemma, not word form.** M9 models one lexical unit per entry (dictionary form) plus, optionally, its `plural` — the one
  inflection fact a beginner meets first. No conjugation/declension/word-form engine; the shape does not block adding one
  later (ADR-022 §3).
- **`validateVocabulary`** (domain) checks the whole catalog: unique category ids per language, unique entry ids across the
  catalog, an entry's category existing in its own language, unique order, and the same availability standard as lessons and
  exercises (published only in an available level and a published category; a published category always has ≥1 published entry).
- **A student's status on a word is the only thing stored**: `user_vocabulary` (PK `user_id, vocabulary_item_id`, FK cascade,
  `saved`/`learning`/`learned`, `learned_at` set iff `learned`; "not stored" = `new`). Transitions: forward always allowed
  (skipping a step), `learned → learning` allowed, every other step back refused — `ALLOWED_STATUS_CHANGES` (domain, a plain
  list) is the single source the SQL `CASE` is generated from, so the two cannot drift.
- **Save, unsave, mark-learned, set-status** are built on two atomic Postgres primitives (`INSERT … ON CONFLICT DO UPDATE`):
  `save` never regresses a word; `changeStatus` applies the target only when the transition is allowed, else leaves the row
  untouched — proved with two concurrent writers landing on exactly one row in a legal state, on real Postgres. `unsave`
  deletes the row (idempotent) and is the only way back to `new`. Marking a word learned is never refused.
- **Browsing and "My Vocabulary" share one query engine** (`queryVisibleVocabulary`): visibility, language/level/category/
  search/status filters, deterministic order (category, then entry, ties by id), a cursor page, one batched user-state lookup
  per page — so the two views can never disagree about what "visible" or "in order" means. Search (`foldForSearch`/
  `matchesVocabularySearch`) folds case, diacritics and a small set of undecomposable Latin letters, then matches a plain
  substring — never a regex/SQL pattern built from the search term, no full-text index, no external engine.
- **API** (authenticated, `private, no-store`): `GET /vocabulary` (list, filtered/searched/paged, 120/min), `GET
/vocabulary/categories` (topics + progress, 120/min), `GET /vocabulary/:id` (detail, 120/min), `GET /user-vocabulary` (My
  Vocabulary, same shape restricted to touched words, 120/min), `POST /vocabulary/:id/save|unsave|learned` (60/min, no body),
  `PUT /vocabulary/:id/status` (60/min, `{status}` only). No `:userId` anywhere; an undocumented query key or body field is a
  `400`; a refused status step is `409` with the record left untouched.
- **`VocabularyItemLearnedEvent`** is published (domain shape, no broker) through a `VocabularyEventPublisher` port on every
  word that _becomes_ learned; M9 wires `NoopVocabularyEventPublisher`. No new `RewardReason`, no call to
  `AwardRewardsUseCase` — vocabulary earns nothing yet, per the brief; a future reward is a new listener, not a new coupling
  (ADR-022 §12, echoed in [gamification-architecture.md](../docs/architecture/gamification-architecture.md)).
- **Frontend**: nav link "Vocabulary"; `/learn/vocabulary` (browse: language picker, category cards with progress, search +
  category + status filters, a card per word with Save/Remove and Mark-as-learned); `/learn/vocabulary/mine` (My Vocabulary,
  same filters, only touched words); `/learn/vocabulary/:vocabularyId` (detail: every grammar fact the entry has, an example,
  the actions). Save/unsave/mark-learned share one `VocabularyActions` component so the card and the detail view can never
  disagree about what a student may do with a word. Feedback is a live-region sentence, never colour alone. Pages are under
  `/learn` because `/vocabulary` and `/user-vocabulary` are the API paths (no `/profile`-style proxy bypass needed).
- **Content**: a small, original Polish seed set — six categories (`greetings`, `numbers`, `family`, `food`, `everyday`,
  `travel`), 29 entries. Grammatical gender follows the general Polish ending rule or a checked source (`tata`, masculine
  despite `-a`); a plural is given only for the three checked (`dom→domy`, `kot→koty`, `pies→psy`). Not a claim of CEFR
  coverage. See [content/languages/pl/vocabulary/README.md](../content/languages/pl/vocabulary/README.md).
- **Not built, on purpose**: word-form/morphology beyond `plural`, spaced repetition (SM-2/FSRS), audio/pronunciation
  metadata population, cross-language search (display-language vs. learning-language), a reward for a learned word, admin/
  CMS authoring.

## Verification (M9, run locally on 2026-09-22)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 content items, 9 exercises, **29 vocabulary
  entries in 6 categories**), `lint`, `format:check` (passes for everything committed; only the user's separate uncommitted
  `README.md` edit is flagged), `typecheck`, `build`: **PASS**.
- **2895 Vitest tests / 206 files: 2890 pass, 5 skipped** (the opt-in real-Postgres gamification file, unrelated to M9), 0
  fail — domain 596 (+118), contracts 611 (+116), application 321 (+49), data 306 (+48, incl. the 5 skipped, unchanged),
  config 12, api 409 (+26), web 609 (+25), ui 30, shared 1 (2513 total at end of M8). Coverage **93.99% statements / 87.41%
  branches / 93.37% functions / 94.04% lines** (thresholds 80/75/80/80) — lower than M8's ~97% because the browse and My
  Vocabulary _pages_ (filters, category cards, pagination) have no dedicated component test, only the detail page and E2E do;
  still comfortably above every threshold. The vocabulary code itself: domain ~96–100%, application 94–100% (some use cases
  100%), data 86–100% (the no-op event publisher is the one 0%-covered file, by construction), contracts 100%, api ~89%, web
  service/hook/detail-page ~72–96% (the browse/mine pages are the coverage gap, see above).
- **126 Playwright E2E tests**: **124 pass, 2 failed in the one full-suite run** (`registration.spec.ts`'s duplicate-email
  test and `route-protection.spec.ts`'s second-route redirect, both pre-existing M3 specs untouched by M9) — both **passed
  when re-run in isolation** (4/4), confirming load-related flakiness under the full 126-test run on this machine, not a
  regression. `tests/e2e/vocabulary.spec.ts` (5 tests) passed on every run, isolated and full-suite. `--workers=2`; ports
  3000/5173 must be free.
- **Real PostgreSQL 17** (throwaway container from the project's dev image, port 55432, removed afterwards): all six
  migration sets (identity, profile, lessons, exercises, gamification, vocabulary) applied in dependency order with the real
  `drizzle-kit` CLI on an empty database, `user_vocabulary`'s migration re-applied as a no-op, the schema matched the
  Drizzle definition exactly (`\d user_vocabulary`), and a manual spot check confirmed the primary key refuses a duplicate
  `(user_id, vocabulary_item_id)`, the `learned`/`learned_at` CHECK refuses an inconsistent row, and deleting the user
  cascades to `user_vocabulary`. `packages/data`'s own PGlite-backed repository tests (20 tests) prove the same constraints
  plus two-concurrent-writer races more exhaustively; no opt-in multi-connection test was added for vocabulary (unlike
  gamification's), since `user_vocabulary` has no cross-row aggregate/advisory-lock concern to prove under real concurrency.
- **Content seed**: not a database seed script — vocabulary content is files, loaded and validated at API start-up and by
  `pnpm content:validate`, the same as every other content type since M5. Nothing to run twice and check for duplicates.
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M9** (the user explicitly said not to check them this
  session; the branch is not pushed). The new coverage exclusions (`apps/api/src/composition/vocabulary-dependencies.ts`,
  `packages/data/src/vocabulary/db/client.ts`) are mirrored in `vitest.config.ts` and `sonar-project.properties` but
  untested against a real SonarQube instance.

## Earlier milestones (short)

- **M8 (gamification)**: an append-only points ledger (`point_transactions`), reward rules (+10/+25/+50), achievements as
  code rules, one transaction per student with an advisory lock — [ADR-021](../docs/adr/adr-021-gamification.md).
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

- Spaced repetition (SM-2, FSRS), word-form/morphology beyond a lemma's plural, audio/pronunciation (metadata field exists
  conceptually in the architecture but no field was added speculatively, no Gemini TTS), phonetics (IPA, pronunciation
  scoring — M10), a reward for learned vocabulary, cross-language (display-vs-learning-language) search or content.
- Streaks, XP levels, leaderboards/rankings, daily goals, challenges, spending or transferring points, notifications, a reward
  marketplace, scoring/progress rollups beyond the ledger, adaptive learning, recommendations, teacher dashboard,
  subscriptions, newsletter, account deletion/data export, AI services, audio/video generation.
- More exercise types (matching, ordering, fill-in-the-blank, listening, …), an exercise editor/CMS, an attempt-history endpoint,
  pagination of exercise lists, attempt retention/deletion workflows.
- Block-level resume in a lesson; more than one real language or any level beyond Polish A1; CEFR descriptors; **interface
  localisation** (only the achievement texts have a locale seam); persistence of a student's chosen language/level (enrolment);
  content hot-reload.
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests, and
  one-off real-Postgres checks for M8 and M9).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step; a Postgres service in CI (the
  gamification multi-connection test is opt-in; vocabulary has no equivalent opt-in test, see Verification).
- Component-level unit tests for the vocabulary browse/My Vocabulary pages and their presentation sub-components (category
  list, filters, item card/list) — covered by the detail-page tests and `vocabulary.spec.ts` E2E only.

## Pending decisions

None block M10. Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; a deployment must ship `content/`
with the API (or set `CONTENT_DIR`) and run the Identity, Profile, Lessons, Exercises, Gamification and **Vocabulary**
migrations in that order (Profile, Lessons, Exercises, Gamification and Vocabulary are independent of each other; all
reference `users`).

## Known risks / rough edges

- **A `VocabularyItemLearnedEvent` has no real listener.** M9 does not grant points for vocabulary (the brief's explicit
  instruction); the event is published and discarded. A future reward needs a new listener, not a change to vocabulary itself.
- **`user_vocabulary` rows outlive an entry** that is later archived or removed from content: simply not listed, cleaned up
  only by user deletion (cascade) — same limitation ADR-020 documents for `exercise_attempts`.
- **Listing and pagination are in-memory**, sized for a content-file-bounded dataset like the rest of the catalog, not a
  growing table; if vocabulary content ever became large, only the `VocabularyRepository`/`queryVisibleVocabulary`
  implementation would need to change (ADR-022 §10).
- **Search is exact-substring on folded text**, not fuzzy, not full-text ranked; a misspelled query will not find a word.
- **No word-form/morphology system**: an entry's inflected forms beyond `plural` are not modelled.
- **The browse and My Vocabulary pages have no dedicated component test** (see Verification and "What does NOT exist yet").
- A reward can still lag its action for exercises/lessons (M8's known limitation, unchanged).
- The total gamification points figure is an aggregate over the student's rows on every read (M8's known limitation, unchanged).
- New achievements are not backfilled (M8's known limitation, unchanged).
- The gamification advisory lock is proved on real Postgres only by an opt-in test; CI does not run it (unchanged).
- Ledger and vocabulary rows are kept until user deletion (`ON DELETE CASCADE`); the later GDPR milestone must decide
  retention/export for both.
- `ten-correct-exercises` is not reachable end to end with the shipped content (nine exercises); proved below the UI (unchanged).
- The correct answer is shown after every exercise submission (M7 practice mode, unchanged).
- Case-insensitive exercise text comparison uses the runtime's ICU (`toLocaleLowerCase(languageId)`); verified on Node 24 only.
- Attempt immutability rests on the absence of any update/delete path, not a database trigger (unchanged).
- **Lesson bodies are still public** via M5's `GET /content/:id`; exercise and vocabulary content are only reachable through
  the authenticated API.
- **`/learn/pl/a1` (public content browser) and `/learn/lessons` (student lessons) overlap** in what they show (unchanged).
- **Content changes need a restart/release** (read once at start-up); invalid content, exercises or vocabulary stop the API
  from starting.
- **`/profile` is both page and API path** (only the Vite dev proxy separates them; ADR-017). M5–M9 avoided repeating this.
- Merely opening a lesson marks it in progress (by design); a failed `start` is silent.
- The skip-to-content link in the root layout still uses white on the orange accent (~2.8:1).
- Profile routes have no rate limit; no unsaved-changes guard; names stored as typed (escape on output).
- **Six `pg` pools per API process** (identity, profile, lessons, exercises, gamification, vocabulary); real Neon
  connectivity unverified.
- The web bundle is 565 kB (548 kB at M8; Vite warns above 500 kB).
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for vocabulary reads/writes too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.
- Full Playwright runs are memory-hungry (Vite + API with in-process Postgres + Chromium workers); use `--workers=2` on small
  machines; a load-related flake in the full 126-test run (two pre-existing M3 specs) passed in isolation — see Verification.
- Fastify's default `404` body echoes the requested path for every unknown route, including guessed vocabulary paths; it
  carries no data, and it predates M9.

## Next milestone

`M10 — Phonetics` (not started).
