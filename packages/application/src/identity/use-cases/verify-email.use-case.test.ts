import { InvalidTokenError, TokenAlreadyUsedError, TokenExpiredError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakeEmailVerificationTokenRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { VerifyEmailUseCase } from "./verify-email.use-case.js";

function build(now = "2026-01-01T00:00:00.000Z") {
  const clock = new FixedClock(new Date(now));
  const userRepository = new FakeUserRepository(clock);
  const tokenRepository = new FakeEmailVerificationTokenRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const useCase = new VerifyEmailUseCase(tokenRepository, userRepository, tokenGenerator, clock);
  return { useCase, userRepository, tokenRepository, tokenGenerator, clock };
}

describe("VerifyEmailUseCase", () => {
  it("marks the user's email verified and the token used", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator } = build();
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-verification-token";
    const token = await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await useCase.execute({ token: rawToken });

    expect((await userRepository.findById(user.id))?.emailVerified).toBe(true);
    expect((await tokenRepository.findByTokenHash(token.tokenHash))?.usedAt).not.toBeNull();
  });

  it("rejects a token that matches no record", async () => {
    const { useCase } = build();

    await expect(useCase.execute({ token: "never-issued" })).rejects.toThrow(InvalidTokenError);
  });

  it("rejects an expired token", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator } = build(
      "2026-01-03T00:00:00.000Z",
    );
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-verification-token";
    await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await expect(useCase.execute({ token: rawToken })).rejects.toThrow(TokenExpiredError);
  });

  it("rejects a token that was already used", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator } = build();
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-verification-token";
    await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await useCase.execute({ token: rawToken });

    await expect(useCase.execute({ token: rawToken })).rejects.toThrow(TokenAlreadyUsedError);
  });
});
