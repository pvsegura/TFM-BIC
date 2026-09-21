import {
  FakeContentRepository,
  FakeEmailService,
  FakeEmailVerificationTokenRepository,
  FakeLessonProgressRepository,
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeProfileRepository,
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FixedClock,
  makeSampleCatalog,
} from "@tfm-bic/application/testing";

import type { AuthDependencies } from "../composition/auth-dependencies.js";
import type { ContentDependencies } from "../composition/content-dependencies.js";
import type { LessonDependencies } from "../composition/lesson-dependencies.js";
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
  const contentRepository = new FakeContentRepository(makeSampleCatalog());

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

  const contentDeps: ContentDependencies = { contentRepository };

  const lessonProgressRepository = new FakeLessonProgressRepository();
  const lessonDeps: LessonDependencies = {
    lessonProgressRepository,
    clock,
    close: () => Promise.resolve(),
  };

  return {
    deps,
    profileDeps,
    contentDeps,
    lessonDeps,
    lessonProgressRepository,
    clock,
    userRepository,
    sessionRepository,
    emailVerificationTokenRepository,
    passwordResetTokenRepository,
    passwordHasher,
    tokenGenerator,
    emailService,
    profileRepository,
    contentRepository,
  };
}
