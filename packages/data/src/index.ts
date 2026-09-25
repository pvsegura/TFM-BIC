export { SystemClock } from "./clock/system-clock.js";

// Identity & Authentication (M3) — see docs/adr/adr-005/006/014.
export { createIdentityDb, type IdentityDb, type IdentityDbHandle } from "./identity/db/client.js";
export { Argon2PasswordHasher } from "./identity/argon2-password-hasher.js";
export { CryptoTokenGenerator } from "./identity/crypto-token-generator.js";
export { InMemoryEmailService, type SentEmail } from "./identity/in-memory-email.service.js";
export { DrizzleUserRepository } from "./identity/user.repository.js";
export { DrizzleSessionRepository } from "./identity/session.repository.js";
export { DrizzleEmailVerificationTokenRepository } from "./identity/email-verification-token.repository.js";
export { DrizzlePasswordResetTokenRepository } from "./identity/password-reset-token.repository.js";

// Languages & Content (M5) — see docs/adr/adr-018-content-languages.md.
export { DEFAULT_CONTENT_ROOT } from "./content/content-root.js";
export { CatalogContentRepository } from "./content/catalog-content-repository.js";
export { FileSystemContentRepository } from "./content/file-system-content-repository.js";
export { formatContentReport, type ContentReport } from "./content/content-report.js";
export { ContentValidationError, type ContentIssue } from "./content/content-validation.error.js";
export { loadContentCatalog, type LoadContentResult } from "./content/load-content-catalog.js";

// Student Profile (M4).
export { createProfileDb, type ProfileDb, type ProfileDbHandle } from "./profile/db/client.js";
export { DrizzleProfileRepository } from "./profile/profile.repository.js";

// Lessons (M6) — lesson progress only; lesson content is the M5 files.
export { createLessonsDb, type LessonsDb, type LessonsDbHandle } from "./lessons/db/client.js";
export { DrizzleLessonProgressRepository } from "./lessons/lesson-progress.repository.js";

// Exercises (M7) — exercises are content, so they are read from the same validated tree; only the
// student's attempts are stored in PostgreSQL (added with the exercise attempts context).
export { CatalogExerciseRepository } from "./content/catalog-exercise-repository.js";
export {
  createExercisesDb,
  type ExercisesDb,
  type ExercisesDbHandle,
} from "./exercises/db/client.js";
export { DrizzleExerciseAttemptRepository } from "./exercises/exercise-attempt.repository.js";
export {
  loadContentRepositories,
  type ContentRepositories,
} from "./content/load-content-repositories.js";

// Gamification (M8) — the points ledger and unlocked achievements. Achievements themselves are
// domain rules (code), so only what a student earned is stored. See docs/adr/adr-021-gamification.md.
export {
  createGamificationDb,
  type GamificationDb,
  type GamificationDbHandle,
} from "./gamification/db/client.js";
export { DrizzleGamificationRepository } from "./gamification/gamification.repository.js";

// Vocabulary (M9) — a student's relationship to a vocabulary entry. Entry content is read from
// the same validated tree as lessons and exercises. See docs/adr/adr-022-vocabulary.md.
export { CatalogVocabularyRepository } from "./content/catalog-vocabulary-repository.js";
export {
  createVocabularyDb,
  type VocabularyDb,
  type VocabularyDbHandle,
} from "./vocabulary/db/client.js";
export { DrizzleUserVocabularyRepository } from "./vocabulary/user-vocabulary.repository.js";
export { NoopVocabularyEventPublisher } from "./vocabulary/no-op-vocabulary-event-publisher.js";

// Phonetics (M10) — a student's progress on a phonetic representation. Representation content is
// read from the same validated tree as lessons, exercises and vocabulary.
export { CatalogPhoneticRepository } from "./content/catalog-phonetic-repository.js";
export {
  createPhoneticsDb,
  type PhoneticsDb,
  type PhoneticsDbHandle,
} from "./phonetics/db/client.js";
export { DrizzleUserPhoneticProgressRepository } from "./phonetics/user-phonetic-progress.repository.js";

// Video (M11) — a generation job's lifecycle. Video definition content is read from the same
// validated tree as lessons, exercises, vocabulary and phonetics. The provider boundary
// (ADR-011/012): `FakeVideoGenerationService` is the only adapter selected by default and in
// tests/CI; `HyperframesCliProvider` is real but implemented-and-unverified (BLOCKED/PENDING — see
// content/video-scripts/README.md), selected only via VIDEO_GENERATION_PROVIDER=hyperframes.
export { CatalogVideoDefinitionRepository } from "./content/catalog-video-definition-repository.js";
export { createVideoDb, type VideoDb, type VideoDbHandle } from "./video/db/client.js";
export { DrizzleVideoGenerationJobRepository } from "./video/video-generation-job.repository.js";
export {
  FAKE_VIDEO_GENERATION_SCENARIOS,
  FakeVideoGenerationService,
  type FakeVideoGenerationScenario,
} from "./video/fake-video-generation.service.js";
export {
  HyperframesCliProvider,
  type HyperframesCliProviderOptions,
} from "./video/hyperframes-cli.provider.js";
export {
  realCliRunner,
  type CliRunner,
  type CliRunResult,
} from "./video/hyperframes-cli-runner.js";

// Audio generation (M12, ADR-013): `FakeAudioGenerationService` is the adapter selected by default
// and in every automated test/CI run; `GeminiAudioProvider` is selected only via
// AUDIO_GENERATION_PROVIDER=gemini. `InMemoryAudioCache` is a bounded, non-durable cache — not storage.
export {
  FAKE_AUDIO_GENERATION_SCENARIOS,
  FakeAudioGenerationService,
  type FakeAudioGenerationScenario,
} from "./audio/fake-audio-generation.service.js";
export {
  buildGeminiSpeechRequestBody,
  DEFAULT_GEMINI_VOICE,
  GEMINI_INTERACTIONS_URL,
  GeminiAudioProvider,
  speechStyleFor,
  type GeminiAudioProviderOptions,
} from "./audio/gemini-audio.provider.js";
export {
  InMemoryAudioCache,
  type InMemoryAudioCacheOptions,
} from "./audio/in-memory-audio-cache.js";
export { encodeWavPcm16, isWav } from "./audio/wav.js";
