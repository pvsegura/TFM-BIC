import type { AvatarId } from "../media/avatar-catalog.js";

/**
 * Profile-specific data only. Authentication identity (email, role, password
 * state) stays on `User` and is never duplicated here — a profile is keyed
 * by, and belongs to, exactly one user. Every personal field is optional: a
 * student may not have filled anything in yet.
 */
export interface StudentProfile {
  readonly userId: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly nickname: string | null;
  readonly avatarId: AvatarId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
