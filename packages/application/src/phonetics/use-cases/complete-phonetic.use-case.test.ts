import { PhoneticRepresentationNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import {
  FakePhoneticContentRepository,
  FakeUserPhoneticProgressRepository,
  makePhoneticsCatalog,
} from "../test-support/fakes.js";
import { CompletePhoneticUseCase } from "./complete-phonetic.use-case.js";

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
  const clock = new FixedClock(T0);
  const useCase = new CompletePhoneticUseCase(content, phoneticsRepository, userProgress, clock);
  return { useCase, userProgress, clock };
}

describe("CompletePhoneticUseCase", () => {
  it("completes a visible representation that was never viewed or practiced, all at the same moment", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
    });

    expect(result).toEqual({
      status: "completed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: null,
      completedAt: T0,
    });
  });

  it("is idempotent: completing again changes nothing, not even the completion time", async () => {
    const { useCase, clock } = setup();
    await useCase.execute({ userId: USER, phoneticRepresentationId: "pl-ipa-ts" as never });
    clock.advance(5 * 60 * 1000);

    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
    });

    expect(result.completedAt).toEqual(T0);
  });

  it("refuses to complete a representation that is not visible, and writes nothing", async () => {
    const { useCase, userProgress } = setup();

    await expect(
      useCase.execute({ userId: USER, phoneticRepresentationId: "pl-ipa-draft" as never }),
    ).rejects.toThrow(PhoneticRepresentationNotFoundError);
    expect(userProgress.writeCalls).toBe(0);
  });
});
