import type { ContentGate, ResolveSessionUseCase } from "@verbysia/application";
import type { FastifyReply, FastifyRequest } from "fastify";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";

export const LOCKED_RESPONSE = { error: "Locked.", code: "LICENCE_REQUIRED" } as const;

/**
 * Runs after `authenticate` (or `optionalSession` on public routes): refuses paid content the
 * caller holds no licence for with `403 { code: "LICENCE_REQUIRED" }`. An id that names nothing
 * passes through so the route answers its own 404. The decision is the server's, from licences.
 */
export function createContentAccessHook(
  gate: ContentGate,
  target: (request: FastifyRequest) => { kind: "content" | "exercise"; id: string } | null,
) {
  return async function contentAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const which = target(request);
    if (!which) return;
    const userId = request.currentUser?.id ?? null;
    const decision =
      which.kind === "content"
        ? await gate.checkContent(userId, which.id)
        : await gate.checkExercise(userId, which.id);
    if (decision === "locked") {
      await reply.code(403).header("Cache-Control", "private, no-store").send(LOCKED_RESPONSE);
    }
  };
}

/** Sets `request.currentUser` when a valid session cookie is present; never replies. */
export function createOptionalSessionHook(resolveSession: ResolveSessionUseCase) {
  return async function optionalSession(request: FastifyRequest): Promise<void> {
    const rawCookie = request.cookies[SESSION_COOKIE_NAME];
    if (!rawCookie) return;
    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || unsigned.value === null) return;
    const user = await resolveSession.execute({ sessionToken: unsigned.value });
    if (user) request.currentUser = user;
  };
}

export function paramOf(request: FastifyRequest, name: string): string | null {
  const value = (request.params as Record<string, unknown> | undefined)?.[name];
  return typeof value === "string" ? value : null;
}
