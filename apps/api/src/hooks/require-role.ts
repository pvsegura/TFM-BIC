import { requireRole, type Role } from "@tfm-bic/domain";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Server-side role gate — must run after `authenticate` (needs
 * `request.currentUser`). Demonstrates the reusable `authenticate()` +
 * `authorize(requiredRole)` pattern from the M3 brief. Used by the teacher
 * dashboard (M13); enforced entirely server-side, never from request data.
 */
export function createRequireRoleHook(allowed: readonly Role[]) {
  return async function requireRoleHook(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.currentUser) {
      await reply.code(401).send({ error: "Unauthenticated" });
      return;
    }
    try {
      requireRole(request.currentUser.role, allowed);
    } catch {
      await reply.code(403).send({ error: "Forbidden" });
    }
  };
}
