# Current State

Last updated: 2026-09-25

## Milestone

**M12 — Gemini audio generation** — implemented on `feature/gemini-audio`, branched from
`feature/hyperframes-video-generation` (M11). Not pushed, not merged; Jenkins/SonarQube not run (per
standing instruction). Rationale: [ADR-013](../docs/adr/adr-013-audio-generation.md) (rewritten this
milestone).

## What actually exists (M12)

- **Gemini re-verified first** (2026-09-25, official docs): TTS is now **GA**
  (`gemini-3.8-flash-tts`, selected; >130 languages incl. Polish), via the GA Interactions API
  (`POST /v1beta/interactions`, `x-goog-api-key`); the unary response returns the whole clip inline
  as base64 `audio/wav` (24 kHz mono 16-bit PCM); language is auto-detected; style is a
  natural-language annotation. M0's "Preview" finding is obsolete.
- **Domain** (`packages/domain/src/audio/`): `SpeechRequest` (validated `SpeechText`: trimmed,
  whitespace-collapsed, no control characters, ≤ configured limit, hard ceiling 500 code points),
  `VoiceProfile` (`standard` | `slow` — never a provider voice), `AudioFormat` (`audio/wav`),
  `speechRequestKey`. No job/status model: generation is synchronous.
- **Application** (`packages/application/src/audio/`): port `AudioGenerationService.generate`,
  port `AudioCache`, provider-independent errors + `categorizeAudioGenerationError`;
  `GenerateAudioUseCase` (the reusable capability: language must be active, cache reuse,
  in-flight de-duplication, max concurrent → `AudioGenerationBusyError`, failures never cached);
  `GenerateVocabularyAudioUseCase` (first consumer — text comes from the visible vocabulary entry,
  `lemma` or `example`).
- **Infrastructure** (`packages/data/src/audio/`): `FakeAudioGenerationService` (default; a
  deterministic 0.25 s WAV tone; named failure scenarios), `GeminiAudioProvider` (plain `fetch`, no
  SDK; separate text/style fields; `store: false`; 20 s timeout never retried; ≤ 2 retries with
  backoff for 429/500/503/504/network; raw provider text never propagated; WAV verified on the
  bytes), `InMemoryAudioCache` (LRU, 200 entries / 32 MB), `wav.ts`.
  **`GeminiAudioProvider` has never been run against the real API** — no key exists, and real use
  is PENDING the provider-terms decision in ADR-013 (Gemini forbids services likely to be used by
  under-18s; EEA needs the paid tier).
- **Config**: `AUDIO_GENERATION_PROVIDER` (`fake` default | `gemini`), `GEMINI_API_KEY` (required
  for `gemini`), `GEMINI_TTS_MODEL`, `AUDIO_GENERATION_MAX_TEXT_LENGTH` (default 300). `loadEnv`
  refuses `gemini` under `NODE_ENV=test`.
- **API**: `POST /audio-generations` (authenticated, Origin-checked, 30/hour, 1 KB body limit, strict
  schema). Body `{source: {type: "vocabulary-item", vocabularyItemId, part}, voice}` — the client
  never sends text. `200 audio/wav` (`private, no-store`, `nosniff`); 404 unseen content / no
  example; 422 text over the limit; 502 provider rejected; 503 (+`Retry-After`) unavailable /
  rate-limited / misconfigured / busy; 504 timeout. Structured log per generation (id, content id,
  voice, provider, model, cached, bytes, duration, failure category) — never the text or audio.
- **Frontend**: `VocabularyAudioPlayer` on the vocabulary detail page — speed radios, "Listen to
  the word"/"Listen to the example", loading/error live regions, native `<audio controls>` from a
  Blob URL (revoked on replace/unmount). No separate `/audio` page. Vite proxy `/audio-generations`.
- **Not built, on purpose**: storage of clips (PENDING — needed only once video narration wants a
  stable URL), phonetics/lesson/video integration (the `source` union is the extension point),
  speech recognition/scoring, voice management, a job model.

## Verification (M12, run locally on 2026-09-25)

- Baseline before any change: 3339 pass / 5 skipped (unchanged from M11).
- `pnpm content:validate`, `lint`, `typecheck`, `build`: **PASS**. `format:check`: PASS for every
  tracked file (the only warning is the untracked nested clone `TFM-BIC/README.md`, not part of
  the repo — same as M11).
- **Vitest: 3499 pass, 5 skipped, 0 fail** (160 new tests). Coverage **93.47% statements / 86.78%
  branches / 92.55% functions / 93.6% lines** (thresholds 80/75/80/80).
- **Playwright: 136/136 pass** in one full run (`--workers=2`), including the 2 new tests in
  `tests/e2e/audio-generation.spec.ts` (fake provider only; asserts the browser actually decodes the
  returned WAV, and that anonymous requests / client-supplied text are refused).
- **Jenkins / SonarQube / Quality Gate: NOT RUN** (standing instruction).

## Previous milestone

**M11 — Hyperframes video generation** — implemented on `feature/hyperframes-video-generation`,
branched from `feature/phonetics` (M10) → `feature/vocabulary` (M9) → `feature/gamification` (M8) →
`feature/exercises` (M7) → `feature/lessons` (M6) → `feature/content-languages` (M5) →
`feature/student-profile` (M4) → `feature/authentication` (M3) → `ci/jenkins-sonarqube` (M1+M2);
`main` only has M0. **None of these branches are pushed and nothing is merged**; Jenkins/SonarQube
are deliberately not connected (per standing instruction — not checked this session either).
M0–M10 remain the base — see [docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists (M11)

A provider-independent video-generation foundation: a `VideoDefinition` (content, what should be
generated) drives a `VideoGenerationJob` (per-student, tracks rendering through a small lifecycle),
rendered by whichever `VideoGenerationService` is configured — a real, committed fake adapter by
default everywhere, a real (but unverified end-to-end) Hyperframes CLI adapter behind a flag.
Rationale and trade-offs: [ADR-012](../docs/adr/adr-012-video-generation.md) (revised this
milestone),
[ai-integration-strategy.md](../docs/architecture/ai-integration-strategy.md#video-hyperframes--re-verified-facts-re-verified-2026-09-24-m11);
reference: [hyperframes skill](../.claude/skills/hyperframes/SKILL.md).

- **Hyperframes' live docs were re-verified before writing any adapter code** (2026-09-24): free,
  self-hostable, Apache 2.0, no authentication for local rendering, invoked via `npx hyperframes
render --output <file>`. Needs Node 22+, FFmpeg and headless Chrome on the host — none confirmed
  available in the M11 implementation environment. It is designed for an AI coding agent to author
  the HTML/timeline project interactively; this platform automates _rendering_ an already-authored
  project, not _authoring_ one from a runtime prompt — a materially different usage model than
  Gemini TTS's per-request API shape.
- **A video definition is content**, at `content/languages/<languageId>/videos/<id>.json` — one
  file per video (no topic grouping, unlike vocabulary/phonetics: there is exactly one video in
  this milestone). Required: `id`, `languageId`, `levelId` (**mandatory, unlike phonetics'
  optional level** — a video is closer to a lesson), `title`, `description`, `scriptPath`.
  Optional: `relatedContentId` (a free-text pointer reusing an existing lesson/vocabulary/phonetic
  id — not cross-validated against those catalogs in this milestone, a documented limitation). The
  render project itself (Hyperframes-specific HTML/CSS/JS) lives separately, under
  `content/video-scripts/<scriptPath>/`, read only by the provider adapter — never by
  domain/application code, so a future provider swap never touches `VideoDefinition`.
- **`validateVideoDefinitions`** (domain) checks the whole catalog: unique ids, language-prefixed
  ids, unique order per language/level, and the same availability standard as every other content
  kind (published only in an available level).
- **A generation job's lifecycle is new to this codebase**: `queued -> processing ->
completed|failed` — the first genuinely mutable-status table (every other context's per-student
  state is either append-only or a status that only ever advances). `video_generation_jobs` (PK
  `id` uuid, `user_id` FK cascade, CHECK mirroring the domain's id pattern, CHECK `(status IN
('completed','failed')) = (completed_at IS NOT NULL)`). `RequestVideoGenerationUseCase` records
  the job `queued`, moves it to `processing`, and calls the provider **without awaiting it from the
  HTTP handler** — the route replies `201` immediately, and the client polls `GET
/video-generations/:id`. This is deliberately an in-process, non-durable background task (no
  queue, no retry, no cross-restart durability, single server instance only) — an explicit MVP
  limitation per ADR-012, not an oversight.
- **The provider boundary is `VideoGenerationService`** (one method, `generate`): `
FakeVideoGenerationService` (packages/data) is the only adapter selected by default and in every
  automated test/CI run — deterministic named scenarios (success, provider-rejected,
  provider-unavailable, timeout), no network, no credential. `HyperframesCliProvider`
  (packages/data) shells out to `npx hyperframes render --output <file>` with a timeout and typed
  error translation; selected only via `VIDEO_GENERATION_PROVIDER=hyperframes`; **implemented but
  never executed against a real render** in this environment — its own tests inject a fake process
  runner, and only the generic child-process wiring (timeout/spawn-failure/exit-code handling) is
  exercised for real, against `node`, never against `npx hyperframes`. See
  `content/video-scripts/README.md` for the exact BLOCKED/PENDING statement.
- **API** (authenticated, `private, no-store`): `POST /video-generations` (10/hour — generation is
  expensive — body: `{videoDefinitionId}`, strict), `GET /video-generations/:jobId` (30/min). A job
  is addressed by its own server-generated UUID, never a content id; a job that does not exist and
  a job that belongs to another student are the same `404`, never a `403` — the same IDOR-safe
  pattern every other user-owned resource in this codebase uses. Provider failures are never an
  HTTP error: `RequestVideoGenerationUseCase` catches them and records the job `failed` with a safe
  category (`timeout`/`provider_unavailable`/`provider_rejected`/`unknown`) — a caller only learns
  about a failure by polling, as a `200`.
- **Frontend**: nav link "Videos"; `/learn/videos` — a single demo page (no browsing/listing route
  exists; the brief's own suggested API is only the two routes above, so the page requests
  generation of the one authored definition directly, hardcoding its display title/description
  rather than adding a read endpoint just to avoid that duplication). Shows queued/processing,
  completed and failed states; a completed job shows "preview is not available yet" rather than a
  `<video>` element, since neither adapter returns a real, servable media URL in this milestone
  (media storage is explicitly PENDING, no AWS/S3 introduced).
- **Content**: one hand-authored vertical-slice video, `pl-a1-nasal-vowels-demo` — reuses the
  existing `pl-ipa-onasal`/`pl-ipa-enasal` phonetic representations (M10) via `relatedContentId`
  and its render project's own scene text, rather than duplicating that data. The Hyperframes HTML
  project itself was authored against the verified `data-start`/`data-duration`/`data-track-index`
  convention but never run through the real renderer.
- **Not built, on purpose**: audio/narration (Gemini TTS, still M0-era PROPOSED, untouched by
  M11), a video-definitions browsing/list endpoint, real media storage/serving, a queue or
  background-worker infrastructure, cancellation, retries, a script-authoring DSL beyond the
  Hyperframes HTML format itself, cross-referencing `relatedContentId` against other catalogs.

## Verification (M11, run locally on 2026-09-25)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 content items, 9 exercises, 29 vocabulary
  entries in 6 categories, 8 phonetic representations in 2 topics, **1 video definition, 1 published**), `lint`,
  `format:check` (passes for everything committed), `typecheck` (every package), `build` (every package + `apps/web`
  `vite build`, `apps/api` `tsc`): **PASS**.
- **3339 Vitest tests / 243 files: 3339 pass, 5 skipped** (the opt-in real-Postgres gamification file, unrelated to
  M11), 0 fail. Coverage **93.04% statements / 85.97% branches / 92.32% functions / 93.14% lines** (thresholds
  80/75/80/80) — comfortably above every threshold. Weaker spots, all deliberate: the demo page's own component
  tests don't hit every branch (~76% stmts on that one file — the states that matter, success/failure/disabled, are
  covered; a couple of minor render branches aren't), and `RequestVideoGenerationUseCase`'s provider-error
  categorization is now covered for all four categories (rejected/unavailable/timeout/unknown) after a follow-up
  pass — the first attempt only covered "rejected".
- **134 Playwright E2E tests** (2 new: `video-generation.spec.ts`): **133 pass, 1 failed in one full-suite run**
  (`exercises.spec.ts`'s "opening an exercise from the lesson's list" spec, a pre-existing M7 spec untouched by
  M11) — **passed when re-run in isolation** (34/34), confirming load-related flakiness under the full 134-test run
  on this machine, the same class of flake M8–M10 already documented, not a regression. `video-generation.spec.ts`
  (2 tests) passed on every run, isolated, in a 3-file subset, and in the full suite. `--workers=2`; ports
  3000/5173 must be free.
- **Two real bugs found and fixed during E2E verification** (invisible to mocked-fetch unit tests):
  1. The Vite dev proxy had every other authenticated API path but `/video-generations` — every request from the
     browser hit Vite's own SPA fallback instead of reaching the API, so the mutation's response body failed to
     parse as JSON and the UI silently sat on "Starting generation…" forever. Fixed in `apps/web/vite.config.ts` —
     the exact class of bug M10 already found and fixed for `/phonetics`, still not generalized into a guard test.
  2. An E2E helper used the bare Playwright `request` fixture (a separate, unauthenticated context) to make an
     authenticated follow-up call after signing in via `page` — wrong context, so the session cookie was never
     sent and the call 401'd. Fixed by using `page.context().request` instead, the same pattern the existing
     phonetics/vocabulary security specs already use correctly.
  3. (Not a bug, but caught only by the repo's own architecture guard test.) The demo page's hardcoded description
     originally named "Polish" directly — `no-language-branching.test.ts` (ADR-018's guard against per-language
     code) correctly flagged this as forbidden in production source; reworded to describe the sounds without
     naming the language.
- **No real-Postgres manual check was done for M11** (unlike M8–M10's own verification sections): the generated
  migration (`packages/data/src/video/db/migrations/0000_previous_infant_terrible.sql`) was generated with the
  real `drizzle-kit generate` CLI and inspected, and `packages/data`'s own PGlite-backed repository tests (10
  tests) prove the CHECK constraints, the `user_id` foreign key/cascade, and insert-then-update transitions — but
  it was never applied against a real, network Postgres instance this session. Worth doing before relying on it in
  a real deployment.
- **Content seed**: not a database seed script — the one video definition is a file, loaded and validated at API
  start-up and by `pnpm content:validate`, the same as every other content type since M5. The Hyperframes render
  project it points to (`content/video-scripts/pl-a1-nasal-vowels-demo/`) is plain HTML, not validated by any
  schema — only its existence as a folder matters to the fake/real provider, and only the real provider ever reads
  its contents (which never happened this session — see "What actually exists" above).
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M11** (standing instruction not to check
  them this session; the branch is not pushed).

## Earlier milestones (short)

- **M10 (phonetics)**: a representation is content, optionally grouped by topic, independent of vocabulary;
  `user_phonetic_progress` (per student, forward-only viewed/practiced/completed, no backward step);
  `queryVisiblePhonetics` shared query engine; pages at `/learn/phonetics` — [ADR-023](../docs/adr/adr-023-phonetics.md).
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

- **A real, executed Hyperframes render.** `HyperframesCliProvider` is implemented against verified CLI docs but
  was never run against `npx hyperframes render` for real — no FFmpeg/headless Chrome/`hyperframes` install
  confirmed in this environment. Do not report the real adapter as "working," only as implemented-and-unverified
  (see ADR-012, `content/video-scripts/README.md`).
- Audio (Gemini TTS, M12 or later — untouched by M11, still exactly where M0 left it), speech recognition,
  pronunciation scoring/evaluation, subtitle generation/translation, an AI tutor.
- Real media storage for generated videos (`MEDIA_STORAGE_PROVIDER = PENDING`, no AWS/S3), a video player, a
  video-definitions browsing/list API or page, cancellation of an in-flight generation, retries, a queue/background
  worker, cross-referencing a video's `relatedContentId` against the catalog it points into.
- A `Media`-domain unification of video/audio/image references (each AI-generation milestone has introduced its own
  narrow shape so far); more than one authored video.
- An `audioAssetId` or similar field on any content type (deliberately not added speculatively — see ADR-023),
  search over phonetics content, a reward for phonetics progress, a backward phonetics progress correction,
  phonetic rules/patterns as their own content type (only individual sound representations exist), syllables/stress
  as modelled fields.
- Spaced repetition (SM-2, FSRS), word-form/morphology beyond a vocabulary entry's plural, cross-language
  (display-vs-learning-language) search or content, a reward for learned vocabulary.
- Streaks, XP levels, leaderboards/rankings, daily goals, challenges, spending or transferring points, notifications, a reward
  marketplace, scoring/progress rollups beyond the ledger, adaptive learning, recommendations, teacher dashboard,
  subscriptions, newsletter, account deletion/data export.
- More exercise types (matching, ordering, fill-in-the-blank, listening, …), an exercise editor/CMS, an attempt-history endpoint,
  pagination of exercise lists, attempt retention/deletion workflows.
- Block-level resume in a lesson; more than one real language or any level beyond Polish A1; CEFR descriptors; **interface
  localisation** (only the achievement texts have a locale seam); persistence of a student's chosen language/level (enrolment);
  content hot-reload.
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev, PGlite in tests, and
  one-off real-Postgres checks for M8, M9 and M10 — **not repeated for M11**, see Verification above).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step; a Postgres service in CI (the
  gamification multi-connection test is opt-in; vocabulary, phonetics and video have no equivalent opt-in test).
- Component-level unit tests for the vocabulary browse/My Vocabulary pages and the phonetics browse page and their
  presentation sub-components — covered by the detail-page tests and E2E only, for both M9 and M10.
- A precise link from a vocabulary entry to the exact phonetic representation for its own pronunciation (the
  current link goes to the language's phonetics hub, not one sound — see ADR-023 §12).

## Pending decisions

Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; a deployment must ship
`content/` with the API (or set `CONTENT_DIR`) and run the Identity, Profile, Lessons, Exercises, Gamification,
Vocabulary, Phonetics and **Video** migrations in that order (Profile, Lessons, Exercises, Gamification, Vocabulary,
Phonetics and Video are independent of each other; all reference `users`). ADR-015 also directly blocks confirming
whether the real `HyperframesCliProvider` can actually run in production (FFmpeg/headless Chrome availability is a
function of the hosting choice) — this is the one thing M11 leaves genuinely undecided that a future milestone
must resolve before the real adapter can be trusted.

## Known risks / rough edges

- **The real Hyperframes adapter is unverified.** `HyperframesCliProvider` has never rendered a real video; its
  actual behavior against a real `npx hyperframes render` invocation — exact stdout/stderr shape, real timing,
  whether the output file ends up exactly where expected — is unconfirmed. Treat it as a prototype until someone
  runs it for real on a host with Node 22+/FFmpeg/headless Chrome.
- **Generation is a single-instance, in-process background task**, not a queue: a server restart mid-render loses
  the job (it stays `processing` forever — there is no reconciliation sweep), and nothing retries a failed
  generation automatically. A deliberate M11 scope decision (ADR-012), not an oversight — revisit if load or
  reliability requirements change.
- **No media storage exists.** A completed job's `mediaReference` is an opaque string (a fake reference, or a real
  adapter's local filesystem path) — never a URL a browser could load. The frontend shows a static "preview
  pending" note instead of attempting playback.
- **`relatedContentId` is not cross-validated.** A video definition naming a phonetic/vocabulary/lesson id that
  does not exist (a typo, or content later removed) would not be caught by `pnpm content:validate` — only the
  video's own fields are checked.
- **No real-Postgres check was performed for `video_generation_jobs`** this session (see Verification) — only
  PGlite-backed repository tests and an inspected `drizzle-kit generate` output.
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
- **Eight `pg` pools per API process** (identity, profile, lessons, exercises, gamification, vocabulary, phonetics,
  video); real Neon connectivity unverified.
- The web bundle is ~582 kB; Vite warns above 500 kB.
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for video generation too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.
- Full Playwright runs are memory-hungry (Vite + API with in-process Postgres + Chromium workers); use `--workers=2` on small
  machines; a load-related flake in the full 134-test run (one pre-existing M7 spec) passed in isolation — see Verification.
- Fastify's default `404` body echoes the requested path for every unknown route, including guessed video-generation
  paths; it carries no data, and it predates M11.

## Next milestone

`M12` (not yet named/started). Candidates per the product brief: Gemini audio/narration generation
(ADR-013, still PROPOSED — a natural pairing with M11's video, since a finished video eventually
needs narration), or resolving ADR-015 (hosting) so `HyperframesCliProvider` can finally be
verified for real.
