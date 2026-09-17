import { describe, expect, it } from "vitest";

import { FakeSessionRepository, FakeTokenGenerator } from "../test-support/fakes.js";
import { LogoutUseCase } from "./logout.use-case.js";

describe("LogoutUseCase", () => {
  it("revokes the session matching the given raw token", async () => {
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new LogoutUseCase(sessionRepository, tokenGenerator);
    const rawToken = "raw-session-token";
    await sessionRepository.create({
      userId: "user-1",
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2099-01-01"),
    });

    await useCase.execute({ sessionToken: rawToken });

    expect(sessionRepository.sessions).toHaveLength(0);
  });

  it("does not throw when called with a token that matches no session", async () => {
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new LogoutUseCase(sessionRepository, tokenGenerator);

    await expect(useCase.execute({ sessionToken: "never-issued-token" })).resolves.not.toThrow();
  });

  it("prevents the same token from being usable again after logout", async () => {
    const sessionRepository = new FakeSessionRepository();
    const tokenGenerator = new FakeTokenGenerator();
    const useCase = new LogoutUseCase(sessionRepository, tokenGenerator);
    const rawToken = "raw-session-token";
    await sessionRepository.create({
      userId: "user-1",
      tokenHash: tokenGenerator.hash(rawToken),
      expiresAt: new Date("2099-01-01"),
    });

    await useCase.execute({ sessionToken: rawToken });

    expect(await sessionRepository.findByTokenHash(tokenGenerator.hash(rawToken))).toBeNull();
  });
});
