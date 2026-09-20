import { describe, expect, it } from "vitest";

import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeProfileRepository } from "../test-support/fakes.js";
import { GetCurrentStudentProfileUseCase } from "./get-current-student-profile.use-case.js";

function setup() {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const profileRepository = new FakeProfileRepository(clock);
  const useCase = new GetCurrentStudentProfileUseCase(profileRepository);
  return { profileRepository, useCase };
}

describe("GetCurrentStudentProfileUseCase", () => {
  it("returns null when the student has not saved a profile yet", async () => {
    const { useCase } = setup();

    expect(await useCase.execute({ userId: "user-1" })).toBeNull();
  });

  it("returns the student's saved profile", async () => {
    const { profileRepository, useCase } = setup();
    await profileRepository.upsert("user-1", {
      firstName: "Łukasz",
      lastName: "Kowalski",
      nickname: "lukas",
      avatarId: "avatar-02",
    });

    const profile = await useCase.execute({ userId: "user-1" });

    expect(profile).toMatchObject({
      userId: "user-1",
      firstName: "Łukasz",
      lastName: "Kowalski",
      nickname: "lukas",
      avatarId: "avatar-02",
    });
  });

  it("never returns another student's profile", async () => {
    const { profileRepository, useCase } = setup();
    await profileRepository.upsert("user-2", { firstName: "Someone Else" });

    expect(await useCase.execute({ userId: "user-1" })).toBeNull();
  });

  it("does not create a profile as a side effect of reading", async () => {
    const { profileRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1" });

    expect(profileRepository.upsertCalls).toBe(0);
    expect(profileRepository.profiles).toHaveLength(0);
  });
});
