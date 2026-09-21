export type { Clock } from "./ports/clock.js";
export {
  GetHealthStatusUseCase,
  type GetHealthStatusInput,
  type GetHealthStatusResult,
} from "./health/get-health-status.use-case.js";

// Identity & Authentication (M3) ports — implemented in packages/data.
export type { CreateUserInput, UserRepository } from "./identity/ports/user-repository.js";
export type { CreateSessionInput, SessionRepository } from "./identity/ports/session-repository.js";
export type { PasswordHasher } from "./identity/ports/password-hasher.js";
export type { TokenGenerator } from "./identity/ports/token-generator.js";
export type {
  CreateEmailVerificationTokenInput,
  EmailVerificationTokenRepository,
} from "./identity/ports/email-verification-token-repository.js";
export type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from "./identity/ports/password-reset-token-repository.js";
export type { EmailService } from "./identity/ports/email-service.js";

// Identity & Authentication (M3) use cases.
export {
  RegisterUserUseCase,
  type RegisterUserInput,
  type RegisterUserResult,
} from "./identity/use-cases/register-user.use-case.js";
export {
  LoginUseCase,
  type LoginInput,
  type LoginResult,
} from "./identity/use-cases/login.use-case.js";
export { LogoutUseCase, type LogoutInput } from "./identity/use-cases/logout.use-case.js";
export {
  ResolveSessionUseCase,
  type ResolveSessionInput,
} from "./identity/use-cases/resolve-session.use-case.js";
export {
  VerifyEmailUseCase,
  type VerifyEmailInput,
} from "./identity/use-cases/verify-email.use-case.js";
export {
  ResendVerificationUseCase,
  type ResendVerificationInput,
  type ResendVerificationResult,
} from "./identity/use-cases/resend-verification.use-case.js";
export {
  RequestPasswordResetUseCase,
  type RequestPasswordResetInput,
  type RequestPasswordResetResult,
} from "./identity/use-cases/request-password-reset.use-case.js";
export {
  ConfirmPasswordResetUseCase,
  type ConfirmPasswordResetInput,
} from "./identity/use-cases/confirm-password-reset.use-case.js";

// Languages & Content (M5) port — implemented in packages/data — and use cases.
export type { ContentRepository } from "./content/ports/content-repository.js";
export { ListLanguagesUseCase } from "./content/use-cases/list-languages.use-case.js";
export {
  ListLanguageLevelsUseCase,
  type LanguageLevelView,
  type ListLanguageLevelsInput,
  type ListLanguageLevelsResult,
} from "./content/use-cases/list-language-levels.use-case.js";
export {
  ListContentUseCase,
  type ContentSummary,
  type ListContentInput,
} from "./content/use-cases/list-content.use-case.js";
export {
  GetContentUseCase,
  type GetContentInput,
} from "./content/use-cases/get-content.use-case.js";

// Lessons (M6) port — implemented in packages/data — and use cases. Lesson content comes
// from the content port above; only the student's progress has its own port.
export type { LessonProgressRepository } from "./lesson/ports/lesson-progress-repository.js";
export { toProgressView, type LessonProgressView } from "./lesson/progress-view.js";
export {
  ListLessonsUseCase,
  type LessonSummary,
  type ListLessonsInput,
} from "./lesson/use-cases/list-lessons.use-case.js";
export {
  GetLessonUseCase,
  type GetLessonInput,
  type LessonDetail,
} from "./lesson/use-cases/get-lesson.use-case.js";
export {
  StartLessonUseCase,
  type StartLessonInput,
} from "./lesson/use-cases/start-lesson.use-case.js";
export {
  CompleteLessonUseCase,
  type CompleteLessonInput,
} from "./lesson/use-cases/complete-lesson.use-case.js";

// Student Profile (M4) port — implemented in packages/data.
export type { ProfilePatch, ProfileRepository } from "./profile/ports/profile-repository.js";

// Student Profile (M4) use cases.
export {
  GetCurrentStudentProfileUseCase,
  type GetCurrentStudentProfileInput,
} from "./profile/use-cases/get-current-student-profile.use-case.js";
export {
  UpdateCurrentStudentProfileUseCase,
  type UpdateCurrentStudentProfileInput,
} from "./profile/use-cases/update-current-student-profile.use-case.js";
