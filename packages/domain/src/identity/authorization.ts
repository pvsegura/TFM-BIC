import { ForbiddenError } from "./errors/forbidden.error.js";
import type { Role } from "./role.js";

/**
 * Reusable server-side authorization primitive — every route that needs a
 * role check calls this (or nothing runs at all), never a client-supplied
 * role field. See docs/adr/adr-006-authentication.md and the "AUTHORIZATION
 * FOUNDATION" section of the M3 brief.
 */
export function requireRole(role: Role, allowed: readonly Role[]): void {
  if (!allowed.includes(role)) {
    throw new ForbiddenError();
  }
}
