# Current State

Last updated: 2026-09-23

## Milestone

**M10 — Phonetics** — implemented on `feature/phonetics`, branched from `feature/vocabulary` (M9) →
`feature/gamification` (M8) → `feature/exercises` (M7) → `feature/lessons` (M6) → `feature/content-languages` (M5) →
`feature/student-profile` (M4) → `feature/authentication` (M3) → `ci/jenkins-sonarqube` (M1+M2); `main` only has M0.
**`feature/exercises`, `feature/gamification`, `feature/vocabulary` and `feature/phonetics` are not pushed and
nothing is merged**; Jenkins/SonarQube are deliberately not connected (M6 was pushed on 2026-09-21; nothing since).
M0–M9 remain the base — see [docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists (M10)

A phonetics system that works the same way for every language: representations (sounds/IPA) as content, optionally
grouped by topic, a student's viewed/practiced/completed progress as the only per-student state — independent of
Vocabulary (M9), which it does not share data with. Rationale and trade-offs:
[ADR-023](../docs/adr/adr-023-phonetics.md); reference:
[content-architecture.md](../docs/architecture/content-architecture.md#phonetics-m10), [docs/api/README.md](../docs/api/README.md).

- **A phonetic representation is content, optionally grouped in a topic of its own language** — a file, like a
  lesson, exercise or vocabulary entry, at `content/languages/<code>/phonetics/<topicId>.json`. One file holds one
  topic (`id`, `status`, `order`, `title`, `description?`, `instructionLanguage`) and its representations; a
  representation inherits `languageId`/`topicId`/`instructionLanguage` from the file, never repeats them. Required
  per representation: `id`, `ipa`, `description`, `status`, `order`. Optional: `topicId` (**unlike vocabulary's
  always-required category** — not every sound needs a grouping), `levelId`, `note`, `exampleWords`
  (`{word, translation}[]`, free text, never a `VocabularyItemId`). No `phonetic_representations`/`phonetic_topics`
  table — same content-is-files decision as M5–M9.
- **IPA is Unicode text** validated the same bounded-plain-text way every content string is — no per-symbol
  allowlist, no image, no hard-coded symbol table. The IPA symbol always carries an explicit `aria-label` for
  screen readers.
- **`validatePhonetics`** (domain) checks the whole catalog: unique representation ids across the catalog, unique
  topic ids per language, a representation's topic existing in its own language when it names one, unique order
  within a topic, and the same availability standard as vocabulary (published only in an available level and a
  published topic when named; a published topic always has ≥1 published representation).
- **Progress only ever moves forward — `viewed → practiced → completed`, with no backward step at all** (unlike
  vocabulary's `learned → learning` correction: a sound has no honest "I forgot it"). `user_phonetic_progress` (PK
  `user_id, phonetic_representation_id`, FK cascade, `completed_at` set iff `completed`). Recording a view happens
  automatically when a representation's detail page opens, on **every** fresh open (not just the first, unlike a
  lesson's one-time start) — `recordView` never changes status, only refreshes `last_viewed_at`; `recordPractice`
  advances from `viewed` and always refreshes its own timestamp even past completion; `complete` is the only one
  fully idempotent once reached. Each is one atomic Postgres `INSERT … ON CONFLICT DO UPDATE`, proved with two
  concurrent writers landing on exactly one row in a legal state, on real Postgres.
- **A real race surfaced only through Playwright**: the automatic view-on-open request can still be in flight when
  a student acts, and if its response lands after the action's, a naive cache write would overwrite the
  further-along status. Guarded in the query-cache layer and covered by a dedicated component regression test; see
  ADR-023 §7.
- **Browsing and the topics-with-progress view share one query engine** (`queryVisiblePhonetics`), the same pattern
  vocabulary's browse/My Vocabulary share: visibility, language/level/topic filters, deterministic order (topic,
  then representation, ties by id — an untopicked representation sorts last), a cursor page, one batched progress
  lookup per page. No free-text search in M10 (IPA is not something a beginner can usefully type).
- **API** (authenticated, `private, no-store`): `GET /phonetics` (list, filtered/paged, 120/min), `GET
/phonetics/topics` (topics + progress, 120/min), `GET /phonetics/:id` (detail, 120/min), `POST
/phonetics/:id/view|practice|complete` (60/min, no body). No `:userId` anywhere; an undocumented query key or body
  field is a `400`. No `409` exists — unlike vocabulary's status route, every phonetics action either advances or
  no-ops, never refuses a step, so there is nothing to refuse.
- **Frontend**: nav link "Phonetics"; `/learn/phonetics` (browse: language picker, topic cards with progress,
  topic/status filters, a card per sound with its IPA, description and practice/complete actions);
  `/learn/phonetics/:phoneticId` (detail: IPA, description, topic, level, note, example words, progress, actions).
  The vocabulary detail page links to `/learn/phonetics?language=<word's language>` ("View pronunciation guide") —
  UI-only, no shared data, no deep link to one exact sound.
- **Content**: a small, original Polish seed set — two topics (`consonants`, `vowels`), eight representations. IPA
  and articulatory descriptions checked against standard academic Polish phonology references (documented in
  [content/languages/pl/phonetics/README.md](../content/languages/pl/phonetics/README.md)), not invented. Not a
  claim of phonemic coverage.
- **Not built, on purpose**: audio, speech recognition, pronunciation scoring/evaluation, search over IPA/
  description, a reward for phonetics progress (no event is even published, unlike vocabulary's discarded one), a
  backward progress correction, phonetic rules/topics beyond individual sounds, syllables/stress fields (considered
  and deliberately deferred — see ADR-023 for why they were not added speculatively).

## Verification (M10, run locally on 2026-09-23)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 content items, 9 exercises, 29 vocabulary
  entries in 6 categories, **8 phonetic representations in 2 topics**), `lint`, `format:check` (passes for
  everything committed), `typecheck`, `build`: **PASS**.
- **3210 Vitest tests / 227 files: 3210 pass, 5 skipped** (the opt-in real-Postgres gamification file, unrelated to
  M10), 0 fail. Coverage **92.92% statements / 85.81% branches / 91.99% functions / 93.04% lines** (thresholds
  80/75/80/80) — comfortably above every threshold. No dedicated component tests for the phonetics browse page and
  its list sub-components (topic list, filters, item card/list), the same gap M9 documented for its own
  browse/My Vocabulary pages — covered by the detail-page tests and the E2E spec instead.
- **132 Playwright E2E tests**: **130 pass, 2 failed in the one full-suite run** (`vocabulary.spec.ts`'s "login,
  open Vocabulary" and "searching filters the list" specs, both pre-existing M9 specs untouched by M10) — both
  **passed when re-run in isolation** (2/2), confirming load-related flakiness under the full 132-test run on this
  machine, the same class of flake M8/M9 already documented, not a regression. `tests/e2e/phonetics.spec.ts` (6
  tests) passed on every run, isolated and full-suite. `--workers=2`; ports 3000/5173 must be free.
- **Two real bugs found and fixed during E2E verification** (invisible to mocked-fetch unit tests):
  1. The Vite dev proxy had every other authenticated API path but `/phonetics` — every phonetics request from the
     browser 404'd against Vite itself instead of reaching the API. Fixed in `apps/web/vite.config.ts`.
  2. The initial E2E assertion for the "completed" badge used exact text matching, which cannot match Playwright's
     `getByText(..., {exact: true})` because the badge combines a checkmark and the word "Completed" in one
     element (the same shape Vocabulary's "Learned" badge has, which M9's own E2E never asserted with `exact: true`
     for that reason). Fixed by selecting the badge via its `data-status` attribute instead.
- **Real PostgreSQL 17** (throwaway container from the project's dev image, port 55433, removed afterwards): all
  six migration sets (identity, profile, lessons, exercises, gamification, vocabulary) plus phonetics's own applied
  in dependency order with the real `drizzle-kit` CLI on an empty database; the phonetics migration re-applied as a
  no-op; the schema matched the Drizzle definition exactly (`\d user_phonetic_progress`); manual spot checks
  confirmed the primary key refuses a duplicate `(user_id, phonetic_representation_id)`, the
  `completed`/`completed_at` CHECK refuses an inconsistent row, and deleting the user cascades to
  `user_phonetic_progress`. `packages/data`'s own PGlite-backed repository tests (20 tests) prove the same
  constraints plus two-concurrent-writer races more exhaustively.
- **Content seed**: not a database seed script — phonetics content is files, loaded and validated at API start-up
  and by `pnpm content:validate`, the same as every other content type since M5.
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M10** (the user explicitly said not to check
  them this session; the branch is not pushed).

## Earlier milestones (short)

- **M9 (vocabulary)**: an entry is content grouped in a category of its own language; `user_vocabulary` (per
  student, saved/learning/learned, one backward step); one shared query engine for browse and "My Vocabulary";
  diacritic-folded search; pages at `/learn/vocabulary` — [ADR-022](../docs/adr/adr-022-vocabulary.md).
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

- Audio (Gemini TTS, M12), speech recognition, pronunciation scoring/evaluation, an `audioAssetId` or similar field
  (deliberately not added speculatively — see ADR-023), search over phonetics content, a reward for phonetics
  progress, a backward progress correction, phonetic rules/patterns as their own content type (only individual
  sound representations exist), syllables/stress as modelled fields.
- Spaced repetition (SM-2, FSRS), word-form/morphology beyond a vocabulary entry's plural, cross-language
  (display-vs-learning-language) search or content, a reward for learned vocabulary.
- Streaks, XP levels, leaderboards/rankings, daily goals, challenges, spending or transferring points, notifications, a reward
  marketplace, scoring/progress rollups beyond the ledger, adaptive learning, recommendations, teacher dashboard,
  subscriptions, newsletter, account deletion/data export, AI services, audio/video generation.
- More exercise types (matching, ordering, fill-in-the-blank, listening, …), an exercise editor/CMS, an attempt-history endpoint,
  pagination of exercise lists, attempt retention/deletion workflows.
- Block-level resume in a lesson; more than one real language or any level beyond Polish A1; CEFR descriptors; **interface
  localisation** (only the achievement texts have a locale seam); persistence of a student's chosen language/level (enrolment);
  content hot-reload.
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests, and
  one-off real-Postgres checks for M8, M9 and M10).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step; a Postgres service in CI (the
  gamification multi-connection test is opt-in; vocabulary and phonetics have no equivalent opt-in test).
- Component-level unit tests for the vocabulary browse/My Vocabulary pages and the phonetics browse page and their
  presentation sub-components — covered by the detail-page tests and E2E only, for both M9 and M10.
- A precise link from a vocabulary entry to the exact phonetic representation for its own pronunciation (the
  current link goes to the language's phonetics hub, not one sound — see ADR-023 §12).

## Pending decisions

None block M11. Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; a deployment must ship
`content/` with the API (or set `CONTENT_DIR`) and run the Identity, Profile, Lessons, Exercises, Gamification,
Vocabulary and **Phonetics** migrations in that order (Profile, Lessons, Exercises, Gamification, Vocabulary and
Phonetics are independent of each other; all reference `users`).

## Known risks / rough edges

- **Progress can never be corrected backward.** A student who marks a sound `completed` by mistake has no "undo" —
  a deliberate M10 scope decision (ADR-023 §5), not an oversight.
- **No search exists over phonetics content.** A misspelled or IPA-unfamiliar query has no way to find a sound
  except browsing by topic/level/status (ADR-023 §8).
- **Phonetics and Vocabulary share no data**, so a word's exact pronunciation is not deep-linked from its
  vocabulary entry; the link goes to the language's phonetics hub instead (ADR-023 §12).
- **No reward exists yet for any phonetics progress**; unlike vocabulary, no event is even published for a future
  listener to consume.
- **`user_phonetic_progress` rows outlive a representation** that is later archived or removed from content: simply
  not listed, cleaned up only by user deletion (cascade) — same limitation ADR-020/022 document.
- **A `VocabularyItemLearnedEvent` has no real listener.** M9 does not grant points for vocabulary; the event is
  published and discarded. A future reward needs a new listener, not a change to vocabulary itself.
- **Listing and pagination are in-memory** for both vocabulary and phonetics, sized for a content-file-bounded
  dataset, not a growing table; if content ever became large, only the repository/query-engine implementation would
  need to change.
- **Search is exact-substring on folded text** for vocabulary, not fuzzy, not full-text ranked; phonetics has no
  search at all (see above).
- **No word-form/morphology system**: a vocabulary entry's inflected forms beyond `plural` are not modelled.
- **The vocabulary browse/My Vocabulary and phonetics browse pages have no dedicated component tests** (see
  Verification and "What does NOT exist yet").
- A reward can still lag its action for exercises/lessons (M8's known limitation, unchanged).
- The total gamification points figure is an aggregate over the student's rows on every read (M8's known limitation, unchanged).
- New achievements are not backfilled (M8's known limitation, unchanged).
- The gamification advisory lock is proved on real Postgres only by an opt-in test; CI does not run it (unchanged).
- Ledger, vocabulary and phonetics rows are kept until user deletion (`ON DELETE CASCADE`); the later GDPR
  milestone must decide retention/export for all three.
- `ten-correct-exercises` is not reachable end to end with the shipped content (nine exercises); proved below the UI (unchanged).
- The correct answer is shown after every exercise submission (M7 practice mode, unchanged).
- Case-insensitive exercise text comparison uses the runtime's ICU (`toLocaleLowerCase(languageId)`); verified on Node 24 only.
- Attempt immutability rests on the absence of any update/delete path, not a database trigger (unchanged).
- **Lesson bodies are still public** via M5's `GET /content/:id`; exercise, vocabulary and phonetics content are only
  reachable through the authenticated API.
- **`/learn/pl/a1` (public content browser) and `/learn/lessons` (student lessons) overlap** in what they show (unchanged).
- **Content changes need a restart/release** (read once at start-up); invalid content, exercises, vocabulary or
  phonetics stop the API from starting.
- **`/profile` is both page and API path** (only the Vite dev proxy separates them; ADR-017). M5–M10 avoided repeating this.
- Merely opening a lesson marks it in progress (by design); a failed `start` is silent.
- The skip-to-content link in the root layout still uses white on the orange accent (~2.8:1).
- Profile routes have no rate limit; no unsaved-changes guard; names stored as typed (escape on output).
- **Seven `pg` pools per API process** (identity, profile, lessons, exercises, gamification, vocabulary, phonetics);
  real Neon connectivity unverified.
- The web bundle is ~565 kB; Vite warns above 500 kB.
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for phonetics reads/writes too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.
- Full Playwright runs are memory-hungry (Vite + API with in-process Postgres + Chromium workers); use `--workers=2` on small
  machines; a load-related flake in the full 132-test run (two pre-existing M9 specs) passed in isolation — see Verification.
- Fastify's default `404` body echoes the requested path for every unknown route, including guessed phonetics paths; it
  carries no data, and it predates M10.

## Next milestone

`M11 — Hyperframes / Educational Video Generation` (not started).
