import {
  EmailDeliveryError,
  NewsletterConsentVersionMismatchError,
  type ResolveSessionUseCase,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  emailPreferencesResponseSchema,
  newsletterPreferenceResponseSchema,
  newsletterSubscriptionRequestSchema,
  newsletterSubscriptionResponseSchema,
  newsletterTokenRequestSchema,
} from "@tfm-bic/contracts";
import {
  InvalidNewsletterTokenError,
  NewsletterTokenExpiredError,
  type NewsletterPreference,
} from "@tfm-bic/domain";
import type { FastifyInstance, FastifyReply } from "fastify";

import type { EmailUseCases } from "../composition/email-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { routeRateLimit } from "../security/rate-limits.js";

const INVALID_BODY = { error: "Invalid request body." } as const;
const INVALID_LINK = { error: "This link is invalid or has already been used." } as const;
const EXPIRED_LINK = {
  error: "This confirmation link has expired. Please subscribe again from your settings.",
} as const;
const NOT_SENT = {
  error: "We could not send the confirmation email right now. Please try again later.",
} as const;
/** Every body here is tiny (a boolean and a version, or one token). */
const BODY_LIMIT_BYTES = 1024;
function toPreferenceBody(preference: NewsletterPreference) {
  return newsletterPreferenceResponseSchema.parse({
    status: preference.status,
    since: preference.since?.toISOString() ?? null,
  });
}

/** Maps the newsletter's known failures; anything else is a real 500. */
function sendKnownError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof InvalidNewsletterTokenError) {
    return reply.code(400).send(INVALID_LINK);
  }
  if (error instanceof NewsletterTokenExpiredError) {
    return reply.code(410).send(EXPIRED_LINK);
  }
  if (error instanceof NewsletterConsentVersionMismatchError) {
    return reply.code(409).send({ error: error.message });
  }
  if (error instanceof EmailDeliveryError) {
    return reply.code(503).header("retry-after", "60").send(NOT_SENT);
  }
  throw error;
}

/**
 * Email preferences and newsletter (M14, ADR-025).
 *
 * - `GET /email-preferences` — essential (always on) and newsletter state of the session user.
 * - `POST|DELETE /email-preferences/newsletter/subscription` — subscribe (double opt-in step 1)
 *   or unsubscribe, for the session user only; the address always comes from the session.
 * - `POST /email-preferences/newsletter/confirm` — double opt-in step 2, the emailed token.
 * - `POST /email-preferences/newsletter/unsubscribe` — link/one-click unsubscribe: the signed
 *   token (query string or JSON body) is the only authorization; no login, no Origin check (mail
 *   clients' RFC 8058 POSTs carry none), and it can only withdraw consent.
 *
 * Every response is `private, no-store`; every route is rate limited.
 */
export function registerEmailPreferencesRoutes(
  app: FastifyInstance,
  deps: { useCases: EmailUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(deps.resolveSession);

  // Per client address; relaxed only for E2E runs (security/rate-limits.ts).
  function rateLimit(max: number, timeWindow: string) {
    return routeRateLimit(env, max, timeWindow);
  }

  app.get(
    "/email-preferences",
    { preHandler: [authenticate], config: { rateLimit: rateLimit(60, "1 minute") } },
    async (request, reply) => {
      const user = request.currentUser!;
      const preferences = await useCases.getPreferences.execute({ userId: user.id });
      return reply.header("cache-control", "private, no-store").send(
        emailPreferencesResponseSchema.parse({
          essential: preferences.essential,
          newsletter: toPreferenceBody(preferences.newsletter),
        }),
      );
    },
  );

  app.post(
    "/email-preferences/newsletter/subscription",
    {
      preHandler: [verifyOrigin, authenticate],
      bodyLimit: BODY_LIMIT_BYTES,
      config: { rateLimit: rateLimit(5, "1 hour") },
    },
    async (request, reply) => {
      reply.header("cache-control", "private, no-store");
      const parsed = newsletterSubscriptionRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY);
      }
      const user = request.currentUser!;
      try {
        const result = await useCases.requestSubscription.execute({
          user: { id: user.id, email: user.email },
          consentVersion: parsed.data.consentVersion,
        });
        request.log.info(
          { userId: user.id, status: result.newsletter.status, sent: result.confirmationEmailSent },
          "newsletter.subscription_requested",
        );
        return reply.code(result.newsletter.status === "subscribed" ? 200 : 202).send(
          newsletterSubscriptionResponseSchema.parse({
            newsletter: toPreferenceBody(result.newsletter),
            confirmationEmailSent: result.confirmationEmailSent,
          }),
        );
      } catch (error) {
        return sendKnownError(reply, error);
      }
    },
  );

  app.delete(
    "/email-preferences/newsletter/subscription",
    {
      preHandler: [verifyOrigin, authenticate],
      config: { rateLimit: rateLimit(20, "15 minutes") },
    },
    async (request, reply) => {
      const user = request.currentUser!;
      const newsletter = await useCases.unsubscribe.execute({ userId: user.id });
      request.log.info({ userId: user.id }, "newsletter.unsubscribed");
      return reply
        .header("cache-control", "private, no-store")
        .send({ newsletter: toPreferenceBody(newsletter) });
    },
  );

  app.post(
    "/email-preferences/newsletter/confirm",
    {
      preHandler: [verifyOrigin],
      bodyLimit: BODY_LIMIT_BYTES,
      config: { rateLimit: rateLimit(20, "15 minutes") },
    },
    async (request, reply) => {
      reply.header("cache-control", "private, no-store");
      const parsed = newsletterTokenRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY);
      }
      try {
        const newsletter = await useCases.confirmSubscription.execute(parsed.data);
        request.log.info("newsletter.subscription_confirmed");
        return reply.send({ newsletter: toPreferenceBody(newsletter) });
      } catch (error) {
        return sendKnownError(reply, error);
      }
    },
  );

  // Encapsulated so the form-body parser RFC 8058 needs exists on this one route only.
  void app.register((scope, _options, done) => {
    // One-click unsubscribe POSTs `List-Unsubscribe=One-Click` as a form body; the token is in the
    // URL, so the body's content is irrelevant and deliberately not parsed.
    scope.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string", bodyLimit: BODY_LIMIT_BYTES },
      (_request, _body, parserDone) => {
        parserDone(null, {});
      },
    );

    scope.post<{ Querystring: { token?: string } }>(
      "/email-preferences/newsletter/unsubscribe",
      { bodyLimit: BODY_LIMIT_BYTES, config: { rateLimit: rateLimit(30, "15 minutes") } },
      async (request, reply) => {
        reply.header("cache-control", "private, no-store");
        const candidate =
          typeof request.query.token === "string" ? { token: request.query.token } : request.body;
        const parsed = newsletterTokenRequestSchema.safeParse(candidate);
        if (!parsed.success) {
          return reply.code(400).send(INVALID_LINK);
        }
        try {
          const result = await useCases.unsubscribeWithToken.execute(parsed.data);
          request.log.info("newsletter.unsubscribed_by_link");
          return reply.send(result);
        } catch (error) {
          return sendKnownError(reply, error);
        }
      },
    );
    done();
  });
}
