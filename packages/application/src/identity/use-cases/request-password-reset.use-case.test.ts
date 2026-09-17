import { describe, expect, it } from "vitest";

import {
  FakeEmailService,
  FakePasswordResetTokenRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { RequestPasswordResetUseCase } from "./request-password-reset.use-case.js";

function build() {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const userRepository = new FakeUserRepository(clock);
  const tokenRepository = new FakePasswordResetTokenRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const emailService = new FakeEmailService();
  const useCase = new RequestPasswordResetUseCase(
    userRepository,
    tokenRepository,
    tokenGenerator,
    emailService,
    clock,
    "https://app.example.com",
  );
  return { useCase, userRepository, tokenRepository, emailService };
}

describe("RequestPasswordResetUseCase", () => {
  it("issues and emails a reset token for an existing account", async () => {
    const { useCase, userRepository, tokenRepository, emailService } = build();
    const user = userRepository.seed("STUDENT", {
      normalizedEmail: "user@example.com",
      email: "user@example.com",
    });

    await useCase.execute({ email: "User@Example.com" });

    expect(tokenRepository.tokens).toHaveLength(1);
    expect(tokenRepository.tokens[0]!.userId).toBe(user.id);
    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]).toMatchObject({ kind: "password-reset", to: user.email });
  });

  it("works for an unverified account too (reset is not gated on verification)", async () => {
    const { useCase, userRepository, tokenRepository } = build();
    userRepository.seed("STUDENT", {
      normalizedEmail: "unverified@example.com",
      email: "unverified@example.com",
      emailVerified: false,
    });

    await useCase.execute({ email: "unverified@example.com" });

    expect(tokenRepository.tokens).toHaveLength(1);
  });

  it("invalidates a previous outstanding reset token before issuing a new one", async () => {
    const { useCase, userRepository, tokenRepository } = build();
    const user = userRepository.seed("STUDENT", {
      normalizedEmail: "user@example.com",
      email: "user@example.com",
    });
    const first = await tokenRepository.create({
      userId: user.id,
      tokenHash: "old-hash",
      expiresAt: new Date("2026-01-01T01:00:00.000Z"),
    });

    await useCase.execute({ email: "user@example.com" });

    expect((await tokenRepository.findByTokenHash(first.tokenHash))?.usedAt).not.toBeNull();
  });

  it("returns the same generic response for a nonexistent account and sends nothing (no enumeration)", async () => {
    const { useCase, emailService } = build();

    const result = await useCase.execute({ email: "nobody@example.com" });

    expect(emailService.sent).toHaveLength(0);
    expect(result.message).toBeTruthy();
  });
});
