import type { Session } from "@verbysia/domain";

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  revoke(sessionId: string): Promise<void>;
  /** Used by password-reset confirmation to invalidate every existing session. */
  revokeAllForUser(userId: string): Promise<void>;
}
