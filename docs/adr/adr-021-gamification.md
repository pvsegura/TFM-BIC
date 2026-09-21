# ADR-021: Gamification — an append-only points ledger, idempotent rewards by identity, achievements as rules

Status: ACCEPTED
Date: 2026-09-21 (M8 — Gamification)

Builds on [ADR-019](adr-019-lessons.md) (lesson completion is persisted, idempotent, server-side),
[ADR-020](adr-020-exercises.md) (the server judges every answer; attempts are append-only history),
[ADR-018](adr-018-content-languages.md) (content is files, ids are stable slugs) and
[ADR-017](adr-017-student-profile.md) (identity comes only from the session). Reference:
[gamification-architecture.md](../architecture/gamification-architecture.md) and the [API docs](../api/README.md).

## Context

M8 is the first layer of gamification: points, a history of how they were earned, achievements and their automatic
unlocking. Three things make it easy to get wrong:

- **Points are worth money-like trust.** The browser must never decide or ask for them, and "why does this student have
  these points?" must always be answerable.
- **Rewards are retried.** A double click, a refresh, a network retry or two tabs must never pay twice — and two
  concurrent requests must not both pass an `if (!alreadyRewarded)`.
- **Partial states are the failure mode.** "Points paid but the achievement missing" and "achievement unlocked but never
  paid" are exactly what a naive implementation produces.

It must also grow (streaks, vocabulary and phonetics rewards, leaderboards) without a rewrite, and must not introduce a
broker, Redis, microservices or any of the things the brief excludes.

## Decision

### 1. The ledger is the single source of truth for points

`point_transactions` is an **append-only** table of rewards: `id` (identity), `user_id` (FK, cascade), `reason`,
`source_id`, `amount`, `created_at` (from the `Clock`). There is **no** `total_points` anywhere. A student's total is
`SUM(amount)`, their rewards per reason are `COUNT(*) GROUP BY reason`, and both come from one aggregate query. Nothing
can drift because nothing is duplicated.

Immutability is enforced twice: the repository port has no update or delete, and a trigger refuses any `UPDATE`
(`DELETE` stays allowed so rows can leave with their user via `ON DELETE CASCADE`, for the later account-deletion work).

A materialised balance is a possible later optimisation, but only as a **rebuildable projection** of this table (it can
always be recomputed from the ledger). It is not built now because there is nothing to gain yet: the aggregate is served by
an index and a student has tens to thousands of rows. Trigger: a measured slow aggregate for heavy users.

### 2. A reward has an identity, and the database enforces it

`(user_id, reason, source_id)` is `UNIQUE`. The reason says what kind of reward it is (`exercise-completed`,
`lesson-completed`, `achievement-unlocked`); the source is what it was for — an exercise id, a lesson id or an
achievement key. Granting is one `INSERT ... ON CONFLICT DO NOTHING ... RETURNING`: an empty result means "already paid",
and **nothing else in the application decides that** — no read-then-write, so two concurrent requests cannot both win.

The reward rules live in the domain, in one place: +10 the first time a student answers a given exercise correctly, +25
the first time they complete a given lesson, +50 (each achievement's own `rewardPoints`) the first time they unlock a
given achievement. Repeats pay 0. The amount is never a parameter of the exercise or lesson reward, so no caller can
choose it.

### 3. One transaction, exclusive per student

`GamificationRepository.transactionForUser` opens one PostgreSQL transaction and takes a **transaction-scoped advisory
lock keyed on the student** (`pg_advisory_xact_lock`). Inside it the reward, every achievement it unlocks and those
achievements' own rewards are written together or not at all, and a student's reward work runs one request at a time.
The lock is what stops a subtle race that the unique constraint alone cannot: two different exercises finishing together
at 85 points each see only 95, and _neither_ unlocks `hundred-points` though together they cross 100. Different students
never contend. The lock is released by commit or rollback, so a failed request cannot leave it held. The unique
constraints remain the second line of defence.

### 4. The attempt/completion and the reward are two steps — by design, with a safe order

An exercise attempt (`exercise_attempts`), a lesson's progress (`lesson_progress`) and the ledger live in different
bounded contexts, each with its own connection pool (ADR-017/019/020), so they cannot share one database transaction
without collapsing those boundaries into one pool — a global refactor M8 must not do. The order makes that safe:

1. The M7/M6 use case runs **unchanged** and persists the attempt or the completion. It awards nothing, so it is harmless on
   its own.
2. The reward use case runs from that persisted, server-decided outcome — for a _correct_ answer only, and for a lesson
   whose completion succeeded.
3. The reward is **derived from the ledger, not from the attempt**: "already paid" is the ledger's unique row. So if step
   2 fails, the request fails (generic `500`), everything step 2 wrote is rolled back, the attempt stays, and **repeating the
   action grants the reward** — the next correct answer to that exercise, or the next completion of that lesson.

What is _not_ guaranteed: a student who gets that `500` and never repeats the action has an attempt without its reward.
The failure mode is "a reward is late", never "a reward is paid twice" or "an achievement has no payout". Reconciling
without a repeat would need a background job, which the brief excludes for M8.

### 5. Achievements are rules (code), not a table

An achievement is an `AchievementRule`: a stable language-neutral `key`, an `iconId`, a `rewardPoints`, the **event
types that can trigger it** and a `progress(facts) → { current, target }` function. `AchievementRegistry` validates the
set at start-up (unique keys, valid rewards, reachable targets, at least one trigger). Adding an achievement — fifty
exercises, a first vocabulary word — is adding a rule; no shared function grows a branch.

There is deliberately **no `achievements` table**. The criteria are code, so a table would be a second copy of them to seed
and keep in sync, with a foreign key to nothing useful — the same reasoning as ADR-018/019/020 for content. What is
stored is what a student earned: `user_achievements`, primary key `(user_id, achievement_key)`, `achievement_key` a
validated slug rather than a foreign key. Retiring an achievement means removing its rule; its unlock rows stay and are
simply not shown.

The four M8 rules: `first-exercise` (1 rewarded exercise), `first-lesson` (1 rewarded lesson), `ten-correct-exercises`
(10 rewarded exercises — one reward per _distinct_ exercise, so ten attempts at one exercise count once) and
`hundred-points` (total ≥ 100).

### 6. Rules read the ledger, not other contexts

`GamificationFacts` — total points and the number of rewards per reason — is derived from the ledger alone. Because every
distinct exercise or lesson that was ever completed has exactly one reward row, counting rewards _is_ counting distinct
completions. So evaluating an achievement needs no read of `exercise_attempts` or `lesson_progress`, the transaction
stays inside one context, and a rule is a pure function that is unit-testable without a database.

### 7. Achievements are evaluated on events, never on reads

After a reward the flow produces domain events — `exercise-completed` or `lesson-completed`, then `points-awarded` —
and evaluates **only the rules those events can trigger**. Each achievement's own payout is itself a `points-awarded`
event, so an unlock can chain into another (a lesson can unlock `first-lesson`, whose +50 crosses 100 and unlocks
`hundred-points`) until nothing new unlocks (bounded by the number of achievements). The dashboard and the achievements
page only _read_ — they never evaluate or write. This is synchronous and in-process; the event shape is what a later
event-driven design would publish, without a broker now.

### 8. The API is read-only and session-scoped

`GET /gamification/summary`, `/achievements`, `/point-transactions?limit=&before=` (keyset paging). No `:userId` anywhere,
a `userId` (or any) query key is a `400`, no route creates points or unlocks anything, and the response contracts are
allowlists. Rewards leave only as a `rewards` field on the answer and lesson-completion responses — information for the
interface, never an input.

### 9. Texts are localisable, keys are not

Achievements are identified by key and icon id; their `title` and `description` come from an `AchievementTextCatalog`
(locale → key → text) validated at start-up: the default locale must exist and every locale must have every
achievement. The locale is negotiated from `Accept-Language`. Only English exists (no interface localisation yet); a
second language is a catalog entry, proved with a fictional locale.

## Options considered

- **A stored `total_points` (or a balance table).** Two sources of truth that must be kept consistent under concurrency;
  rejected in favour of `SUM` over an indexed ledger (revisit trigger above).
- **An `achievements` table.** Duplicates the rules; rejected (see 5).
- **Put the reward inside `SubmitExerciseAnswerUseCase` / `CompleteLessonUseCase`.** Would change M6/M7's constructors and
  tests and make them depend on gamification. Wrapping them keeps the dependency pointing one way.
- **One pool / one transaction for attempt + reward.** Atomic, but a global refactor of four contexts' connection
  handling; rejected for M8 (see 4).
- **Reward by attempt count or "first correct attempt" from `exercise_attempts`.** Would need a cross-context read inside
  the reward transaction and an attempt id as the identity; the ledger key is simpler and self-healing.
- **A message broker / outbox / job queue for events.** Explicitly out of scope; the in-process synchronous flow is
  transactional and enough.
- **Optimistic retry instead of an advisory lock.** More code and still needs a serialisation story for the threshold
  race; the lock is one statement.

## Consequences

- Positive: no balance to drift; a reward can be paid at most once by the database itself; an achievement and its payout
  are never half-written; rules are small, unit-testable and independent; dashboards cost three reads whatever the number of
  achievements; nothing new to run (no service, no broker).
- Negative / limits (see also the risk register in `.claude/current-state.md`):
  - An attempt or a completion can exist without its reward until the action is repeated (4).
  - The total is an aggregate over a student's rows on every read; heavy users will eventually want the projection.
  - Rewards are computed against the _current_ rule set: changing a reward amount later does not rewrite history (correct
    for a ledger), and adding an achievement does not retroactively unlock it for existing students (there is no
    backfill job; a rule triggers on the student's next relevant event, and it then evaluates against the whole ledger, so
    it does unlock at that point if the criterion is already met).
  - `pg_advisory_xact_lock` is verified against PGlite (which serialises everything) in the default suite; the true
    multi-connection behaviour is exercised only by the opt-in Postgres test (`TEST_DATABASE_URL`).
  - One more `pg` pool per API process (five: identity, profile, lessons, exercises, gamification).
- Not built, on purpose: streaks, leaderboards, rankings, XP levels, spending points, notifications, a reward
  marketplace, adaptive learning, backfill and reconciliation jobs.

## References

- [gamification-architecture.md](../architecture/gamification-architecture.md), [API docs](../api/README.md),
  [security baseline](../security/security-baseline.md), [testing strategy](../testing/testing-strategy.md).
- PostgreSQL: `INSERT ... ON CONFLICT`, advisory locks (`pg_advisory_xact_lock`), `BEFORE UPDATE` triggers.
