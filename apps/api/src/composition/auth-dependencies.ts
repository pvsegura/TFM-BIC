import type {
  EmailService,
  EmailVerificationTokenRepository,
  PasswordHasher,
  PasswordResetTokenRepository,
  SessionRepository,
  TokenGenerator,
  UserRepository,
} from "@tfm-bic/application";
import type { Clock } from "@tfm-bic/application";
import {
  Argon2PasswordHasher,
  createIdentityDb,
  CryptoTokenGenerator,
  DrizzleEmailVerificationTokenRepository,
  DrizzlePasswordResetTokenRepository,
  DrizzleSessionRepository,
  DrizzleUserRepository,
  InMemoryEmailService,
  SystemClock,
} from "@tfm-bic/data";

/**
 * Everything the auth routes need, gathered behind one bag so `server.ts`
 * doesn't hand-wire eight constructor calls, and so tests can substitute
 * fakes (see apps/api/src/routes/auth.route.test.ts) without touching a
 * real database. Composition-root wiring only — no branching logic of its
 * own, so it is excluded from coverage like apps/api/src/index.ts (see
 * vitest.config.ts).
 */
export interface AuthDependencies {
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
  emailVerificationTokenRepository: EmailVerificationTokenRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
  passwordHasher: PasswordHasher;
  tokenGenerator: TokenGenerator;
  emailService: EmailService;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

/**
 * The real, production adapters — Drizzle/Postgres repositories, Argon2id
 * hashing, a CSPRNG token generator. `EmailService` is `InMemoryEmailService`
 * even here: no real provider account is provisioned in M3 (ADR-014), so
 * this is the one adapter available in every environment for now.
 */
export function createAuthDependencies(databaseUrl: string): AuthDependencies {
  const { db, close } = createIdentityDb(databaseUrl);

  return {
    userRepository: new DrizzleUserRepository(db),
    sessionRepository: new DrizzleSessionRepository(db),
    emailVerificationTokenRepository: new DrizzleEmailVerificationTokenRepository(db),
    passwordResetTokenRepository: new DrizzlePasswordResetTokenRepository(db),
    passwordHasher: new Argon2PasswordHasher(),
    tokenGenerator: new CryptoTokenGenerator(),
    emailService: new InMemoryEmailService(),
    clock: new SystemClock(),
    close,
  };
}
