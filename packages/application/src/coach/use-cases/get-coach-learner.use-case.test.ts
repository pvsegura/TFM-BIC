import { describe, expect, it } from "vitest";

import { FakeContentRepository, makeSampleCatalog } from "../../content/test-support/fakes.js";
import type { GetLessonUseCase } from "../../lesson/use-cases/get-lesson.use-case.js";
import type { GetVocabularyItemUseCase } from "../../vocabulary/use-cases/get-vocabulary-item.use-case.js";
import { FakeLearnerInsightsReadModel } from "../test-support/fakes.js";
import { GetCoachLearnerUseCase } from "./get-coach-learner.use-case.js";

/** The status check never resolves a page context, so these are never reached. */
const unused = { execute: () => Promise.reject(new Error("not used by the status check")) };

function useCase() {
  return new GetCoachLearnerUseCase({
    contentRepository: new FakeContentRepository(makeSampleCatalog()),
    insights: new FakeLearnerInsightsReadModel(),
    getLesson: unused as unknown as GetLessonUseCase,
    getVocabularyItem: unused as unknown as GetVocabularyItemUseCase,
  });
}

describe("GetCoachLearnerUseCase", () => {
  it("describes the learner in a known language at the level the application derives", async () => {
    const learner = await useCase().execute({ userId: "user-1", language: "pl" });

    expect(learner).toEqual({ languageId: "pl", languageName: "Polish", cefrLevel: "A1" });
  });

  it.each([
    ["an unknown language", "qq"],
    ["a malformed language code", "Polish!"],
  ])("is no course context for %s", async (_, language) => {
    expect(await useCase().execute({ userId: "user-1", language })).toBeNull();
  });
});
