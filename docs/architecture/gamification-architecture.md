# Gamification architecture (M8)

Reference for how points, achievements and rewards work. The decisions and their trade-offs are in
[ADR-021](../adr/adr-021-gamification.md); the HTTP surface is in the [API docs](../api/README.md).

## What exists

- **Points**: an append-only ledger (`point_transactions`), the only record of points. A total is derived from it.
- **Rewards**: granted only by `AwardRewardsUseCase`, from a server-decided action — the first correct answer to an
  exercise, the first completion of a lesson, the first unlock of an achievement.
- **Achievements**: rules in code (`AchievementRule`), four of them; what a student unlocked is `user_achievements`.
- **Read API + UI**: a summary (dashboard), the achievements list and a paged points history; `/dashboard` and
  `/achievements` pages; a reward notice in the exercise verdict and the lesson completion.

## Reward rules

| Reward               | When it is granted                                                                          | Amount         | Identity (`reason` / `source_id`)            | Not granted when                                         |
| -------------------- | ------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------- | -------------------------------------------------------- |
| Exercise completed   | The first time the student's answer to a given exercise is judged **correct** by the server | +10            | `exercise-completed` / the exercise id       | Wrong answer; the exercise already rewarded; not visible |
| Lesson completed     | The first time the student's completion of a given lesson is persisted                      | +25            | `lesson-completed` / the lesson id           | The lesson already rewarded; not visible                 |
| Achievement unlocked | The first time a rule's criterion is met after a relevant event                             | +50 (per rule) | `achievement-unlocked` / the achievement key | Already unlocked                                         |

Attempts are always stored (M7 is untouched): a repeat that is correct is an attempt worth +0.

## Achievements

| Key                     | Criterion                                            | Triggered by         | Reward |
| ----------------------- | ---------------------------------------------------- | -------------------- | ------ |
| `first-exercise`        | ≥ 1 exercise rewarded                                | `exercise-completed` | +50    |
| `first-lesson`          | ≥ 1 lesson rewarded                                  | `lesson-completed`   | +50    |
| `ten-correct-exercises` | ≥ 10 **distinct** exercises rewarded                 | `exercise-completed` | +50    |
| `hundred-points`        | total points ≥ 100 (an achievement's own +50 counts) | `points-awarded`     | +50    |

Keys are language-neutral slugs and are what is stored and sent. `title`/`description` come from the text catalog and
are resolved per request (`Accept-Language`, default English).

## Where it lives

| Layer       | Where                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain      | `packages/domain/src/gamification/` — `PointTransaction`, `RewardReason`, point amounts and the reward rules, `AchievementRule` / `AchievementRegistry` / `findAchieved`, events, `GamificationFacts`. No I/O.                                                                                                                                                                        |
| Application | `packages/application/src/gamification/` — the `GamificationRepository` port; `AwardRewardsUseCase`; `SubmitExerciseAnswerWithRewardsUseCase` and `CompleteLessonWithRewardsUseCase` (wrappers over the M7/M6 use cases); `GetGamificationSummary`, `ListAchievements`, `ListPointTransactions`; `AchievementTexts`; view models; an in-memory fake with per-user queue and rollback. |
| Data        | `packages/data/src/gamification/` — schema, migrations, `DrizzleGamificationRepository`, PGlite test database. Own pool and migration set (`db:generate:gamification` / `db:migrate:gamification`).                                                                                                                                                                                   |
| API         | `apps/api/src/routes/gamification.route.ts` (read-only), the `rewards` field on `exercises.route.ts` / `lessons.route.ts`, composition in `apps/api/src/composition/gamification-*.ts`.                                                                                                                                                                                               |
| Web         | `services/gamification-api.ts`, `hooks/use-gamification.ts`, `components/{points-summary,achievement-list,point-history-list,reward-notice,achievement-icon}.tsx`, `pages/{dashboard,achievements}-page.tsx`.                                                                                                                                                                         |

## Database

- `point_transactions(id identity PK, user_id FK→users cascade, reason, source_id, amount int, created_at)`;
  `UNIQUE (user_id, reason, source_id)`; index `(user_id, id)`; `CHECK`s on `reason` (closed set), `source_id` (slug, ≤ 64) and
  `amount` (1–10 000); a `BEFORE UPDATE` trigger that raises — the ledger cannot be edited.
- `user_achievements(user_id FK→users cascade, achievement_key, unlocked_at)`; `PRIMARY KEY (user_id, achievement_key)`;
  `CHECK` on the key shape.
- No `achievements` table and no balance column (ADR-021).
- Queries: facts = one `GROUP BY reason` aggregate served by the unique index; history = keyset paging on `(user_id, id)`;
  unlocks = one indexed read. The dashboard is three reads whatever the number of achievements.
- Migrations: `0000` creates the tables, `0001` adds the immutability trigger. Run after Identity's (`users` must exist).
  They apply from an empty database and again as a no-op on a migrated one (verified with the real `drizzle-kit` CLI on
  PostgreSQL 17). `drizzle-kit` has no down migrations, so a rollback is manual (below).

Manual rollback (this destroys every student's points — never on production data without a backup):

```sql
DROP TRIGGER point_transactions_immutable ON point_transactions;
DROP FUNCTION point_transactions_reject_update();
DROP TABLE user_achievements;
DROP TABLE point_transactions;
DELETE FROM drizzle.__drizzle_migrations_gamification;
```

## The reward flow

```
POST /exercises/:id/answer                       POST /lessons/:id/complete
  M7: visible? well-formed? judge -> attempt       M6: visible? persist completion (idempotent)
        |  (only if correct)                              |
        v                                                 v
  AwardRewardsUseCase.execute({ userId (session), trigger })
    transactionForUser(userId)                 <- one PG transaction + advisory lock on the student
      recordPoints(+10 / +25)  --- null? -> already rewarded: return, evaluate nothing
      events = [exercise|lesson-completed, points-awarded]
      loop: facts = one aggregate; rules = registry.triggeredBy(events) not yet unlocked and met
            for each: recordUnlock -> recordPoints(+50) -> next events = [points-awarded]
      until nothing new unlocks
    commit  (any throw => rollback of everything above)
  -> { pointsAwarded, unlocked[] }  -> `rewards` in the response
```

## Idempotency and concurrency

| Threat                                                   | What stops it                                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Double click / refresh / network retry                   | The unique `(user, reason, source)` row: the second write is `ON CONFLICT DO NOTHING` and reports `null`   |
| Two concurrent requests, same reward                     | Same constraint (the second insert waits for the first, then does nothing) + the per-student advisory lock |
| Two concurrent rewards crossing an achievement threshold | The advisory lock: the second request sees everything the first committed                                  |
| The same achievement unlocked twice                      | `PRIMARY KEY (user_id, achievement_key)` + `ON CONFLICT DO NOTHING`; a duplicate unlock pays nothing       |
| A payout without its unlock, or an unlock without one    | One transaction: both committed or both rolled back                                                        |
| Reward step fails after the attempt/completion           | The request fails; repeating the action grants it (the reward is derived from the ledger, not the attempt) |
| A client asking for points                               | No route creates points; request bodies are strict; the amount is never a caller parameter                 |

## Adding a new reward or achievement

- **A new achievement** (say `fifty-correct-exercises`): add a rule with `completionCountRule` (or a new rule kind) in
  `createDefaultAchievementRegistry`, add its icon id to `ACHIEVEMENT_ICON_IDS` if it needs a new one (and a glyph in
  `achievement-icon.tsx`), and add its text to every language in the text catalog. Start-up refuses a rule without texts.
  No other function changes.
- **A new way to earn points** (a vocabulary word): add a `RewardReason`, its amount, a `RewardTrigger` kind and the
  event; call `AwardRewardsUseCase` from the use case that judges it; add a label in `reward-labels.ts`; extend the
  `CHECK` on `reason` with a migration. Rules that need new facts extend `GamificationFacts` (still derived from the ledger).
- **A new language for the texts**: one entry in `DEFAULT_ACHIEVEMENT_TEXT_CATALOG`; no logic changes.
- **Later, without a rewrite**: streaks (a fact from the ledger's dates), leaderboards (an aggregate over the ledger), a
  balance projection (rebuildable from the ledger), a broker (the events already have a shape).
