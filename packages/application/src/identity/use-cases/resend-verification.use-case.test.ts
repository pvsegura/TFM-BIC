import { describe, expect, it } from "vitest";

import {
  FakeEmailService,
  FakeEmailVerificationTokenRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { ResendVerificationUseCase } from "./resend-verification.use-case.js";

function build() {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const userRepository = new FakeUserRepository(clock);
  const tokenRepository = new FakeEmailVerificationTokenRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const emailService = new FakeEmailService();
  const useCase = new ResendVerificationUseCase(
    userRepository,
    tokenRepository,
    tokenGenerator,
    emailService,
    clock,
    "https://app.example.com",
  );
  return { useCase, userRepository, tokenRepository, tokenGenerator, emailService, clock };
}

describe("ResendVerificationUseCase", () => {
  it("invalidates the previous token and issues+sends a new one for an unverified user", async () => {
    const { useCase, userRepository, tokenRepository, emailService } = build();
    const user = userRepository.seed("STUDENT", {
      normalizedEmail: "user@example.com",
      email: "user@example.com",
      emailVerified: false,
    });
    const oldToken = await tokenRepository.create({
      userId: user.id,
      tokenHash: "old-hash",
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await useCase.execute({ email: "user@example.com" });

    expect((await tokenRepository.findByTokenHash("old-hash"))?.usedAt).not.toBeNull();
    const usableTokens = tokenRepository.tokens.filter((t) => t.usedAt === null);
    expect(usableTokens).toHaveLength(1);
    expect(usableTokens[0]!.id).not.toBe(oldToken.id);
    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]).toMatchObject({ kind: "verification", to: user.email });
  });

  it("returns a generic response and sends nothing for an already-verified user", async () => {
    const { useCase, userRepository, emailService } = build();
    userRepository.seed("STUDENT", {
      normalizedEmail: "verified@example.com",
      email: "verified@example.com",
      emailVerified: true,
    });

    const result = await useCase.execute({ email: "verified@example.com" });

    expect(emailService.sent).toHaveLength(0);
    expect(result.message).toBeTruthy();
  });

  it("returns the same generic response for a nonexistent account (no enumeration)", async () => {
    const { useCase, emailService } = build();

    const result = await useCase.execute({ email: "nobody@example.com" });

    expect(emailService.sent).toHaveLength(0);
    expect(result.message).toBeTruthy();
  });
});
