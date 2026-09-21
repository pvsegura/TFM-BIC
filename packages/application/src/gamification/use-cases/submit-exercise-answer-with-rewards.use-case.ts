import type { ExerciseId } from "@tfm-bic/domain";

import type {
  SubmitExerciseAnswerResult,
  SubmitExerciseAnswerUseCase,
} from "../../exercise/use-cases/submit-exercise-answer.use-case.js";
import type { AchievementTexts } from "../achievement-texts.js";
import { NO_REWARDS_VIEW, toRewardsView, type RewardsView } from "../views.js";
import type { AwardRewardsUseCase } from "./award-rewards.use-case.js";

export interface SubmitExerciseAnswerWithRewardsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  exerciseId: ExerciseId;
  /** Untrusted: judged by the exercise's own evaluator. */
  answer: unknown;
  /** The language the texts of any unlocked achievement should be in. */
  locale: string;
}

export interface SubmitExerciseAnswerWithRewardsResult extends SubmitExerciseAnswerResult {
  rewards: RewardsView;
}

/**
 * Answering an exercise, then rewarding it. The exercise flow is M7's and is reused as it is —
 * the exercise must be visible, the answer well-formed, the server's evaluator decides
 * correctness and an attempt is appended — and only afterwards, and only for a *correct* answer,
 * the reward flow runs. Which answers are correct, and whether this is the first correct one,
 * are never decided here: correctness is the evaluator's verdict and "first" is the ledger's
 * (a second reward for the same exercise finds the first and pays nothing).
 *
 * The attempt and the reward are written to different stores, so they cannot share a database
 * transaction. The order is what keeps that safe: the attempt is written first and is
 * harmless on its own (it awards nothing), and the reward is derived from the ledger, not from
 * the attempt, so if it fails the request fails, the reward is absent, and the next correct
 * answer to the same exercise grants it — no state is left half done that a retry cannot mend.
 */
export class SubmitExerciseAnswerWithRewardsUseCase {
  constructor(
    private readonly submitAnswer: SubmitExerciseAnswerUseCase,
    private readonly awardRewards: AwardRewardsUseCase,
    private readonly texts: AchievementTexts,
  ) {}

  async execute(
    input: SubmitExerciseAnswerWithRewardsInput,
  ): Promise<SubmitExerciseAnswerWithRewardsResult> {
    const { locale, ...submission } = input;
    const outcome = await this.submitAnswer.execute(submission);

    if (!outcome.evaluation.correct) {
      return { ...outcome, rewards: NO_REWARDS_VIEW };
    }

    const reward = await this.awardRewards.execute({
      userId: input.userId,
      trigger: { kind: "exercise-completed", exerciseId: input.exerciseId },
    });
    return { ...outcome, rewards: toRewardsView(reward, this.texts, locale) };
  }
}
