import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * CSRF defense in depth for state-changing `/auth/*` routes (primary
 * defense is `SameSite=Strict` on the session cookie — see ADR-006). When
 * an `Origin` header is present and doesn't match `appBaseUrl`, reject the
 * request; a same-site `fetch`/form POST always sends `Origin` for
 * cross-origin-capable methods, so an absent header is treated as
 * same-site (consistent with how browsers behave for plain navigations).
 */
export function createVerifyOriginHook(appBaseUrl: string) {
  const expectedOrigin = new URL(appBaseUrl).origin;

  return async function verifyOrigin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const origin = request.headers.origin;
    if (origin && origin !== expectedOrigin) {
      await reply.code(403).send({ error: "Forbidden" });
    }
  };
}
