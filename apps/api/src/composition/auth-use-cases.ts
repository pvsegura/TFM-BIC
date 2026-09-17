import {
  ConfirmPasswordResetUseCase,
  LoginUseCase,
  LogoutUseCase,
  RegisterUserUseCase,
  RequestPasswordResetUseCase,
  ResendVerificationUseCase,
  ResolveSessionUseCase,
  VerifyEmailUseCase,
} from "@tfm-bic/application";

import type { AuthDependencies } from "./auth-dependencies.js";

export interface AuthUseCases {
  register: RegisterUserUseCase;
  login: LoginUseCase;
  logout: LogoutUseCase;
  resolveSession: ResolveSessionUseCase;
  verifyEmail: VerifyEmailUseCase;
  resendVerification: ResendVerificationUseCase;
  requestPasswordReset: RequestPasswordResetUseCase;
  confirmPasswordReset: ConfirmPasswordResetUseCase;
}

/** Composition-root wiring only — see auth-dependencies.ts. */
export function createAuthUseCases(deps: AuthDependencies, appBaseUrl: string): AuthUseCases {
  return {
    register: new RegisterUserUseCase(
      deps.userRepository,
      deps.passwordHasher,
      deps.tokenGenerator,
      deps.emailVerificationTokenRepository,
      deps.emailService,
      deps.clock,
      appBaseUrl,
    ),
    login: new LoginUseCase(
      deps.userRepository,
      deps.passwordHasher,
      deps.sessionRepository,
      deps.tokenGenerator,
      deps.clock,
    ),
    logout: new LogoutUseCase(deps.sessionRepository, deps.tokenGenerator),
    resolveSession: new ResolveSessionUseCase(
      deps.sessionRepository,
      deps.userRepository,
      deps.tokenGenerator,
      deps.clock,
    ),
    verifyEmail: new VerifyEmailUseCase(
      deps.emailVerificationTokenRepository,
      deps.userRepository,
      deps.tokenGenerator,
      deps.clock,
    ),
    resendVerification: new ResendVerificationUseCase(
      deps.userRepository,
      deps.emailVerificationTokenRepository,
      deps.tokenGenerator,
      deps.emailService,
      deps.clock,
      appBaseUrl,
    ),
    requestPasswordReset: new RequestPasswordResetUseCase(
      deps.userRepository,
      deps.passwordResetTokenRepository,
      deps.tokenGenerator,
      deps.emailService,
      deps.clock,
      appBaseUrl,
    ),
    confirmPasswordReset: new ConfirmPasswordResetUseCase(
      deps.passwordResetTokenRepository,
      deps.userRepository,
      deps.passwordHasher,
      deps.sessionRepository,
      deps.tokenGenerator,
      deps.clock,
    ),
  };
}
