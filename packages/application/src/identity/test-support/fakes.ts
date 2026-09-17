import {
  DuplicateEmailError,
  type EmailVerificationToken,
  type PasswordResetToken,
  type Role,
  type Session,
  type User,
} from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type {
  CreateEmailVerificationTokenInput,
  EmailVerificationTokenRepository,
} from "../ports/email-verification-token-repository.js";
import type { EmailService } from "../ports/email-service.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from "../ports/password-reset-token-repository.js";
import type { CreateSessionInput, SessionRepository } from "../ports/session-repository.js";
import type { TokenGenerator } from "../ports/token-generator.js";
import type { CreateUserInput, UserRepository } from "../ports/user-repository.js";

/** In-memory, deterministic test doubles for the Identity ports — used by
 * every use-case test in this module so application-layer tests need no
 * real I/O (see .claude/skills/testing). Not exported from the package's
 * public index; test-only. */

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export class FakeUserRepository implements UserRepository {
  readonly users: User[] = [];
  constructor(private readonly clock: Clock) {}

  create(input: CreateUserInput): Promise<User> {
    if (this.users.some((u) => u.normalizedEmail === input.normalizedEmail)) {
      return Promise.reject(new DuplicateEmailError());
    }
    const now = this.clock.now();
    const user: User = {
      id: nextId("user"),
      email: input.email,
      normalizedEmail: input.normalizedEmail,
      passwordHash: input.passwordHash,
      role: input.role,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(user);
    return Promise.resolve(user);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((u) => u.id === id) ?? null);
  }

  findByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    return Promise.resolve(this.users.find((u) => u.normalizedEmail === normalizedEmail) ?? null);
  }

  updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      const index = this.users.indexOf(user);
      this.users[index] = { ...user, passwordHash, updatedAt: this.clock.now() };
    }
    return Promise.resolve();
  }

  markEmailVerified(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      const index = this.users.indexOf(user);
      this.users[index] = { ...user, emailVerified: true, updatedAt: this.clock.now() };
    }
    return Promise.resolve();
  }

  seed(role: Role, overrides: Partial<User> = {}): User {
    const now = this.clock.now();
    const user: User = {
      id: nextId("user"),
      email: "seeded@example.com",
      normalizedEmail: "seeded@example.com",
      passwordHash: "seeded-hash",
      role,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.users.push(user);
    return user;
  }
}

export class FakeSessionRepository implements SessionRepository {
  readonly sessions: Session[] = [];

  create(input: CreateSessionInput): Promise<Session> {
    const session: Session = {
      id: nextId("session"),
      userId: input.userId,
      tokenHash: input.tokenHash,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      rotatedAt: null,
    };
    this.sessions.push(session);
    return Promise.resolve(session);
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.tokenHash === tokenHash) ?? null);
  }

  revoke(sessionId: string): Promise<void> {
    const index = this.sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      this.sessions.splice(index, 1);
    }
    return Promise.resolve();
  }

  revokeAllForUser(userId: string): Promise<void> {
    for (let i = this.sessions.length - 1; i >= 0; i -= 1) {
      if (this.sessions[i]?.userId === userId) {
        this.sessions.splice(i, 1);
      }
    }
    return Promise.resolve();
  }
}

export class FakePasswordHasher implements PasswordHasher {
  private readonly hashes = new Map<string, string>();

  hash(plainPassword: string): Promise<string> {
    const hash = `hashed:${plainPassword}`;
    this.hashes.set(hash, plainPassword);
    return Promise.resolve(hash);
  }

  verify(hash: string, plainPassword: string): Promise<boolean> {
    return Promise.resolve(
      this.hashes.get(hash) === plainPassword || hash === `hashed:${plainPassword}`,
    );
  }
}

export class FakeTokenGenerator implements TokenGenerator {
  private counter = 0;
  private readonly queue: string[] = [];

  /** Lets a test pin the next raw token returned, to assert on it. */
  enqueue(token: string): void {
    this.queue.push(token);
  }

  generate(): string {
    const queued = this.queue.shift();
    if (queued !== undefined) {
      return queued;
    }
    this.counter += 1;
    return `raw-token-${this.counter}`;
  }

  hash(token: string): string {
    return `hashed:${token}`;
  }
}

export class FakeEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  readonly tokens: EmailVerificationToken[] = [];

  create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationToken> {
    const token: EmailVerificationToken = {
      id: nextId("evt"),
      userId: input.userId,
      tokenHash: input.tokenHash,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.tokens.push(token);
    return Promise.resolve(token);
  }

  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return Promise.resolve(this.tokens.find((t) => t.tokenHash === tokenHash) ?? null);
  }

  markUsed(id: string): Promise<void> {
    const token = this.tokens.find((t) => t.id === id);
    if (token) {
      const index = this.tokens.indexOf(token);
      this.tokens[index] = { ...token, usedAt: new Date() };
    }
    return Promise.resolve();
  }

  invalidateAllForUser(userId: string): Promise<void> {
    for (let i = 0; i < this.tokens.length; i += 1) {
      const token = this.tokens[i];
      if (token?.userId === userId && token.usedAt === null) {
        this.tokens[i] = { ...token, usedAt: new Date() };
      }
    }
    return Promise.resolve();
  }
}

export class FakePasswordResetTokenRepository implements PasswordResetTokenRepository {
  readonly tokens: PasswordResetToken[] = [];

  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const token: PasswordResetToken = {
      id: nextId("prt"),
      userId: input.userId,
      tokenHash: input.tokenHash,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.tokens.push(token);
    return Promise.resolve(token);
  }

  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return Promise.resolve(this.tokens.find((t) => t.tokenHash === tokenHash) ?? null);
  }

  markUsed(id: string): Promise<void> {
    const token = this.tokens.find((t) => t.id === id);
    if (token) {
      const index = this.tokens.indexOf(token);
      this.tokens[index] = { ...token, usedAt: new Date() };
    }
    return Promise.resolve();
  }

  invalidateAllForUser(userId: string): Promise<void> {
    for (let i = 0; i < this.tokens.length; i += 1) {
      const token = this.tokens[i];
      if (token?.userId === userId && token.usedAt === null) {
        this.tokens[i] = { ...token, usedAt: new Date() };
      }
    }
    return Promise.resolve();
  }
}

export interface SentEmail {
  kind: "verification" | "password-reset";
  to: string;
  url: string;
}

export class FakeEmailService implements EmailService {
  readonly sent: SentEmail[] = [];

  sendVerificationEmail(input: { to: string; verificationUrl: string }): Promise<void> {
    this.sent.push({ kind: "verification", to: input.to, url: input.verificationUrl });
    return Promise.resolve();
  }

  sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<void> {
    this.sent.push({ kind: "password-reset", to: input.to, url: input.resetUrl });
    return Promise.resolve();
  }
}
