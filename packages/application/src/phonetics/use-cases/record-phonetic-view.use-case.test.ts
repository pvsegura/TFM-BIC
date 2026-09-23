import { PhoneticRepresentationNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import {
  FakePhoneticContentRepository,
  FakeUserPhoneticProgressRepository,
  makePhoneticsCatalog,
} from "../test-support/fakes.js";
import { RecordPhoneticViewUseCase } from "./record-phonetic-view.use-case.js";

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
  const useCase = new RecordPhoneticViewUseCase(content, phoneticsRepository, userProgress, clock);
  return { useCase, userProgress, clock };
}

describe("RecordPhoneticViewUseCase", () => {
  it("records a view of a visible representation, stamped with the current time", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
    });

    expect(result).toEqual({
      status: "viewed",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: null,
      completedAt: null,
    });
  });

  it("does not create a duplicate record, and refreshes the last-viewed time on a repeat view", async () => {
    const { useCase, userProgress, clock } = setup();
    await useCase.execute({ userId: USER, phoneticRepresentationId: "pl-ipa-ts" as never });
    clock.advance(5 * 60 * 1000);

    await useCase.execute({ userId: USER, phoneticRepresentationId: "pl-ipa-ts" as never });

    expect(userProgress.records.filter((r) => r.userId === USER)).toHaveLength(1);
  });

  it("never takes a completed representation back to viewed", async () => {
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

    const result = await useCase.execute({
      userId: USER,
      phoneticRepresentationId: "pl-ipa-ts" as never,
    });

    expect(result.status).toBe("completed");
  });

  it("refuses to record a view of a representation that is not visible, and writes nothing", async () => {
    const { useCase, userProgress } = setup();

    await expect(
      useCase.execute({ userId: USER, phoneticRepresentationId: "pl-ipa-draft" as never }),
    ).rejects.toThrow(PhoneticRepresentationNotFoundError);
    expect(userProgress.writeCalls).toBe(0);
  });
});
