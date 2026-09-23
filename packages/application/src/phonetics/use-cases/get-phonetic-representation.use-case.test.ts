import { createContentId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import {
  FakePhoneticContentRepository,
  FakeUserPhoneticProgressRepository,
  makePhoneticsCatalog,
} from "../test-support/fakes.js";
import { GetPhoneticRepresentationUseCase } from "./get-phonetic-representation.use-case.js";

const catalog = makePhoneticsCatalog();
const content = new FakeContentRepository(catalog);
const phoneticsRepository = new FakePhoneticContentRepository(
  catalog.phoneticTopics,
  catalog.phonetics,
);
const userProgress = new FakeUserPhoneticProgressRepository();
const useCase = new GetPhoneticRepresentationUseCase(content, phoneticsRepository, userProgress);

const USER = "user-1";
const T0 = new Date("2026-01-01T00:00:00.000Z");

describe("GetPhoneticRepresentationUseCase", () => {
  it("returns the representation, its topic title, and the student's progress for it", async () => {
    userProgress.seed({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
      status: "viewed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: null,
      completedAt: null,
    });

    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
    });

    expect(result.representation.ipa).toBe("t͡ʂ");
    expect(result.topic?.id).toBe("consonants");
    expect(result.progress).toEqual({
      status: "viewed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: null,
      completedAt: null,
    });
  });

  it("returns undefined topic for a representation that names none", async () => {
    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-no-topic" as never,
    });

    expect(result.topic).toBeUndefined();
  });

  it("returns the derived not_started progress for a representation the student has not touched", async () => {
    const result = await useCase.execute({
      userId: "someone-else",
      phoneticRepresentationId: "pl-ipa-ts" as never,
    });

    expect(result.progress).toEqual({
      status: "not_started",
      firstViewedAt: null,
      lastViewedAt: null,
      practicedAt: null,
      completedAt: null,
    });
  });

  it("never reads another student's progress for the representation it returns", async () => {
    userProgress.seed({
      userId: "other-user",
      phoneticRepresentationId: "pl-ipa-a" as never,
      status: "completed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: T0,
      completedAt: T0,
    });

    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-a" as never,
    });

    expect(result.progress.status).toBe("not_started");
  });

  it("throws not-found for a draft representation, without writing", async () => {
    userProgress.writeCalls = 0;

    await expect(
      useCase.execute({ userId: USER, phoneticRepresentationId: "pl-ipa-draft" as never }),
    ).rejects.toThrow(/was not found/);
    expect(userProgress.writeCalls).toBe(0);
  });

  it("ignores an unrelated content id, since phonetics and lessons are separate namespaces", async () => {
    await expect(
      useCase.execute({
        userId: USER,
        phoneticRepresentationId: createContentId("pl-first") as never,
      }),
    ).rejects.toThrow(/was not found/);
  });
});
