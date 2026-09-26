import type { AppEnv } from "@tfm-bic/config";
import { isTransactionalTemplate, isMarketingTemplate } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";

import type { EmailInbox } from "../composition/email-dependencies.js";
import type { EmailUseCases } from "../composition/email-use-cases.js";

/** M3's `kind` values, kept so existing E2E helpers keep working. */
function legacyKind(template: string): string {
  if (template === "email-verification") {
    return "verification";
  }
  return template;
}

function parseIssue(
  body: unknown,
): { subject: string; title: string; paragraphs: string[] } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const { subject, title, paragraphs } = body as Record<string, unknown>;
  if (
    typeof subject !== "string" ||
    typeof title !== "string" ||
    !Array.isArray(paragraphs) ||
    !paragraphs.every((p) => typeof p === "string")
  ) {
    return null;
  }
  return { subject, title, paragraphs };
}

/**
 * Diagnostic-only routes for automated tests — the fake provider sends nothing (ADR-014/025), so
 * E2E reads the links a real email would have carried here. Registered ONLY when `NODE_ENV=test`
 * *and* the E2E composition exposed the inbox (test-dependencies.ts); the production composition
 * never does, so no email content or token is reachable outside automated testing.
 *
 * - `GET /auth/_test/emails?to=&template=` — the latest captured email to an address.
 * - `POST /email-preferences/_test/newsletter-issues` — sends a newsletter issue to every
 *   confirmed subscription through the real marketing path (E2E has no operator tooling).
 */
export function registerTestEmailRoutes(
  app: FastifyInstance,
  deps: {
    env: AppEnv;
    emailInbox?: EmailInbox | undefined;
    enableIssueRoute?: boolean | undefined;
    useCases: EmailUseCases;
  },
): void {
  if (deps.env.NODE_ENV !== "test" || !deps.emailInbox) {
    return;
  }
  const emailInbox = deps.emailInbox;

  app.get<{ Querystring: { to?: string; template?: string } }>(
    "/auth/_test/emails",
    (request, reply) => {
      const { to, template } = request.query;
      if (!to) {
        return reply.code(400).send({ error: "Missing 'to' query parameter." });
      }
      if (
        template !== undefined &&
        !isTransactionalTemplate(template) &&
        !isMarketingTemplate(template)
      ) {
        return reply.code(400).send({ error: "Unknown template." });
      }
      const email = emailInbox.findLastSentTo(to, template);
      if (!email) {
        return reply.code(404).send({ error: "No email found for that recipient." });
      }
      return {
        kind: legacyKind(email.template),
        template: email.template,
        category: email.category,
        subject: email.subject,
        url: email.links[0] ?? null,
        links: email.links,
        listUnsubscribeUrl: email.listUnsubscribeUrl,
      };
    },
  );

  if (deps.enableIssueRoute !== true) {
    return;
  }
  app.post("/email-preferences/_test/newsletter-issues", async (request, reply) => {
    const issue = parseIssue(request.body);
    if (!issue) {
      return reply.code(400).send({ error: "Invalid request." });
    }
    return deps.useCases.sendIssue.execute(issue);
  });
}
