import { InvalidCredentialsError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakePasswordHasher,
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { LoginUseCase } from "./login.use-case.js";

async function buildUseCase() {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const userRepository = new FakeUserRepository(clock);
  const passwordHasher = new FakePasswordHasher();
  const sessionRepository = new FakeSessionRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const useCase = new LoginUseCase(
    userRepository,
    passwordHasher,
    sessionRepository,
    tokenGenerator,
    clock,
  );

  const passwordHash = await passwordHasher.hash("correct-password");
  const user = userRepository.seed("STUDENT", {
    email: "user@example.com",
    normalizedEmail: "user@example.com",
    passwordHash,
    emailVerified: true,
  });

  return { useCase, userRepository, sessionRepository, tokenGenerator, clock, user };
}

describe("LoginUseCase", () => {
  it("establishes a session for correct credentials", async () => {
    const { useCase, sessionRepository, tokenGenerator, user } = await buildUseCase();

    const result = await useCase.execute({
      email: "User@Example.com",
      password: "correct-password",
    });

    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });
    expect(sessionRepository.sessions).toHaveLength(1);
    expect(sessionRepository.sessions[0]!.userId).toBe(user.id);
    expect(sessionRepository.sessions[0]!.tokenHash).toBe(tokenGenerator.hash(result.sessionToken));
  });

  it("sets a future session expiry", async () => {
    const { useCase, clock } = await buildUseCase();

    const result = await useCase.execute({
      email: "user@example.com",
      password: "correct-password",
    });

    expect(result.expiresAt.getTime()).toBeGreaterThan(clock.now().getTime());
  });

  it("rejects a wrong password without revealing which field was wrong", async () => {
    const { useCase, sessionRepository } = await buildUseCase();

    await expect(
      useCase.execute({ email: "user@example.com", password: "wrong-password" }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(sessionRepository.sessions).toHaveLength(0);
  });

  it("rejects a nonexistent account with the same generic error as a wrong password", async () => {
    const { useCase } = await buildUseCase();

    await expect(
      useCase.execute({ email: "nobody@example.com", password: "whatever-password" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("still calls the password hasher for a nonexistent account (timing-attack mitigation)", async () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    const userRepository = new FakeUserRepository(clock);
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const realHasher = new FakePasswordHasher();
    let verifyCalls = 0;
    const spyingHasher = {
      hash: (plain: string) => realHasher.hash(plain),
      verify: async (hash: string, plain: string) => {
        verifyCalls += 1;
        return realHasher.verify(hash, plain);
      },
    };
    const useCase = new LoginUseCase(
      userRepository,
      spyingHasher,
      sessionRepository,
      tokenGenerator,
      clock,
    );

    await expect(
      useCase.execute({ email: "nobody@example.com", password: "whatever-password" }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(verifyCalls).toBe(1);
  });
});
