import type { AppEnv } from "@tfm-bic/config";
import type { FastifyInstance } from "fastify";

import type { EmailInbox } from "../composition/auth-dependencies.js";

/**
 * Diagnostic-only: lets E2E tests retrieve the verification/reset link a
 * real email would have contained — `InMemoryEmailService` never sends
 * anything over the network (see docs/adr/adr-014-email.md), so this is
 * the "safe strategy for development/testing" the M3 brief asks for.
 * Registered ONLY when `NODE_ENV=test` *and* an `emailInbox` was actually
 * provided (real/dev composition never provides one) — never reachable in
 * development/staging/production, so no verification/reset link is ever
 * exposed outside automated testing.
 */
export function registerTestEmailRoutes(
  app: FastifyInstance,
  deps: { env: AppEnv; emailInbox?: EmailInbox | undefined },
): void {
  if (deps.env.NODE_ENV !== "test" || !deps.emailInbox) {
    return;
  }
  const emailInbox = deps.emailInbox;

  app.get<{ Querystring: { to?: string } }>("/auth/_test/emails", (request, reply) => {
    const to = request.query.to;
    if (!to) {
      return reply.code(400).send({ error: "Missing 'to' query parameter." });
    }
    const email = emailInbox.findLastSentTo(to);
    if (!email) {
      return reply.code(404).send({ error: "No email found for that recipient." });
    }
    return { kind: email.kind, url: email.url };
  });
}
