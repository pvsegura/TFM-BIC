/**
 * Roles at M3, per ADR-006: STUDENT and TEACHER. ADMIN/CONTENT_EDITOR/
 * SUPPORT/MODERATOR are reserved for future milestones — adding one later
 * means adding a value here (and a migration), not a schema rewrite, since
 * this is modeled as an enum, never a boolean flag.
 */
export const ROLES = ["STUDENT", "TEACHER"] as const;

export type Role = (typeof ROLES)[number];

export function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
