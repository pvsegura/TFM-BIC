import {
  createPointTransaction,
  findAchieved,
  type AchievementDefinition,
  type AchievementKey,
  type AchievementRegistry,
  type ExerciseId,
  type GamificationEvent,
  type LessonId,
  type PointTransaction,
  type RewardReason,
} from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type {
  GamificationRepository,
  GamificationStore,
} from "../ports/gamification-repository.js";
import { RewardAwardError } from "../reward-award.error.js";

/**
 * What just happened in the domain. The only two things that can earn points directly, each
 * identified by the thing that was completed — which is what makes a reward idempotent.
 */
export type RewardTrigger =
  | { readonly kind: "exercise-completed"; readonly exerciseId: ExerciseId }
  | { readonly kind: "lesson-completed"; readonly lessonId: LessonId };

export interface AwardRewardsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  trigger: RewardTrigger;
}

export interface RewardOutcome {
  /** Total points granted by this call, achievements included. `0` for a repeat. */
  pointsAwarded: number;
  /** The ledger rows this call wrote, in order. */
  transactions: readonly PointTransaction[];
  /** The achievements this call unlocked, in order. */
  unlocked: readonly AchievementDefinition[];
}

export const NO_REWARD: RewardOutcome = { pointsAwarded: 0, transactions: [], unlocked: [] };

interface TriggerFacts {
  reason: RewardReason;
  sourceId: string;
  event: GamificationEvent;
}

function describeTrigger(trigger: RewardTrigger): TriggerFacts {
  return trigger.kind === "exercise-completed"
    ? {
        reason: "exercise-completed",
        sourceId: trigger.exerciseId,
        event: { type: "exercise-completed", exerciseId: trigger.exerciseId },
      }
    : {
        reason: "lesson-completed",
        sourceId: trigger.lessonId,
        event: { type: "lesson-completed", lessonId: trigger.lessonId },
      };
}

/**
 * Grants what a completed exercise or lesson earns, and whatever that in turn unlocks. It is
 * the only way points are ever created.
 *
 * **Idempotent by identity.** A reward is identified by (student, reason, source): the first
 * completion of an exercise or lesson pays, every later one finds the reward already in the
 * ledger and pays nothing. Nothing here looks first and writes second — the write itself
 * reports whether it was new — so two requests racing cannot both pay.
 *
 * **One transaction, exclusive per student.** The reward, every achievement it unlocks and
 * those achievements' own rewards are stored together or not at all, and one student's
 * rewards are applied one at a time, so an achievement rule always sees every earlier reward
 * and none is lost or paid twice. If anything throws, everything is rolled back and a
 * `RewardAwardError` says what was being rewarded; repeating the request grants it.
 *
 * **Event-driven evaluation.** After a reward the domain events it stands for
 * (`exercise-completed`/`lesson-completed`, then `points-awarded`) are evaluated against the
 * achievement registry — only the rules those events can trigger, never every rule — and each
 * achievement's reward is itself a `points-awarded` event, until nothing new unlocks.
 */
export class AwardRewardsUseCase {
  constructor(
    private readonly repository: GamificationRepository,
    private readonly registry: AchievementRegistry,
    private readonly clock: Clock,
  ) {}

  async execute(input: AwardRewardsInput): Promise<RewardOutcome> {
    const { reason, sourceId, event } = describeTrigger(input.trigger);
    try {
      return await this.repository.transactionForUser(input.userId, (store) =>
        this.award(store, input.userId, { reason, sourceId, event }),
      );
    } catch (error) {
      throw new RewardAwardError(reason, sourceId, error);
    }
  }

  private async award(
    store: GamificationStore,
    userId: string,
    trigger: TriggerFacts,
  ): Promise<RewardOutcome> {
    const now = this.clock.now();
    const base = await store.recordPoints(
      createPointTransaction({ userId, reason: trigger.reason, sourceId: trigger.sourceId }, now),
    );
    if (base === null) {
      // Already rewarded: the facts have not changed, so there is nothing to evaluate.
      return NO_REWARD;
    }

    const transactions: PointTransaction[] = [base];
    const unlocked: AchievementDefinition[] = [];
    const alreadyUnlocked = new Set<AchievementKey>(
      (await store.listUnlockedAchievements(userId)).map((u) => u.achievementKey),
    );

    let events: readonly GamificationEvent[] = [
      trigger.event,
      { type: "points-awarded", reason: base.reason, amount: base.amount },
    ];
    // Each pass either unlocks something new (finitely many achievements) or ends the loop.
    for (let pass = 0; events.length > 0 && pass <= this.registry.all().length; pass += 1) {
      const facts = await store.loadFacts(userId);
      const next: GamificationEvent[] = [];

      for (const rule of findAchieved(this.registry, events, facts, alreadyUnlocked)) {
        const { key, rewardPoints } = rule.achievement;
        alreadyUnlocked.add(key);
        if ((await store.recordUnlock({ userId, achievementKey: key, unlockedAt: now })) === null) {
          continue;
        }
        unlocked.push(rule.achievement);

        const payout = await store.recordPoints(
          createPointTransaction(
            { userId, reason: "achievement-unlocked", sourceId: key, amount: rewardPoints },
            now,
          ),
        );
        if (payout !== null) {
          transactions.push(payout);
          next.push({ type: "points-awarded", reason: payout.reason, amount: payout.amount });
        }
      }
      events = next;
    }

    return {
      pointsAwarded: transactions.reduce((sum, t) => sum + t.amount, 0),
      transactions,
      unlocked,
    };
  }
}
