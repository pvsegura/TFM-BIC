import {
  InvalidTokenError,
  TokenAlreadyUsedError,
  TokenExpiredError,
  WeakPasswordError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "../test-support/fakes.js";
import { ConfirmPasswordResetUseCase } from "./confirm-password-reset.use-case.js";

function build(now = "2026-01-01T00:00:00.000Z") {
  const clock = new FixedClock(new Date(now));
  const userRepository = new FakeUserRepository(clock);
  const tokenRepository = new FakePasswordResetTokenRepository();
  const tokenGenerator = new FakeTokenGenerator();
  const passwordHasher = new FakePasswordHasher();
  const sessionRepository = new FakeSessionRepository();
  const useCase = new ConfirmPasswordResetUseCase(
    tokenRepository,
    userRepository,
    passwordHasher,
    sessionRepository,
    tokenGenerator,
    clock,
  );
  return {
    useCase,
    userRepository,
    tokenRepository,
    tokenGenerator,
    passwordHasher,
    sessionRepository,
  };
}

describe("ConfirmPasswordResetUseCase", () => {
  it("updates the password, consumes the token, and revokes existing sessions", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator, sessionRepository } = build();
    const user = userRepository.seed("STUDENT", { passwordHash: "old-hash" });
    await sessionRepository.create({
      userId: user.id,
      tokenHash: "some-session-hash",
      expiresAt: new Date("2099-01-01"),
    });
    const rawToken = "raw-reset-token";
    const token = await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-01T01:00:00.000Z"),
    });

    await useCase.execute({ token: rawToken, newPassword: "a-new-good-password" });

    const updated = await userRepository.findById(user.id);
    expect(updated?.passwordHash).not.toBe("old-hash");
    expect((await tokenRepository.findByTokenHash(token.tokenHash))?.usedAt).not.toBeNull();
    expect(sessionRepository.sessions).toHaveLength(0);
  });

  it("rejects a token that matches no record", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ token: "never-issued", newPassword: "a-new-good-password" }),
    ).rejects.toThrow(InvalidTokenError);
  });

  it("rejects an expired token", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator } = build(
      "2026-01-03T00:00:00.000Z",
    );
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-reset-token";
    await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await expect(
      useCase.execute({ token: rawToken, newPassword: "a-new-good-password" }),
    ).rejects.toThrow(TokenExpiredError);
  });

  it("rejects a token that was already used", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator } = build();
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-reset-token";
    await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await useCase.execute({ token: rawToken, newPassword: "a-new-good-password" });

    await expect(
      useCase.execute({ token: rawToken, newPassword: "yet-another-password" }),
    ).rejects.toThrow(TokenAlreadyUsedError);
  });

  it("rejects a weak new password without consuming the token", async () => {
    const { useCase, userRepository, tokenRepository, tokenGenerator } = build();
    const user = userRepository.seed("STUDENT");
    const rawToken = "raw-reset-token";
    const token = await tokenRepository.create({
      userId: user.id,
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await expect(useCase.execute({ token: rawToken, newPassword: "short" })).rejects.toThrow(
      WeakPasswordError,
    );
    expect((await tokenRepository.findByTokenHash(token.tokenHash))?.usedAt).toBeNull();
  });

  describe("single use under concurrency and failure (M16, S-05)", () => {
    async function issue(built: ReturnType<typeof build>) {
      const user = built.userRepository.seed("STUDENT", { passwordHash: "old-hash" });
      await built.tokenRepository.create({
        userId: user.id,
        tokenHash: built.tokenGenerator.hash("raw-reset-token"),
        expiresAt: new Date("2026-01-01T01:00:00.000Z"),
      });
      return user;
    }

    it("lets only one of two simultaneous resets with the same token set a password", async () => {
      const built = build();
      const user = await issue(built);

      const results = await Promise.allSettled([
        built.useCase.execute({ token: "raw-reset-token", newPassword: "first-new-password" }),
        built.useCase.execute({ token: "raw-reset-token", newPassword: "second-new-password" }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toBeInstanceOf(TokenAlreadyUsedError);
      const stored = (await built.userRepository.findById(user.id))?.passwordHash;
      const winner =
        results[0].status === "fulfilled" ? "first-new-password" : "second-new-password";
      expect(await built.passwordHasher.verify(stored ?? "", winner)).toBe(true);
    });

    it("consumes the token before changing anything, so a failure part-way cannot be replayed", async () => {
      const built = build();
      await issue(built);
      const original = built.userRepository.updatePasswordHash.bind(built.userRepository);
      let failNext = true;
      built.userRepository.updatePasswordHash = (userId: string, hash: string) => {
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error("database unavailable"));
        }
        return original(userId, hash);
      };

      await expect(
        built.useCase.execute({ token: "raw-reset-token", newPassword: "first-new-password" }),
      ).rejects.toThrow("database unavailable");

      await expect(
        built.useCase.execute({ token: "raw-reset-token", newPassword: "second-new-password" }),
      ).rejects.toThrow(TokenAlreadyUsedError);
    });
  });
});
