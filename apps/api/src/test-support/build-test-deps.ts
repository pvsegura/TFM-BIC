import {
  FakeEmailService,
  FakeEmailVerificationTokenRepository,
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeProfileRepository,
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
} from "@tfm-bic/application/testing";

import type { AuthDependencies } from "../composition/auth-dependencies.js";
import type { ProfileDependencies } from "../composition/profile-dependencies.js";

/** Fast, in-memory dependencies for apps/api's own HTTP-layer tests —
 * repository/constraint correctness is already covered by packages/data's
 * PGlite-backed tests; these tests focus on request validation, status
 * codes, cookies, rate limiting and authorization. */
export function buildTestDeps(now = new Date("2026-01-01T00:00:00.000Z")) {
  const clock = new FixedClock(now);
  const userRepository = new FakeUserRepository(clock);
  const sessionRepository = new FakeSessionRepository();
  const emailVerificationTokenRepository = new FakeEmailVerificationTokenRepository();
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenGenerator = new FakeTokenGenerator();
  const emailService = new FakeEmailService();
  const profileRepository = new FakeProfileRepository(clock);

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

  const profileDeps: ProfileDependencies = {
    profileRepository,
    close: () => Promise.resolve(),
  };

  return {
    deps,
    profileDeps,
    clock,
    userRepository,
    sessionRepository,
    emailVerificationTokenRepository,
    passwordResetTokenRepository,
    passwordHasher,
    tokenGenerator,
    emailService,
    profileRepository,
  };
}
