import {
  FakeEmailService,
  FakeEmailVerificationTokenRepository,
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "@tfm-bic/application/testing";

import type { AuthDependencies } from "../composition/auth-dependencies.js";

/** Fast, in-memory `AuthDependencies` for apps/api's own HTTP-layer tests
 * — repository/constraint correctness is already covered by
 * packages/data's PGlite-backed tests; these tests focus on request
 * validation, status codes, cookies, and rate limiting. */
export function buildTestDeps(now = new Date("2026-01-01T00:00:00.000Z")) {
  const clock = new FixedClock(now);
  const userRepository = new FakeUserRepository(clock);
  const sessionRepository = new FakeSessionRepository();
  const emailVerificationTokenRepository = new FakeEmailVerificationTokenRepository();
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenGenerator = new FakeTokenGenerator();
  const emailService = new FakeEmailService();

  const deps: AuthDependencies = {
    userRepository,
    sessionRepository,
    emailVerificationTokenRepository,
    passwordResetTokenRepository,
    passwordHasher,
    tokenGenerator,
    emailService,
    clock,
    close: () => Promise.resolve(),
  };

  return {
    deps,
    clock,
    userRepository,
    sessionRepository,
    emailVerificationTokenRepository,
    passwordResetTokenRepository,
    passwordHasher,
    tokenGenerator,
    emailService,
  };
}
