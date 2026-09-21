import type { LessonId } from "@tfm-bic/domain";

import type { LessonProgressView } from "../../lesson/progress-view.js";
import type { CompleteLessonUseCase } from "../../lesson/use-cases/complete-lesson.use-case.js";
import type { AchievementTexts } from "../achievement-texts.js";
import { toRewardsView, type RewardsView } from "../views.js";
import type { AwardRewardsUseCase } from "./award-rewards.use-case.js";

export interface CompleteLessonWithRewardsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  lessonId: LessonId;
  /** The language the texts of any unlocked achievement should be in. */
  locale: string;
}

export interface CompleteLessonWithRewardsResult {
  progress: LessonProgressView;
  rewards: RewardsView;
}

/**
 * Completing a lesson, then rewarding it. The lesson flow is M6's and is reused as it is: the
 * lesson must be visible and completion is persisted by the server, idempotently. The reward is
 * granted from that persisted state — never from anything the client says — and is safe to
 * repeat: a second completion (double click, retry, refresh) finds the reward already in the
 * ledger and pays nothing. If the reward fails the lesson stays completed, the request fails,
 * and repeating the completion grants it.
 */
export class CompleteLessonWithRewardsUseCase {
  constructor(
    private readonly completeLesson: CompleteLessonUseCase,
    private readonly awardRewards: AwardRewardsUseCase,
    private readonly texts: AchievementTexts,
  ) {}

  async execute(input: CompleteLessonWithRewardsInput): Promise<CompleteLessonWithRewardsResult> {
    const progress = await this.completeLesson.execute({
      userId: input.userId,
      lessonId: input.lessonId,
    });

    const reward = await this.awardRewards.execute({
      userId: input.userId,
      trigger: { kind: "lesson-completed", lessonId: input.lessonId },
    });
    return { progress, rewards: toRewardsView(reward, this.texts, input.locale) };
  }
}
