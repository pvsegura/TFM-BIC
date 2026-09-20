import type { ProfilePatch, ProfileRepository } from "@tfm-bic/application";
import { isValidAvatarId, type StudentProfile } from "@tfm-bic/domain";
import { eq, sql } from "drizzle-orm";

import type { ProfileDb } from "./db/client.js";
import { studentProfiles } from "./db/schema.js";

function toStudentProfile(row: typeof studentProfiles.$inferSelect): StudentProfile {
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    // The column is unconstrained text (see db/schema.ts). An id that has
    // since left the catalog degrades to "no avatar" instead of leaking an
    // unknown value to callers or failing the whole read.
    avatarId: row.avatarId !== null && isValidAvatarId(row.avatarId) ? row.avatarId : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleProfileRepository implements ProfileRepository {
  constructor(private readonly db: ProfileDb) {}

  async findByUserId(userId: string): Promise<StudentProfile | null> {
    const [row] = await this.db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId));
    return row ? toStudentProfile(row) : null;
  }

  async upsert(userId: string, patch: ProfilePatch): Promise<StudentProfile> {
    // Explicit field-by-field mapping: only the four profile fields can ever
    // reach the statement, and only the ones present in the patch (an
    // omitted field is left alone, an explicit `null` clears it).
    const changes: Partial<typeof studentProfiles.$inferInsert> = {};
    if (patch.firstName !== undefined) {
      changes.firstName = patch.firstName;
    }
    if (patch.lastName !== undefined) {
      changes.lastName = patch.lastName;
    }
    if (patch.nickname !== undefined) {
      changes.nickname = patch.nickname;
    }
    if (patch.avatarId !== undefined) {
      changes.avatarId = patch.avatarId;
    }

    // One atomic statement: two concurrent first-time saves cannot race into
    // a duplicate-key error, and each only overwrites its own columns.
    const [row] = await this.db
      .insert(studentProfiles)
      .values({ userId, ...changes })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { ...changes, updatedAt: sql`now()` },
      })
      .returning();
    if (!row) {
      throw new Error("Upsert into student_profiles returned no row.");
    }
    return toStudentProfile(row);
  }
}
