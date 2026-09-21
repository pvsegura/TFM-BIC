import {
  createContentId,
  createDefaultExerciseTypeRegistry,
  createExerciseId,
  createLanguageId,
  type ContentCatalog,
} from "@tfm-bic/domain";
import {
  makeMultipleChoiceExercise,
  makeTextAnswerExercise,
  makeTrueFalseExercise,
} from "@tfm-bic/domain/testing";
import { describe, expect, it } from "vitest";

import { GetContentUseCase } from "../content/use-cases/get-content.use-case.js";
import {
  FakeContentRepository,
  FakeExerciseAttemptRepository,
  FakeExerciseRepository,
  makeContentItem,
  makeLanguage,
  makeLanguageLevel,
} from "../testing.js";
import { GetExerciseUseCase } from "./use-cases/get-exercise.use-case.js";
import { ListLessonExercisesUseCase } from "./use-cases/list-lesson-exercises.use-case.js";
import { SubmitExerciseAnswerUseCase } from "./use-cases/submit-exercise-answer.use-case.js";

/**
 * The exercise engine is generic: a language that does not exist yet needs data,
 * not code. `qq` (right-to-left, with its own ids and its own levels) and `zz` are
 * fictional; nothing in the exercise use cases, evaluators or repositories has
 * ever heard of them, and one shared registry serves both.
 */
const QQ = createLanguageId("qq");
const ZZ = createLanguageId("zz");
const NOW = new Date("2027-03-04T05:06:07.000Z");

const catalog: ContentCatalog = {
  languages: [makeLanguage("qq", { direction: "rtl" }), makeLanguage("zz", { locale: "zz" })],
  languageLevels: [
    makeLanguageLevel("qq", "b2", "available"),
    makeLanguageLevel("zz", "a1", "available"),
  ],
  content: [
    makeContentItem("qq-lesson", "qq", "b2", { order: 1 }),
    makeContentItem("zz-lesson", "zz", "a1", { order: 1 }),
  ],
  exercises: [
    makeMultipleChoiceExercise({
      id: createExerciseId("qq-choice"),
      lessonId: createContentId("qq-lesson"),
      languageId: QQ,
      levelId: makeLanguageLevel("qq", "b2", "available").levelId,
      order: 2,
    }),
    makeTextAnswerExercise({
      id: createExerciseId("qq-typed"),
      lessonId: createContentId("qq-lesson"),
      languageId: QQ,
      levelId: makeLanguageLevel("qq", "b2", "available").levelId,
      order: 1,
      configuration: { acceptedAnswers: ["مرحبا"], caseSensitive: false },
    }),
    makeTrueFalseExercise({
      id: createExerciseId("zz-statement"),
      lessonId: createContentId("zz-lesson"),
      languageId: ZZ,
      order: 1,
    }),
  ],
  vocabularyCategories: [],
  vocabulary: [],
};

function setup() {
  const getContent = new GetContentUseCase(new FakeContentRepository(catalog));
  const exercises = new FakeExerciseRepository(catalog.exercises.slice());
  const attempts = new FakeExerciseAttemptRepository();
  const registry = createDefaultExerciseTypeRegistry();
  return {
    list: new ListLessonExercisesUseCase(getContent, exercises, attempts),
    get: new GetExerciseUseCase(getContent, exercises, attempts, registry),
    submit: new SubmitExerciseAnswerUseCase(getContent, exercises, attempts, registry, {
      now: () => NOW,
    }),
    attempts,
  };
}

describe("exercises work for a language and level that were never mentioned in code", () => {
  it("lists a new language's exercises in order", async () => {
    const { list } = setup();

    const { exercises } = await list.execute({
      userId: "u",
      lessonId: createContentId("qq-lesson"),
    });

    expect(exercises.map((e) => [e.id, e.type, e.languageId, e.levelId])).toEqual([
      ["qq-typed", "text-answer", "qq", "b2"],
      ["qq-choice", "multiple-choice", "qq", "b2"],
    ]);
  });

  it("presents, evaluates and records an answer in a right-to-left language with non-Latin text", async () => {
    const { get, submit, attempts } = setup();

    const shown = await get.execute({ userId: "u", exerciseId: createExerciseId("qq-typed") });
    const outcome = await submit.execute({
      userId: "u",
      exerciseId: createExerciseId("qq-typed"),
      answer: " مرحبا ",
    });

    expect(shown.exercise).toMatchObject({ languageId: "qq", type: "text-answer" });
    expect(outcome.evaluation.correct).toBe(true);
    expect(attempts.attempts[0]).toMatchObject({
      submittedAnswer: "مرحبا",
      answeredAt: NOW,
    });
  });

  it("serves a second new language from the same use cases", async () => {
    const { submit } = setup();

    const outcome = await submit.execute({
      userId: "u",
      exerciseId: createExerciseId("zz-statement"),
      answer: false,
    });

    expect(outcome.evaluation.correct).toBe(false);
    expect(outcome.result.status).toBe("incorrect");
  });
});
