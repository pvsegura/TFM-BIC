import type {
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
  SystemClock,
  type IdentityDb,
} from "@tfm-bic/data";

/**
 * Everything the auth routes need, gathered behind one bag so `server.ts`
 * doesn't hand-wire eight constructor calls, and so tests can substitute
 * fakes (see apps/api/src/routes/auth.route.test.ts) without touching a
 * real database. Composition-root wiring only — no branching logic of its
 * own, so it is excluded from coverage like apps/api/src/index.ts (see
 * vitest.config.ts).
 *
 * Email is not here since M14: the identity `EmailService` is built from the email composition
 * (email-dependencies.ts / email-use-cases.ts) and handed to `createAuthUseCases`.
 */
export interface AuthDependencies {
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
  emailVerificationTokenRepository: EmailVerificationTokenRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
  passwordHasher: PasswordHasher;
  tokenGenerator: TokenGenerator;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

/**
 * The real adapters over a given database handle — Drizzle/Postgres
 * repositories, Argon2id hashing, a CSPRNG token generator. Shared by the
 * real and the `NODE_ENV=test` (PGlite) compositions so they cannot drift
 * apart.
 */
export function buildAuthDependencies(
  db: IdentityDb,
  close: () => Promise<void>,
): AuthDependencies {
  return {
    userRepository: new DrizzleUserRepository(db),
    sessionRepository: new DrizzleSessionRepository(db),
    emailVerificationTokenRepository: new DrizzleEmailVerificationTokenRepository(db),
    passwordResetTokenRepository: new DrizzlePasswordResetTokenRepository(db),
    passwordHasher: new Argon2PasswordHasher(),
    tokenGenerator: new CryptoTokenGenerator(),
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapters over a live Postgres `DATABASE_URL`. */
export function createAuthDependencies(databaseUrl: string): AuthDependencies {
  const { db, close } = createIdentityDb(databaseUrl);
  return buildAuthDependencies(db, close);
}
