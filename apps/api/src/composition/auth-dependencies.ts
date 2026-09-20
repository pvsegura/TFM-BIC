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
  type IdentityDb,
} from "@tfm-bic/data";

/** What the NODE_ENV=test diagnostic route needs — deliberately a narrow
 * structural type, not the concrete `InMemoryEmailService` class, so fakes
 * (e.g. apps/api/src/test-support/build-test-deps.ts) can satisfy it too
 * without importing packages/data. */
export interface EmailInbox {
  findLastSentTo(to: string): { kind: string; to: string; url: string } | undefined;
}

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
  /** Same object as `emailService` — used only by the NODE_ENV=test
   * diagnostic route (routes/test-email.route.ts) so E2E tests can
   * retrieve a verification/reset link without a real inbox. Never used by
   * application code, which only ever sees the `EmailService` port.
   * Optional: fakes used by apps/api's own HTTP-layer tests don't need to
   * provide one, since those tests never hit the diagnostic route. */
  emailInbox?: EmailInbox;
  clock: Clock;
  /** Release any held resources (e.g. the Postgres connection pool). */
  close: () => Promise<void>;
}

/**
 * The real adapters over a given database handle — Drizzle/Postgres
 * repositories, Argon2id hashing, a CSPRNG token generator. `EmailService` is
 * `InMemoryEmailService` even here: no real provider account is provisioned
 * in M3 (ADR-014), so this is the one adapter available in every environment
 * for now. Shared by the real and the `NODE_ENV=test` (PGlite) compositions
 * so they cannot drift apart.
 */
export function buildAuthDependencies(
  db: IdentityDb,
  close: () => Promise<void>,
): AuthDependencies {
  const emailService = new InMemoryEmailService();

  return {
    userRepository: new DrizzleUserRepository(db),
    sessionRepository: new DrizzleSessionRepository(db),
    emailVerificationTokenRepository: new DrizzleEmailVerificationTokenRepository(db),
    passwordResetTokenRepository: new DrizzlePasswordResetTokenRepository(db),
    passwordHasher: new Argon2PasswordHasher(),
    tokenGenerator: new CryptoTokenGenerator(),
    emailService,
    emailInbox: emailService,
    clock: new SystemClock(),
    close,
  };
}

/** The real, production adapters over a live Postgres `DATABASE_URL`. */
export function createAuthDependencies(databaseUrl: string): AuthDependencies {
  const { db, close } = createIdentityDb(databaseUrl);
  return buildAuthDependencies(db, close);
}
