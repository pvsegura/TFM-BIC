import {
  AwardRewardsUseCase,
  GetGamificationSummaryUseCase,
  ListAchievementsUseCase,
  ListPointTransactionsUseCase,
  type AchievementTexts,
} from "@tfm-bic/application";

import type { GamificationDependencies } from "./gamification-dependencies.js";

export interface GamificationUseCases {
  /** Grants rewards. Used only by the exercise and lesson use cases — no route exposes it. */
  awardRewards: AwardRewardsUseCase;
  getSummary: GetGamificationSummaryUseCase;
  listAchievements: ListAchievementsUseCase;
  listPointTransactions: ListPointTransactionsUseCase;
  achievementTexts: AchievementTexts;
}

/**
 * Composition-root wiring only. `awardRewards` is deliberately part of this bag and not of any
 * route: the only callers are the exercise and lesson use cases, so points can only originate in
 * a valid domain action, never in a request that asks for them.
 */
export function createGamificationUseCases(deps: GamificationDependencies): GamificationUseCases {
  const { gamificationRepository: repository, achievementRegistry: registry } = deps;
  const texts = deps.achievementTexts;
  return {
    awardRewards: new AwardRewardsUseCase(repository, registry, deps.clock),
    getSummary: new GetGamificationSummaryUseCase(repository, registry, texts),
    listAchievements: new ListAchievementsUseCase(repository, registry, texts),
    listPointTransactions: new ListPointTransactionsUseCase(repository, registry, texts),
    achievementTexts: texts,
  };
}
