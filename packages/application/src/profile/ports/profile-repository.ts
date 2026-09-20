import type { AvatarId, StudentProfile } from "@tfm-bic/domain";

/**
 * The fields a student may change. Every field is optional — omitted fields
 * are left untouched. Already validated/normalized by the use case, so an
 * adapter can persist these values as-is. There is deliberately no `userId`,
 * `role` or `email` here: nothing but profile data can ever be written
 * through this port.
 */
export interface ProfilePatch {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  avatarId?: AvatarId;
}

/**
 * Owned by this layer, implemented in `packages/data` (Drizzle/Postgres).
 * A profile belongs to exactly one user (1:1, keyed by `userId`).
 */
export interface ProfileRepository {
  findByUserId(userId: string): Promise<StudentProfile | null>;
  /**
   * Creates the user's profile row if it does not exist yet, otherwise
   * updates only the fields present in `patch` — as one atomic operation, so
   * two concurrent first-time saves cannot race into a duplicate/conflict.
   */
  upsert(userId: string, patch: ProfilePatch): Promise<StudentProfile>;
}
