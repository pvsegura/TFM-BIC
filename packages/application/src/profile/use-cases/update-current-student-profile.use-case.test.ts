import {
  InvalidAvatarIdError,
  InvalidNicknameError,
  InvalidProfileNameError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeProfileRepository } from "../test-support/fakes.js";
import { UpdateCurrentStudentProfileUseCase } from "./update-current-student-profile.use-case.js";

function setup() {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const profileRepository = new FakeProfileRepository(clock);
  const useCase = new UpdateCurrentStudentProfileUseCase(profileRepository);
  return { clock, profileRepository, useCase };
}

describe("UpdateCurrentStudentProfileUseCase", () => {
  it("creates the profile on the first save, leaving unset fields null", async () => {
    const { useCase } = setup();

    const profile = await useCase.execute({ userId: "user-1", firstName: "Ana" });

    expect(profile).toMatchObject({
      userId: "user-1",
      firstName: "Ana",
      lastName: null,
      nickname: null,
      avatarId: null,
    });
  });

  it("saves every editable field at once", async () => {
    const { useCase } = setup();

    const profile = await useCase.execute({
      userId: "user-1",
      firstName: "Ana",
      lastName: "García",
      nickname: "anita",
      avatarId: "avatar-03",
    });

    expect(profile).toMatchObject({
      firstName: "Ana",
      lastName: "García",
      nickname: "anita",
      avatarId: "avatar-03",
    });
  });

  it("changes only the fields provided and preserves the rest", async () => {
    const { useCase } = setup();
    await useCase.execute({
      userId: "user-1",
      firstName: "Ana",
      lastName: "García",
      nickname: "anita",
      avatarId: "avatar-03",
    });

    const profile = await useCase.execute({ userId: "user-1", nickname: "ani" });

    expect(profile).toMatchObject({
      firstName: "Ana",
      lastName: "García",
      nickname: "ani",
      avatarId: "avatar-03",
    });
  });

  it("persists the update so a later read returns it", async () => {
    const { profileRepository, useCase } = setup();

    await useCase.execute({ userId: "user-1", firstName: "Ana" });

    expect((await profileRepository.findByUserId("user-1"))?.firstName).toBe("Ana");
  });

  it("trims surrounding whitespace before saving", async () => {
    const { useCase } = setup();

    const profile = await useCase.execute({
      userId: "user-1",
      firstName: "  Ana ",
      nickname: "  fox  ",
    });

    expect(profile.firstName).toBe("Ana");
    expect(profile.nickname).toBe("fox");
  });

  it("preserves Unicode names exactly (no ASCII folding or diacritic stripping)", async () => {
    const { useCase } = setup();

    const profile = await useCase.execute({
      userId: "user-1",
      firstName: "Łukasz",
      lastName: "Dvořák-Nguyễn",
      nickname: "李小龙",
    });

    expect(profile).toMatchObject({
      firstName: "Łukasz",
      lastName: "Dvořák-Nguyễn",
      nickname: "李小龙",
    });
  });

  it("treats HTML-like input as inert text without altering it", async () => {
    const { useCase } = setup();

    const profile = await useCase.execute({
      userId: "user-1",
      firstName: "<script>alert(1)</script>",
    });

    expect(profile.firstName).toBe("<script>alert(1)</script>");
  });

  it("rejects a whitespace-only first name and persists nothing", async () => {
    const { profileRepository, useCase } = setup();

    await expect(useCase.execute({ userId: "user-1", firstName: "   " })).rejects.toThrow(
      InvalidProfileNameError,
    );
    expect(profileRepository.upsertCalls).toBe(0);
  });

  it("rejects an over-long last name", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ userId: "user-1", lastName: "a".repeat(101) })).rejects.toThrow(
      InvalidProfileNameError,
    );
  });

  it("rejects an invalid nickname", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ userId: "user-1", nickname: "x" })).rejects.toThrow(
      InvalidNicknameError,
    );
  });

  it("rejects an avatar id that is not in the catalog", async () => {
    const { useCase } = setup();

    await expect(useCase.execute({ userId: "user-1", avatarId: "avatar-99" })).rejects.toThrow(
      InvalidAvatarIdError,
    );
  });

  it("rejects an arbitrary external URL as an avatar", async () => {
    const { profileRepository, useCase } = setup();

    await expect(
      useCase.execute({ userId: "user-1", avatarId: "https://evil.example.com/a.png" }),
    ).rejects.toThrow(InvalidAvatarIdError);
    expect(profileRepository.upsertCalls).toBe(0);
  });

  it("validates every field before writing, so one bad field saves nothing", async () => {
    const { profileRepository, useCase } = setup();

    await expect(
      useCase.execute({ userId: "user-1", firstName: "Ana", nickname: "x" }),
    ).rejects.toThrow(InvalidNicknameError);

    expect(profileRepository.upsertCalls).toBe(0);
    expect(profileRepository.profiles).toHaveLength(0);
  });

  it("only ever changes the profile of the userId it was given", async () => {
    const { profileRepository, useCase } = setup();
    await useCase.execute({ userId: "user-2", firstName: "Other", nickname: "other" });

    await useCase.execute({ userId: "user-1", firstName: "Ana" });

    expect(await profileRepository.findByUserId("user-2")).toMatchObject({
      firstName: "Other",
      nickname: "other",
    });
  });

  it("accepts an empty update as a no-op that still returns the profile", async () => {
    const { useCase } = setup();
    await useCase.execute({ userId: "user-1", firstName: "Ana" });

    const profile = await useCase.execute({ userId: "user-1" });

    expect(profile.firstName).toBe("Ana");
  });
});
