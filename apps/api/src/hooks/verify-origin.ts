import type { FastifyReply, FastifyRequest } from "fastify";

/** `Sec-Fetch-Site` values a browser sends for a request this origin did not start itself. */
const FOREIGN_FETCH_SITES = new Set(["cross-site", "same-site"]);

/**
 * CSRF defense in depth for every state-changing route (primary defense is `SameSite=Strict` on
 * the session cookie — see ADR-006):
 *
 * - An `Origin` header that is not exactly `appBaseUrl`'s origin → 403.
 * - No `Origin` (M16, ADR-027): fall back to Fetch Metadata — a browser-set `Sec-Fetch-Site` of
 *   `cross-site` or `same-site` (a sibling subdomain) → 403. OWASP recommends blocking or this
 *   fallback when `Origin` is missing.
 * - Neither header: allowed. Only a non-browser client sends neither, and it carries no ambient
 *   session cookie a forged request could ride on.
 */
export function createVerifyOriginHook(appBaseUrl: string) {
  const expectedOrigin = new URL(appBaseUrl).origin;

  return async function verifyOrigin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { origin } = request.headers;
    const fetchSite = request.headers["sec-fetch-site"];
    const foreign =
      origin !== undefined
        ? origin !== expectedOrigin
        : typeof fetchSite === "string" && FOREIGN_FETCH_SITES.has(fetchSite);
    if (foreign) {
      await reply.code(403).send({ error: "Forbidden" });
    }
  };
}
