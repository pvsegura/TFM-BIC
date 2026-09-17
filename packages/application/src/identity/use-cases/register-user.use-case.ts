import { createEmail, createPassword, DuplicateEmailError } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { EmailVerificationTokenRepository } from "../ports/email-verification-token-repository.js";
import type { EmailService } from "../ports/email-service.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserResult {
  message: string;
}

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Same response text whether the email was new or already registered —
 * see ADR-006's account-enumeration-resistance rationale. */
const GENERIC_REGISTRATION_MESSAGE =
  "If this email address can be registered, we've sent a verification link to it.";

/**
 * Registration always creates a STUDENT — the input type has no `role`
 * field at all, so there is nothing for a route to accidentally forward
 * from client input (self-assigned-privileged-role prevention, see
 * docs/security/security-baseline.md).
 */
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator,
    private readonly verificationTokenRepository: EmailVerificationTokenRepository,
    private readonly emailService: EmailService,
    private readonly clock: Clock,
    private readonly appBaseUrl: string,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    const trimmedEmail = input.email.trim();
    const normalizedEmail = createEmail(input.email);
    const password = createPassword(input.password);
    const passwordHash = await this.passwordHasher.hash(password);

    try {
      const user = await this.userRepository.create({
        email: trimmedEmail,
        normalizedEmail,
        passwordHash,
        role: "STUDENT",
      });

      const rawToken = this.tokenGenerator.generate();
      const tokenHash = this.tokenGenerator.hash(rawToken);
      const expiresAt = new Date(this.clock.now().getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
      await this.verificationTokenRepository.create({ userId: user.id, tokenHash, expiresAt });

      await this.emailService.sendVerificationEmail({
        to: user.email,
        verificationUrl: `${this.appBaseUrl}/verify-email?token=${rawToken}`,
      });
    } catch (error) {
      if (!(error instanceof DuplicateEmailError)) {
        throw error;
      }
      // Email already registered: silent no-op, same response as success.
    }

    return { message: GENERIC_REGISTRATION_MESSAGE };
  }
}
