import {
  InvalidCredentialsError,
  normalizeEmail,
  toSafeUser,
  type SafeUser,
} from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { SessionRepository } from "../ports/session-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: SafeUser;
  sessionToken: string;
  expiresAt: Date;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Never a real hash — verifying against it is guaranteed to fail, and
 * exists only so a nonexistent account takes roughly the same time as a
 * wrong password (timing-attack / account-enumeration mitigation). */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.userRepository.findByNormalizedEmail(normalizedEmail);

    const isPasswordValid = await this.passwordHasher.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );

    if (!user || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const rawToken = this.tokenGenerator.generate();
    const tokenHash = this.tokenGenerator.hash(rawToken);
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS);
    await this.sessionRepository.create({ userId: user.id, tokenHash, expiresAt });

    return { user: toSafeUser(user), sessionToken: rawToken, expiresAt };
  }
}
