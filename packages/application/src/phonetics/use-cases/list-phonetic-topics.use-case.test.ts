import { LanguageNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakePhoneticContentRepository,
  FakeUserPhoneticProgressRepository,
  makePhoneticsCatalog,
} from "../test-support/fakes.js";
import { ListPhoneticTopicsUseCase } from "./list-phonetic-topics.use-case.js";

const catalog = makePhoneticsCatalog();
const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

function setup() {
  const content = new FakeContentRepository(catalog);
  const phoneticsRepository = new FakePhoneticContentRepository(
    catalog.phoneticTopics,
    catalog.phonetics,
  );
  const userProgress = new FakeUserPhoneticProgressRepository();
  const useCase = new ListPhoneticTopicsUseCase(content, phoneticsRepository, userProgress);
  return { useCase, userProgress };
}

describe("ListPhoneticTopicsUseCase", () => {
  it("lists only published topics, in order, with how many published representations each has", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never });

    expect(result.topics.map((t) => t.id)).toEqual(["consonants", "vowels"]);
    expect(result.topics.find((t) => t.id === "consonants")?.progress).toEqual({
      representationCount: 1,
      viewed: 0,
      practiced: 0,
      completed: 0,
    });
    expect(result.topics.find((t) => t.id === "vowels")?.progress).toEqual({
      representationCount: 1,
      viewed: 0,
      practiced: 0,
      completed: 0,
    });
  });

  it("counts the student's own progress per topic and for the language as a whole, including representations with no topic", async () => {
    const { useCase, userProgress } = setup();
    userProgress.seed({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
      status: "completed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: T0,
      completedAt: T0,
    });
    userProgress.seed({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-a" as never,
      status: "viewed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: null,
      completedAt: null,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never });

    expect(result.topics.find((t) => t.id === "consonants")?.progress).toEqual({
      representationCount: 1,
      viewed: 0,
      practiced: 0,
      completed: 1,
    });
    // 3 representations total for pl: pl-ipa-ts, pl-ipa-a, pl-ipa-no-topic (draft/hidden excluded).
    expect(result.progress).toEqual({
      representationCount: 3,
      viewed: 1,
      practiced: 0,
      completed: 1,
    });
  });

  it("never counts another student's progress", async () => {
    const { useCase, userProgress } = setup();
    userProgress.seed({
      userId: "someone-else",
      phoneticRepresentationId: "pl-ipa-ts" as never,
      status: "completed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: T0,
      completedAt: T0,
    });

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never });

    expect(result.progress).toEqual({
      representationCount: 3,
      viewed: 0,
      practiced: 0,
      completed: 0,
    });
  });

  it("refuses an inactive or unknown language", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ userId: USER, languageId: "zz" as never })).rejects.toThrow(
      LanguageNotFoundError,
    );
  });

  it("proves the platform is language-agnostic", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "xx" as never });

    expect(result.topics.map((t) => t.id)).toEqual(["consonants"]);
    expect(result.topics[0]?.progress.representationCount).toBe(1);
  });
});
