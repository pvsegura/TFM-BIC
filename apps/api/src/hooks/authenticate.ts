import type { ResolveSessionUseCase } from "@tfm-bic/application";
import type { FastifyReply, FastifyRequest } from "fastify";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";

/**
 * Resolves the session cookie (if any) into `request.currentUser`, or
 * replies 401 and short-circuits the route. Every route that needs a
 * logged-in user uses this preHandler — never a client-supplied header,
 * body field, or anything else as a stand-in for identity (ADR-006).
 */
export function createAuthenticateHook(resolveSession: ResolveSessionUseCase) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const rawCookie = request.cookies[SESSION_COOKIE_NAME];
    if (!rawCookie) {
      await reply.code(401).send({ error: "Unauthenticated" });
      return;
    }

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || unsigned.value === null) {
      await reply.code(401).send({ error: "Unauthenticated" });
      return;
    }

    const user = await resolveSession.execute({ sessionToken: unsigned.value });
    if (!user) {
      await reply.code(401).send({ error: "Unauthenticated" });
      return;
    }

    request.currentUser = user;
  };
}
