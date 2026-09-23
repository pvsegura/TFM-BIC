import { LanguageNotFoundError, LevelNotAvailableError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakePhoneticContentRepository,
  FakeUserPhoneticProgressRepository,
  makePhoneticsCatalog,
} from "../test-support/fakes.js";
import { ListPhoneticsUseCase } from "./list-phonetics.use-case.js";

const catalog = makePhoneticsCatalog();

function setup() {
  const content = new FakeContentRepository(catalog);
  const phoneticsRepository = new FakePhoneticContentRepository(
    catalog.phoneticTopics,
    catalog.phonetics,
  );
  const userProgress = new FakeUserPhoneticProgressRepository();
  const useCase = new ListPhoneticsUseCase(content, phoneticsRepository, userProgress);
  return { useCase, userProgress, phoneticsRepository };
}

const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("ListPhoneticsUseCase", () => {
  it("lists the published representations of a language, in topic order then representation order", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.map((i) => i.representation.id)).toEqual([
      "pl-ipa-ts",
      "pl-ipa-a",
      "pl-ipa-no-topic",
    ]);
    expect(result.total).toBe(3);
    expect(result.nextAfter).toBeNull();
  });

  it("excludes a draft representation and one hidden behind a draft topic", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.map((i) => i.representation.id)).not.toContain("pl-ipa-draft");
    expect(result.items.map((i) => i.representation.id)).not.toContain("pl-ipa-hidden");
  });

  it("filters by topic", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      topicId: "vowels" as never,
      limit: 20,
    });

    expect(result.items.map((i) => i.representation.id)).toEqual(["pl-ipa-a"]);
  });

  it("filters by level, excluding representations that have no level", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      levelId: "a1",
      limit: 20,
    });

    expect(result.items.map((i) => i.representation.id)).toEqual(["pl-ipa-ts"]);
  });

  it("filters by the student's own progress status, not_started included", async () => {
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

    const completed = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      status: "completed",
      limit: 20,
    });
    const untouched = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      status: "not_started",
      limit: 20,
    });

    expect(completed.items.map((i) => i.representation.id)).toEqual(["pl-ipa-ts"]);
    expect(untouched.items.map((i) => i.representation.id)).toEqual([
      "pl-ipa-a",
      "pl-ipa-no-topic",
    ]);
  });

  it("never looks at another student's progress", async () => {
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

    const result = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 20 });

    expect(result.items.find((i) => i.representation.id === "pl-ipa-ts")?.progress.status).toBe(
      "not_started",
    );
  });

  it("paginates with a cursor, and needs one batched lookup for the whole page", async () => {
    const { useCase, userProgress } = setup();

    const page1 = await useCase.execute({ userId: USER, languageId: "pl" as never, limit: 2 });
    expect(page1.items.map((i) => i.representation.id)).toEqual(["pl-ipa-ts", "pl-ipa-a"]);
    expect(page1.nextAfter).toBe("pl-ipa-a");
    expect(page1.total).toBe(3);

    userProgress.batchLookups = 0;
    const page2 = await useCase.execute({
      userId: USER,
      languageId: "pl" as never,
      limit: 2,
      after: page1.nextAfter as never,
    });
    expect(page2.items.map((i) => i.representation.id)).toEqual(["pl-ipa-no-topic"]);
    expect(page2.nextAfter).toBeNull();
    expect(userProgress.batchLookups).toBe(1);
  });

  it("proves the platform is language-agnostic: a second, fictional language works the same way", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: USER, languageId: "xx" as never, limit: 20 });

    expect(result.items.map((i) => i.representation.id)).toEqual(["xx-ipa-one"]);
  });

  it("refuses an inactive or unknown language", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: USER, languageId: "zz" as never, limit: 20 }),
    ).rejects.toThrow(LanguageNotFoundError);
  });

  it("refuses a level the language does not offer or has not made available", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        userId: USER,
        languageId: "pl" as never,
        levelId: "a2",
        limit: 20,
      }),
    ).rejects.toThrow(LevelNotAvailableError);
  });
});
