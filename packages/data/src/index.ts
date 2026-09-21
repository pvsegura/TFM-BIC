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
