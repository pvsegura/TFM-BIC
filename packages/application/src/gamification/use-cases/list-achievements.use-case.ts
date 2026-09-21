import type { AchievementRegistry } from "@tfm-bic/domain";

import type { AchievementTexts } from "../achievement-texts.js";
import type { GamificationRepository } from "../ports/gamification-repository.js";
import { toAchievementViews, type AchievementView } from "../views.js";

export interface ListAchievementsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  locale: string;
}

export interface AchievementList {
  achievements: AchievementView[];
  unlockedCount: number;
  totalCount: number;
}

/**
 * Every achievement, locked or unlocked, with the student's progress and unlock date. Two reads
 * for the whole catalog (the ledger's facts and the student's unlocks), no lookup per
 * achievement, and nothing is written.
 */
export class ListAchievementsUseCase {
  constructor(
    private readonly repository: GamificationRepository,
    private readonly registry: AchievementRegistry,
    private readonly texts: AchievementTexts,
  ) {}

  async execute(input: ListAchievementsInput): Promise<AchievementList> {
    const [facts, unlocks] = await Promise.all([
      this.repository.loadFacts(input.userId),
      this.repository.listUnlockedAchievements(input.userId),
    ]);

    const achievements = toAchievementViews(
      this.registry,
      this.texts,
      input.locale,
      facts,
      unlocks,
    );
    return {
      achievements,
      unlockedCount: achievements.filter((a) => a.unlocked).length,
      totalCount: achievements.length,
    };
  }
}
