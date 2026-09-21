import {
  createContentId,
  createDefaultAchievementRegistry,
  createDefaultExerciseTypeRegistry,
  createExerciseId,
  ExerciseNotFoundError,
  InvalidExerciseAnswerError,
  LessonNotFoundError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import {
  FakeExerciseAttemptRepository,
  FakeExerciseRepository,
  makeExerciseCatalog,
} from "../../exercise/test-support/fakes.js";
import { SubmitExerciseAnswerUseCase } from "../../exercise/use-cases/submit-exercise-answer.use-case.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeLessonProgressRepository } from "../../lesson/test-support/fakes.js";
import { CompleteLessonUseCase } from "../../lesson/use-cases/complete-lesson.use-case.js";
import {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
} from "../achievement-texts.js";
import { RewardAwardError } from "../reward-award.error.js";
import { FakeGamificationRepository } from "../test-support/fakes.js";
import { AwardRewardsUseCase } from "./award-rewards.use-case.js";
import { CompleteLessonWithRewardsUseCase } from "./complete-lesson-with-rewards.use-case.js";
import { SubmitExerciseAnswerWithRewardsUseCase } from "./submit-exercise-answer-with-rewards.use-case.js";

const ANA = "user-ana";
const BEN = "user-ben";
const T0 = new Date("2026-01-01T10:00:00.000Z");
const exerciseId = createExerciseId;
const lessonId = createContentId;

function setup() {
  const catalog = makeExerciseCatalog();
  const content = new GetContentUseCase(new FakeContentRepository(catalog));
  const clock = new FixedClock(T0);
  const registry = createDefaultAchievementRegistry();
  const gamification = new FakeGamificationRepository();
  const attempts = new FakeExerciseAttemptRepository();
  const progress = new FakeLessonProgressRepository();
  const texts = new AchievementTexts(
    registry,
    DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
    DEFAULT_INTERFACE_LOCALE,
  );
  const award = new AwardRewardsUseCase(gamification, registry, clock);

  return {
    gamification,
    attempts,
    progress,
    submit: new SubmitExerciseAnswerWithRewardsUseCase(
      new SubmitExerciseAnswerUseCase(
        content,
        new FakeExerciseRepository(catalog.exercises.slice()),
        attempts,
        createDefaultExerciseTypeRegistry(),
        clock,
      ),
      award,
      texts,
    ),
    complete: new CompleteLessonWithRewardsUseCase(
      new CompleteLessonUseCase(content, progress, clock),
      award,
      texts,
    ),
  };
}

const CORRECT = {
  userId: ANA,
  exerciseId: exerciseId("pl-first-mc"),
  answer: "opt-a",
  locale: "en",
};
const WRONG = { ...CORRECT, answer: "opt-b" };

const totalOf = (repo: FakeGamificationRepository, userId = ANA) =>
  repo.transactions.filter((t) => t.userId === userId).reduce((sum, t) => sum + t.amount, 0);

describe("answering an exercise", () => {
  it("returns the M7 verdict unchanged, and rewards the first correct answer", async () => {
    const { submit, gamification } = setup();

    const outcome = await submit.execute(CORRECT);

    expect(outcome.evaluation.correct).toBe(true);
    expect(outcome.result).toMatchObject({ status: "correct", attemptCount: 1 });
    expect(outcome.rewards).toEqual({
      pointsAwarded: 60,
      achievementsUnlocked: [
        {
          key: "first-exercise",
          title: "First exercise",
          description: "Answer an exercise correctly for the first time.",
          iconId: "spark",
          rewardPoints: 50,
        },
      ],
    });
    expect(totalOf(gamification)).toBe(60);
  });

  it("awards nothing for a wrong answer, and does not even open a transaction", async () => {
    const { submit, gamification, attempts } = setup();

    const outcome = await submit.execute(WRONG);

    expect(outcome.evaluation.correct).toBe(false);
    expect(outcome.rewards).toEqual({ pointsAwarded: 0, achievementsUnlocked: [] });
    expect(gamification.transactionCalls).toBe(0);
    expect(attempts.attempts).toHaveLength(1);
  });

  it("rewards a correct answer that follows wrong ones, once", async () => {
    const { submit, gamification } = setup();
    await submit.execute(WRONG);
    await submit.execute(WRONG);

    const outcome = await submit.execute(CORRECT);

    expect(outcome.rewards.pointsAwarded).toBe(60);
    expect(totalOf(gamification)).toBe(60);
  });

  it("stores every attempt but pays only the first correct one", async () => {
    const { submit, gamification, attempts } = setup();
    await submit.execute(CORRECT);

    const again = await submit.execute(CORRECT);
    const andAgain = await submit.execute(CORRECT);

    expect(again.rewards).toEqual({ pointsAwarded: 0, achievementsUnlocked: [] });
    expect(andAgain.rewards.pointsAwarded).toBe(0);
    expect(attempts.attempts).toHaveLength(3);
    expect(attempts.attempts.every((a) => a.correct)).toBe(true);
    expect(totalOf(gamification)).toBe(60);
  });

  it("pays once when the same correct answer is submitted concurrently", async () => {
    const { submit, gamification, attempts } = setup();

    await Promise.all(Array.from({ length: 6 }, () => submit.execute(CORRECT)));

    expect(attempts.attempts).toHaveLength(6);
    expect(totalOf(gamification)).toBe(60);
  });

  it("rewards the student who answered, not anyone else", async () => {
    const { submit, gamification } = setup();

    await submit.execute(CORRECT);

    expect(totalOf(gamification, ANA)).toBe(60);
    expect(totalOf(gamification, BEN)).toBe(0);
  });

  it("does not reward, or record, an answer that is not a well-formed answer", async () => {
    const { submit, gamification, attempts } = setup();

    await expect(submit.execute({ ...CORRECT, answer: 42 })).rejects.toBeInstanceOf(
      InvalidExerciseAnswerError,
    );

    expect(attempts.attempts).toEqual([]);
    expect(gamification.transactionCalls).toBe(0);
  });

  it.each(["pl-first-draft", "pl-draft-tf", "pl-planned-tf", "pl-note-tf", "pl-nope"])(
    "does not reward an exercise that is not available to students: %s",
    async (id) => {
      const { submit, gamification } = setup();

      await expect(
        submit.execute({ ...CORRECT, exerciseId: exerciseId(id), answer: true }),
      ).rejects.toBeInstanceOf(ExerciseNotFoundError);

      expect(gamification.transactionCalls).toBe(0);
    },
  );

  it("keeps the attempt when the reward could not be stored, and pays it on the next correct answer", async () => {
    const { submit, gamification, attempts } = setup();
    gamification.failWhen = () => true;

    await expect(submit.execute(CORRECT)).rejects.toBeInstanceOf(RewardAwardError);
    expect(attempts.attempts).toHaveLength(1);
    expect(gamification.transactions).toEqual([]);
    gamification.failWhen = undefined;

    const retry = await submit.execute(CORRECT);

    expect(retry.rewards.pointsAwarded).toBe(60);
    expect(totalOf(gamification)).toBe(60);
    expect(attempts.attempts).toHaveLength(2);
  });

  it("describes an unlocked achievement in the requested language", async () => {
    const { submit } = setup();

    const outcome = await submit.execute({ ...CORRECT, locale: "qq" });

    // No texts exist for "qq", so the default language is used.
    expect(outcome.rewards.achievementsUnlocked[0]?.title).toBe("First exercise");
  });
});

describe("completing a lesson", () => {
  const DONE = { userId: ANA, lessonId: lessonId("pl-first"), locale: "en" };

  it("returns the M6 progress unchanged, and rewards the first completion", async () => {
    const { complete, gamification } = setup();

    const outcome = await complete.execute(DONE);

    expect(outcome.progress).toEqual({ status: "completed", startedAt: T0, completedAt: T0 });
    expect(outcome.rewards.pointsAwarded).toBe(75);
    expect(outcome.rewards.achievementsUnlocked.map((a) => a.key)).toEqual(["first-lesson"]);
    expect(totalOf(gamification)).toBe(75);
  });

  it("pays nothing when the lesson is completed again, and keeps the original completion", async () => {
    const { complete, gamification } = setup();
    const first = await complete.execute(DONE);

    const again = await complete.execute(DONE);

    expect(again.rewards).toEqual({ pointsAwarded: 0, achievementsUnlocked: [] });
    expect(again.progress).toEqual(first.progress);
    expect(totalOf(gamification)).toBe(75);
  });

  it("pays once when completion arrives many times at once (double click, retry)", async () => {
    const { complete, gamification } = setup();

    await Promise.all(Array.from({ length: 6 }, () => complete.execute(DONE)));

    expect(totalOf(gamification)).toBe(75);
  });

  it.each(["pl-draft", "pl-planned", "pl-note", "pl-nope"])(
    "does not reward a lesson that is not available to students: %s",
    async (id) => {
      const { complete, gamification, progress } = setup();

      await expect(complete.execute({ ...DONE, lessonId: lessonId(id) })).rejects.toBeInstanceOf(
        LessonNotFoundError,
      );

      expect(gamification.transactionCalls).toBe(0);
      expect(progress.records).toEqual([]);
    },
  );

  it("keeps the lesson completed when the reward fails, and pays it when completion is repeated", async () => {
    const { complete, gamification, progress } = setup();
    gamification.failWhen = () => true;

    await expect(complete.execute(DONE)).rejects.toBeInstanceOf(RewardAwardError);
    expect(progress.records[0]?.status).toBe("completed");
    expect(gamification.transactions).toEqual([]);
    gamification.failWhen = undefined;

    const retry = await complete.execute(DONE);

    expect(retry.rewards.pointsAwarded).toBe(75);
    expect(totalOf(gamification)).toBe(75);
  });

  it("gives each student their own reward for the same lesson", async () => {
    const { complete, gamification } = setup();

    await complete.execute(DONE);
    const ben = await complete.execute({ ...DONE, userId: BEN });

    expect(ben.rewards.pointsAwarded).toBe(75);
    expect(totalOf(gamification, ANA)).toBe(75);
    expect(totalOf(gamification, BEN)).toBe(75);
  });
});

describe("an exercise and a lesson together", () => {
  it("count towards the same totals, and unlock the achievements those totals reach", async () => {
    const { submit, complete, gamification } = setup();

    await submit.execute(CORRECT); // 60
    const lesson = await complete.execute({
      userId: ANA,
      lessonId: lessonId("pl-first"),
      locale: "en",
    }); // +25, first-lesson +50 -> 135, hundred-points +50 -> 185

    expect(lesson.rewards.achievementsUnlocked.map((a) => a.key)).toEqual([
      "first-lesson",
      "hundred-points",
    ]);
    expect(totalOf(gamification)).toBe(185);
  });
});
