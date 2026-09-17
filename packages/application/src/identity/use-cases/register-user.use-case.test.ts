import { InvalidEmailError, WeakPasswordError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakeEmailService,
  FakeEmailVerificationTokenRepository,
  FakePasswordHasher,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { RegisterUserUseCase } from "./register-user.use-case.js";

function buildUseCase() {
  const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const userRepository = new FakeUserRepository(clock);
  const passwordHasher = new FakePasswordHasher();
  const tokenGenerator = new FakeTokenGenerator();
  const verificationTokenRepository = new FakeEmailVerificationTokenRepository();
  const emailService = new FakeEmailService();
  const useCase = new RegisterUserUseCase(
    userRepository,
    passwordHasher,
    tokenGenerator,
    verificationTokenRepository,
    emailService,
    clock,
    "https://app.example.com",
  );
  return {
    useCase,
    userRepository,
    passwordHasher,
    tokenGenerator,
    verificationTokenRepository,
    emailService,
    clock,
  };
}

describe("RegisterUserUseCase", () => {
  it("creates an unverified STUDENT user with a hashed password", async () => {
    const { useCase, userRepository } = buildUseCase();

    await useCase.execute({ email: "New.User@Example.com", password: "a-good-password" });

    expect(userRepository.users).toHaveLength(1);
    const user = userRepository.users[0]!;
    expect(user.normalizedEmail).toBe("new.user@example.com");
    expect(user.email).toBe("New.User@Example.com");
    expect(user.role).toBe("STUDENT");
    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).not.toBe("a-good-password");
  });

  it("ignores any client-supplied role — always registers as STUDENT", async () => {
    const { useCase, userRepository } = buildUseCase();

    await useCase.execute({
      email: "wannabe-teacher@example.com",
      password: "a-good-password",
      // @ts-expect-error -- role is intentionally not part of the input type.
      role: "TEACHER",
    });

    expect(userRepository.users[0]!.role).toBe("STUDENT");
  });

  it("creates a single-use email verification token and sends it", async () => {
    const { useCase, verificationTokenRepository, emailService, tokenGenerator, userRepository } =
      buildUseCase();
    tokenGenerator.enqueue("the-raw-verification-token");

    await useCase.execute({ email: "user@example.com", password: "a-good-password" });

    const user = userRepository.users[0]!;
    expect(verificationTokenRepository.tokens).toHaveLength(1);
    expect(verificationTokenRepository.tokens[0]!.userId).toBe(user.id);
    expect(verificationTokenRepository.tokens[0]!.tokenHash).toBe(
      tokenGenerator.hash("the-raw-verification-token"),
    );
    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]).toMatchObject({ kind: "verification", to: user.email });
    expect(emailService.sent[0]!.url).toContain("the-raw-verification-token");
  });

  it("returns the same generic response for a brand-new registration", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      email: "user@example.com",
      password: "a-good-password",
    });

    expect(result.message).toMatch(/verification/i);
  });

  it("does not create a second user for a duplicate registration, but returns the same response", async () => {
    const { useCase, userRepository, emailService } = buildUseCase();

    const first = await useCase.execute({
      email: "dup@example.com",
      password: "a-good-password",
    });
    const second = await useCase.execute({
      email: "DUP@Example.com ",
      password: "another-password",
    });

    expect(userRepository.users).toHaveLength(1);
    expect(second.message).toBe(first.message);
    // Only the first (genuinely new) registration sends a verification email —
    // the duplicate is a silent no-op, not a second email to the same address.
    expect(emailService.sent).toHaveLength(1);
  });

  it("rejects an invalid email before touching the repository", async () => {
    const { useCase, userRepository } = buildUseCase();

    await expect(
      useCase.execute({ email: "not-an-email", password: "a-good-password" }),
    ).rejects.toThrow(InvalidEmailError);
    expect(userRepository.users).toHaveLength(0);
  });

  it("rejects a password that fails the policy before touching the repository", async () => {
    const { useCase, userRepository } = buildUseCase();

    await expect(useCase.execute({ email: "user@example.com", password: "short" })).rejects.toThrow(
      WeakPasswordError,
    );
    expect(userRepository.users).toHaveLength(0);
  });
});
