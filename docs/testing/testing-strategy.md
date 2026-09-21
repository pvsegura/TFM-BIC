# Testing Strategy

Status: ACCEPTED | Related: [ADR-008](../adr/adr-008-testing-strategy.md)

## Split

Approximately **80% unit/component/application/domain**, **20% E2E (Playwright)**. This ratio
guides effort allocation; it is never used to justify skipping tests for critical flows.

## Tooling by layer

| Layer                           | Tool                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Domain, Application (use cases) | Vitest, no I/O — pure logic, fast                                                                                             |
| Data/Infrastructure adapters    | Vitest with test doubles for external SDKs/DB (integration tests separately, in `tests/integration/`, may hit a real test DB) |
| React components/hooks          | Vitest + React Testing Library                                                                                                |
| Cross-app flows                 | Playwright, `tests/e2e/`                                                                                                      |

## Coverage baseline

Lines ≥ 80%, Statements ≥ 80%, Functions ≥ 80%, Branches ≥ 75%. This is a **baseline gate in CI**,
not a target to game — a change that hits the number while leaving a critical flow untested does
not pass review. Enforced in CI (M2) by Vitest's own `coverage.thresholds` in the "Unit / Component
Tests" Jenkins stage — a build fails the same way whether the failure is a broken test or an unmet
threshold. See [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md#coverage-baseline).

## Critical flows — tested regardless of coverage numbers

- Authentication (registration, login, logout, verification, password reset)
- Authorization (role checks, teacher/student data boundaries)
- Scoring (exercise attempt → correctness → points)
- Lesson completion
- Points/progress updates
- Profile changes (name, nickname, avatar)
- Destructive operations (account deletion, exercise-history deletion, unsubscribe)
- Teacher/student permission boundaries (a teacher must never read another teacher's students)

## What "testing behavior, not implementation" means here

Tests assert on inputs/outputs and observable state changes (e.g., "submitting a correct answer
increases points by N and marks the lesson step complete"), not on internal call counts or private
method invocation, so refactors under TDD's REFACTOR step don't require rewriting tests that
didn't change behavior.

## Integration vs unit boundary

**Revised in M3** from the M0/M1 plan below: `packages/data`'s Identity repositories
(`packages/data/src/identity/*.repository.test.ts`) are tested once, colocated with the adapter,
against **PGlite** (`@electric-sql/pglite`) — a real, WASM-compiled Postgres running in-process,
not a hand-rolled driver fake and not a separate `tests/integration/` tier. This was chosen over
the original two-tier plan because a faked driver can't catch real schema/constraint bugs (and
didn't need to prove itself twice — see [ADR-005](../adr/adr-005-database.md) for the concrete bugs
this caught during M3 development), and because it keeps Jenkins Docker-free (no Postgres service
to provision for CI). `tests/integration/` remains empty; local Docker Postgres
(`infrastructure/docker/docker-compose.yml`) is available for manual testing against a real
networked database, and `apps/api` can boot against a real Neon connection once one is
provisioned (deployment-time, M17) — neither is exercised by the automated test suite.

## Testing rules for M4+ that follow M3's precedent

Repository/adapter tests for a new bounded context should default to the same PGlite pattern
(colocated, no live network dependency) rather than reviving the `tests/integration/` +
hand-faked-driver split, unless a concrete reason emerges to deviate.

M4 followed this: `packages/data/src/profile/profile.repository.test.ts` runs against a PGlite
instance with Identity's migrations applied first and Student Profile's second (the foreign key
needs `users`), and asserts real database behaviour — constraint names on rejected rows, cascade
delete, concurrent first saves. A context whose tables reference another's needs a harness like
`packages/data/src/profile/db/test-support/create-test-db.ts`.

Security-relevant behaviour is asserted explicitly rather than assumed: unauthenticated access,
cross-user access, mass assignment, unknown avatar ids, oversized/malformed bodies, hostile text
and error-message leakage each have their own tests (`apps/api/src/routes/profile.route.test.ts`,
`packages/contracts/src/profile/`, `tests/e2e/profile.spec.ts`). They demonstrate those behaviours;
they are not proof of complete security.

## Decided in M1

Coverage tool: Vitest's `v8` coverage provider (`@vitest/coverage-v8`), configured once at the
repo root (`vitest.config.ts`) with `test.projects` aggregating every package/app's own
`vitest.config.ts` — see [current-state.md](../../.claude/current-state.md). Reports:
`text`/`html`/`lcov` under `./coverage`, `lcov.info` being the format SonarQube consumes (see
[sonarqube skill](../../.claude/skills/sonarqube/SKILL.md)).

## Resolved in M3 (was "Not decided in M0/M1")

Integration tests do **not** run against a containerized Postgres in CI — see "Integration vs
unit boundary" above. `tests/integration/` stays empty; PGlite fills the role that tier would
have played.

## Content and languages (M5)

- **Content is tested as data**: `shipped-content.test.ts` loads the real `content/` tree and asserts
  Polish is registered, A1 is available and A2–C2 planned, ids unique, ordering explicit, required
  text present, and every published item readable through the real use cases. `pnpm content:validate`
  runs the same loader in CI.
- **Loader tests use throw-away temp directories** (`test-support/content-fixtures.ts`) so each rule
  — malformed JSON, schema violation, location mismatch, duplicate ids, order clashes, dishonest
  availability, oversized file — is proved with the exact bytes the loader sees.
- **Extensibility is tested at three layers with fictional languages** (`xx`, `qq`): the unmodified
  application use cases, the file-system repository (a language that exists only as files), and the
  HTTP routes. If adding a language ever needs code, one of these fails.
- **Architecture guard**: `no-language-branching.test.ts` fails on language-specific branching or
  language names in production source, and proves it is not vacuous.
- **Security tests** cover public access (no cookie needed, none set), unpublished/inactive exclusion,
  `400` for malformed codes/levels/ids (injection- and traversal-shaped, oversized, repeated params),
  generic `404`/`500` bodies, fail-closed serialization of markup/unknown block types, and rate limiting.
- **Frontend tests** cover the selectors (data-driven, keyboard order, non-colour selected/planned
  cues), loading/error/not-found/empty states, dark mode, and safe block rendering. Playwright covers
  the public flow on desktop, dark mode and a 375px viewport (`tests/e2e/content-languages.spec.ts`).
- **Not covered**: there is no automated accessibility scanner (axe or similar) in the repository, so
  accessibility rests on role/label/keyboard tests and manual review.

## Lessons (M6)

Lesson completion is a critical flow (listed above), so it is tested at every layer regardless of coverage.

- **Domain/application**: the pure transitions (`startLesson`, `completeLesson`: forward-only, idempotent,
  first completion time kept) and the four use cases over in-memory fakes with a fixed clock — published-only
  visibility (draft, archived, non-lesson, hidden level → one `LessonNotFoundError`), one batched progress
  lookup per list (no N+1), reads never write, per-student isolation, and `language-extensibility.test.ts`
  running the same use cases over fictional languages.
- **Repository (real Postgres via PGlite)**: start/complete semantics, idempotent `complete, complete,
complete`, many completions and a start/complete race ending completed, the primary key, the foreign key and
  `ON DELETE CASCADE`, every `CHECK`, a lesson id that is not a foreign key, and the migration's columns and
  (lack of extra) indexes. PGlite serialises queries, so true multi-connection concurrency is not exercised.
- **HTTP**: authentication on every route (none/tampered/logged-out), the response shape (no blocks in the
  list, no status/type leaks), `no-store`, filters, per-student progress, mass-assignment refusal per field,
  malformed/injection/traversal ids, identical `404`s, `Origin` check, method routing (no way to edit a lesson),
  fail-closed serialization of markup and unknown block types, and rate limiting.
- **Frontend**: the API client (contract validation, encoding, no body, no user id), the query hooks (user-scoped
  keys, server progress written into the cache, one completion in flight, 401 ends the session), the
  presentational components (status in words, one link per card, disabled-while-saving, live region present
  before completion, blocks in order, unknown block notice, markup inert), the pages (loading is never shown as
  empty, error with retry, not-found without echoing the id, start once even under StrictMode, completion
  confirmed, failure retried) and the route table (`learn/lessons` outranks the public route and sits behind
  login).
- **Playwright** (`tests/e2e/lessons.spec.ts`): discovery, opening in order, in-progress and completed state
  surviving a refresh, keyboard completion, idempotent and double-click completion (the latter found a real
  duplicate-request bug), logged-out and cross-student access, mass-assignment refusal, not-found and
  injection-like ids, planned levels, a 375px viewport with no horizontal overflow, and dark mode.
- **Not covered**: axe-style accessibility scanning (still none), and contrast is checked by calculation
  (recorded in ADR-019), not by an automated tool.

## Exercises (M7)

Answer evaluation is business-critical, so it is tested hardest and at every layer regardless of coverage.

- **Evaluators (pure unit tests)**: each type's `parseAnswer` and `evaluate` — correct, incorrect, every malformed
  input (wrong type, empty, unknown option, control characters, over-long), malformed configuration, determinism
  (same input → equal result), **no mutation** of the exercise, and the presenter's output contains nothing of the
  key. Text answers additionally cover exact match, case rules, surrounding whitespace, **diacritics preserved**
  (`żółty` ≠ `zolty`), decomposed (combining-mark) input, explicitly listed variants, unlisted punctuation, and
  language-specific lower-casing. The registry is tested for completeness (every declared type is supported),
  isolation (only the exercise's own evaluator runs), unsupported types, inherited names (`__proto__`) and duplicates.
- **Schemas (contracts)**: the file format per type (every content rule above, including "several correct options
  cannot be written"), the allowlisting response shapes stripping key fields, and the strict answer request.
- **Content**: the catalog rules (lesson existence/type/language/level, ordering, publication), the loader over temp
  trees, the report, and `shipped-exercises.test.ts`, which runs every shipped exercise's own answer key through the
  real evaluators (correct and wrong), checks diacritics and that nothing is presented with its key.
- **Application**: the three use cases over in-memory fakes with a fixed clock — visibility (one not-found for
  draft/archived/hidden/non-lesson), ordering, batched lookup (no N+1), reads never write, refusal before persistence,
  retry appends, per-user isolation, an ignored forged input, and `language-extensibility.test.ts` for fictional
  languages (RTL, non-Latin).
- **Repository (real Postgres via PGlite)**: append semantics, the `jsonb` type round-trip, unicode/SQL-looking
  answers, the foreign key and cascade, both `CHECK`s, the single index, and the "latest attempt" SQL held to the domain
  definition on a mixed history.
- **HTTP**: authentication on every route, exact response shapes and **answer-key leakage on the raw bodies**,
  mass-assignment refusal per field, IDOR with two students, identical `404`s, `400`/`413`/`415`/`403`/`501`/`500`,
  injection/traversal ids, and both rate limits.
- **Frontend**: the API client (encoding, the body has one key, contract validation dropping a leaked key), the
  hooks (user-scoped keys, result written into the cache, **one submission in flight**, 401), each view (roles,
  labels, keyboard, disabled, validation, inert markup, lang/dir), the registry, the result (live region present from
  the start, words not colour), the player (focus to result, retry, next/back, **focus after a retry when the verdict
  clears a render later** — a bug found only by Playwright), the list, the lesson's practice section and the pages.
  `no-raw-html.test.ts` scans production source for HTML injection and code execution.
- **Playwright** (`tests/e2e/exercises.spec.ts`): discovery from a lesson; multiple choice right and wrong; text
  answer with retry and a second attempt; diacritics; true/false (including a false statement); persistence across a
  refresh; double-click = one attempt; moving through a lesson; **answer-key protection on the real network
  responses**; the server-authoritative and invalid-answer cases; logged-out, cross-student and injection-shaped
  access; safe not-found; a 375px viewport (no horizontal overflow, tap-size options); dark mode.
- **Not covered**: axe-style accessibility scanning (still none), true multi-connection concurrency on real Postgres,
  and behaviour on runtimes without full ICU (case-insensitive comparison uses the exercise language's locale).

## Gamification (M8)

Points and idempotency are critical flows, tested hardest and at every layer regardless of coverage.

- **Domain (pure unit tests)**: point amounts (valid range, zero, negative, fractional, `NaN`/infinite, non-numbers),
  reward reasons and the reward rules (10 / 25 / 50), source-id validation (injection-shaped ids), the transaction
  (amount comes from the rules, frozen, invalid input), every achievement rule at and around its threshold (9 vs 10,
  99 vs 100, "ten attempts at one exercise is one exercise"), trigger selection, "never returns an already unlocked
  achievement", registry validation, and that a **new rule needs no change elsewhere**.
- **Application (in-memory fake with the database's guarantees)**: `FakeGamificationRepository` has identity-idempotent
  writes, a per-student queue (like the advisory lock) and rollback on error, plus failure injection. Tests cover: the
  first reward pays and repeats pay 0, per-student independence, chained unlocks (a lesson unlocking `first-lesson` then
  `hundred-points`), achievement idempotency, **concurrent** identical completions and the lost-unlock threshold race,
  **transaction consistency** (a failing payout or unlock leaves nothing behind; a retry then grants everything once),
  `RewardAwardError` naming the reason/source but not the student, wrong or malformed answers and hidden content
  never reaching the ledger, the M7/M6 use cases reused unchanged, "a repeat evaluates nothing", the read use cases
  (three reads whatever the number of achievements, paging, own-data-only, retired achievements) and the localised
  texts (start-up validation, `Accept-Language` matching, a fictional locale).
- **Repository (real Postgres via PGlite)**: idempotent inserts, every constraint by name (amount, reason, source id,
  key, foreign keys), the immutability trigger, cascade, the aggregate, keyset paging with and without a full last page,
  transaction commit/rollback, and the real use case run over the real database — many concurrent callers, the
  threshold race, a payout failing midway and being granted on retry — each ending with an invariant query (every
  unlock has exactly one payout and vice versa).
- **Real Postgres, multiple connections (opt-in)**: `gamification.repository.postgres.test.ts`, skipped unless
  `TEST_DATABASE_URL` is set (a throwaway database is created and dropped). With a pool of 12 connections it shows
  concurrent requests pay once, the threshold race never loses an unlock (15 rounds), and the advisory lock makes a second
  request for the same student wait but not another student's. Verified by mutation: with the lock removed the race and
  blocking tests fail while the unique-constraint test still passes.
- **Contracts / HTTP**: response allowlists, strict queries (`userId` is a `400`), digits-only paging bounds,
  authentication on every route, IDOR and non-existent routes (including every POST/PUT/PATCH/DELETE), no user id in any
  body, `no-store`, exact rewards on the answer and completion responses, concurrent duplicates, mass assignment,
  a generic `500` on failure, and the rate limit.
- **Frontend**: the client (no user id ever sent, contract validation, cursor only), hooks (user-scoped key dropped on
  logout, 401, paging, invalidation only when points were earned, rewards never cached with the lesson), each component
  (locked/unlocked in words, progress bars, plural, empty, dark-mode class, inert markup, decorative icons hidden), both
  pages (loading, error with retry and a fixed message, empty, one request per card) and the reward notice inside the
  existing live regions.
- **Playwright** (`tests/e2e/gamification.spec.ts`): the first correct answer (+60 with `first-exercise`), a repeat
  (nothing), wrong then right, six simultaneous identical answers (paid once), a lesson (+75 with `first-lesson`) and its
  repeat/refresh, the dashboard (185 = 10+50+25+50+50) and the achievements page with progress, a new student's empty
  state, a switch of student without stale data, a 375px viewport and dark mode, keyboard use, logged-out refusals,
  cross-student isolation, `userId` refusals, no user id and `no-store` on the real responses, and malformed paging.
- **Not covered**: `ten-correct-exercises` end to end (the shipped content has nine exercises; it is proved in the domain,
  application and repository layers), axe-style accessibility scanning (still none), and the multi-connection test is not
  part of CI (no Postgres service in the pipeline).
