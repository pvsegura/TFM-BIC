import { describe, expect, it } from "vitest";

import {
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { ResolveSessionUseCase } from "./resolve-session.use-case.js";

describe("ResolveSessionUseCase", () => {
  it("returns the user for a valid, unexpired session token", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const userRepository = new FakeUserRepository(clock);
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new ResolveSessionUseCase(
      sessionRepository,
      userRepository,
      tokenGenerator,
      clock,
    );
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-session-token";
    await sessionRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    });

    const result = await useCase.execute({ sessionToken: rawToken });

    expect(result?.id).toBe(user.id);
  });

  it("returns null for a token that matches no session", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const userRepository = new FakeUserRepository(clock);
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new ResolveSessionUseCase(
      sessionRepository,
      userRepository,
      tokenGenerator,
      clock,
    );

    expect(await useCase.execute({ sessionToken: "never-issued" })).toBeNull();
  });

  it("returns null for an expired session", async () => {
    const clock = new FixedClock(new Date("2026-01-10T00:00:00.000Z"));
    const userRepository = new FakeUserRepository(clock);
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new ResolveSessionUseCase(
      sessionRepository,
      userRepository,
      tokenGenerator,
      clock,
    );
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-session-token";
    await sessionRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    });

    expect(await useCase.execute({ sessionToken: rawToken })).toBeNull();
  });

  it("returns null when the session's user no longer exists", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const userRepository = new FakeUserRepository(clock);
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new ResolveSessionUseCase(
      sessionRepository,
      userRepository,
      tokenGenerator,
      clock,
    );
    const rawToken = "raw-session-token";
    await sessionRepository.create({
      userId: "deleted-user",
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    });

    expect(await useCase.execute({ sessionToken: rawToken })).toBeNull();
  });
});
