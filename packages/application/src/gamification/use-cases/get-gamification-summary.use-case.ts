import type { AchievementRegistry } from "@tfm-bic/domain";

import type { AchievementTexts } from "../achievement-texts.js";
import type { GamificationRepository } from "../ports/gamification-repository.js";
import {
  toAchievementViews,
  toPointTransactionView,
  type AchievementView,
  type PointTransactionView,
} from "../views.js";

/** The dashboard shows the last few rewards, not the whole ledger (that is the paged history). */
const RECENT_TRANSACTIONS = 5;
/** ...and the few achievements the student is closest to, not the whole catalog. */
const IN_PROGRESS_SHOWN = 3;

export interface GetGamificationSummaryInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  /** The language the texts should be in; one the texts exist in (see `AchievementTexts.pickLocale`). */
  locale: string;
}

export interface GamificationSummary {
  totalPoints: number;
  achievements: { unlockedCount: number; totalCount: number };
  /** Locked achievements the student has started on, closest first. */
  inProgressAchievements: AchievementView[];
  recentTransactions: PointTransactionView[];
}

const ratio = (a: AchievementView) => a.progress.current / a.progress.target;

/**
 * What the dashboard shows: total points, how many achievements, what is closest, and the most
 * recent rewards. Three reads, whatever the number of achievements — the total and every
 * achievement's progress come from one aggregate over the ledger — and it writes nothing: a
 * read never evaluates or grants anything.
 */
export class GetGamificationSummaryUseCase {
  constructor(
    private readonly repository: GamificationRepository,
    private readonly registry: AchievementRegistry,
    private readonly texts: AchievementTexts,
  ) {}

  async execute(input: GetGamificationSummaryInput): Promise<GamificationSummary> {
    const { userId, locale } = input;
    const [facts, unlocks, recent] = await Promise.all([
      this.repository.loadFacts(userId),
      this.repository.listUnlockedAchievements(userId),
      this.repository.listPointTransactions(userId, { limit: RECENT_TRANSACTIONS }),
    ]);

    const achievements = toAchievementViews(this.registry, this.texts, locale, facts, unlocks);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    return {
      totalPoints: facts.totalPoints,
      achievements: { unlockedCount, totalCount: achievements.length },
      inProgressAchievements: achievements
        .filter((a) => !a.unlocked && a.progress.current > 0)
        .sort((a, b) => ratio(b) - ratio(a))
        .slice(0, IN_PROGRESS_SHOWN),
      recentTransactions: recent.transactions.map((t) =>
        toPointTransactionView(t, this.registry, this.texts, locale),
      ),
    };
  }
}
