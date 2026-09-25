import {
  createDefaultAchievementRegistry,
  createDefaultExerciseTypeRegistry,
} from "@tfm-bic/domain";
import {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
} from "@tfm-bic/application";
import {
  FakeContentRepository,
  FakeEmailService,
  FakeEmailVerificationTokenRepository,
  FakeExerciseAttemptRepository,
  FakeExerciseRepository,
  FakeGamificationRepository,
  FakeLessonProgressRepository,
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeProfileRepository,
  FakeSessionRepository,
  FakeTokenGenerator,
  FakeUserRepository,
  FakePhoneticContentRepository,
  FakeUserPhoneticProgressRepository,
  FakeUserVocabularyRepository,
  FakeVideoDefinitionRepository,
  FakeVideoGenerationJobRepository,
  FakeVocabularyEventPublisher,
  FakeVocabularyRepository,
  FixedClock,
  makeSampleCatalog,
} from "@tfm-bic/application/testing";
import { FakeVideoGenerationService } from "@tfm-bic/data";

import type { AuthDependencies } from "../composition/auth-dependencies.js";
import type { ContentDependencies } from "../composition/content-dependencies.js";
import type { ExerciseDependencies } from "../composition/exercise-dependencies.js";
import type { GamificationDependencies } from "../composition/gamification-dependencies.js";
import type { LessonDependencies } from "../composition/lesson-dependencies.js";
import type { PhoneticsDependencies } from "../composition/phonetics-dependencies.js";
import type { ProfileDependencies } from "../composition/profile-dependencies.js";
import type { VideoDependencies } from "../composition/video-dependencies.js";
import type { VocabularyDependencies } from "../composition/vocabulary-dependencies.js";

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

  const exerciseRepository = new FakeExerciseRepository();
  const vocabularyRepository = new FakeVocabularyRepository();
  const phoneticRepository = new FakePhoneticContentRepository();
  const videoDefinitionRepository = new FakeVideoDefinitionRepository();
  const contentDeps: ContentDependencies = {
    contentRepository,
    exerciseRepository,
    vocabularyRepository,
    phoneticRepository,
    videoDefinitionRepository,
  };

  const lessonProgressRepository = new FakeLessonProgressRepository();
  const lessonDeps: LessonDependencies = {
    lessonProgressRepository,
    clock,
    close: () => Promise.resolve(),
  };

  const exerciseAttemptRepository = new FakeExerciseAttemptRepository();
  const exerciseDeps: ExerciseDependencies = {
    exerciseAttemptRepository,
    clock,
    typeRegistry: createDefaultExerciseTypeRegistry(),
    close: () => Promise.resolve(),
  };

  const gamificationRepository = new FakeGamificationRepository();
  const achievementRegistry = createDefaultAchievementRegistry();
  const gamificationDeps: GamificationDependencies = {
    gamificationRepository,
    achievementRegistry,
    achievementTexts: new AchievementTexts(
      achievementRegistry,
      DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
      DEFAULT_INTERFACE_LOCALE,
    ),
    clock,
    close: () => Promise.resolve(),
  };

  const userVocabularyRepository = new FakeUserVocabularyRepository();
  const vocabularyEvents = new FakeVocabularyEventPublisher();
  const vocabularyDeps: VocabularyDependencies = {
    userVocabularyRepository,
    clock,
    events: vocabularyEvents,
    close: () => Promise.resolve(),
  };

  const userPhoneticProgressRepository = new FakeUserPhoneticProgressRepository();
  const phoneticsDeps: PhoneticsDependencies = {
    userPhoneticProgressRepository,
    clock,
    close: () => Promise.resolve(),
  };

  const videoGenerationJobRepository = new FakeVideoGenerationJobRepository();
  const videoGenerationProvider = new FakeVideoGenerationService();
  const videoDeps: VideoDependencies = {
    videoGenerationJobRepository,
    provider: videoGenerationProvider,
    clock,
    close: () => Promise.resolve(),
  };

  return {
    deps,
    profileDeps,
    contentDeps,
    lessonDeps,
    exerciseDeps,
    gamificationDeps,
    vocabularyDeps,
    phoneticsDeps,
    videoDeps,
    gamificationRepository,
    lessonProgressRepository,
    exerciseAttemptRepository,
    exerciseRepository,
    vocabularyRepository,
    phoneticRepository,
    videoDefinitionRepository,
    userVocabularyRepository,
    vocabularyEvents,
    userPhoneticProgressRepository,
    videoGenerationJobRepository,
    videoGenerationProvider,
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
