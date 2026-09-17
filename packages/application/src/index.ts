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
