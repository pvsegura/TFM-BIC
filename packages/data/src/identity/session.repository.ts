import type { CreateSessionInput, SessionRepository } from "@tfm-bic/application";
import type { Session } from "@tfm-bic/domain";
import { eq } from "drizzle-orm";

import type { IdentityDb } from "./db/client.js";
import { sessions } from "./db/schema.js";

function toSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    rotatedAt: row.rotatedAt,
  };
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: IdentityDb) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const [row] = await this.db
      .insert(sessions)
      .values({ userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt })
      .returning();
    if (!row) {
      throw new Error("Insert into sessions returned no row.");
    }
    return toSession(row);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash));
    return row ? toSession(row) : null;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
