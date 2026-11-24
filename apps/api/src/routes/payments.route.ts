import {
  AlreadyOwnedError,
  CommerceNotFoundError,
  InvalidWebhookError,
  PaymentsDisabledError,
  type ResolveSessionUseCase,
} from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import { checkoutRequestSchema, CURRENT_TERMS_VERSION } from "@verbysia/contracts";
import type { FastifyInstance } from "fastify";

import type { CommerceUseCases } from "../composition/verbysia-dependencies.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createRequireRoleHook } from "../hooks/require-role.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { routeRateLimit } from "../security/rate-limits.js";
import type { MappedCatalogError } from "./catalog-error.mapper.js";
import { INVALID_REQUEST, privateResponse, sessionUserId } from "./route-helpers.js";

/** Stripe events are a few kilobytes; anything far larger is not a genuine webhook. */
const WEBHOOK_BODY_LIMIT_BYTES = 512 * 1024;

function mapPaymentError(error: unknown): MappedCatalogError {
  if (error instanceof PaymentsDisabledError) {
    return { statusCode: 503, body: { error: "Payments are not available yet." } };
  }
  if (error instanceof AlreadyOwnedError) {
    return { statusCode: 409, body: { error: "Already owned." } };
  }
  if (error instanceof CommerceNotFoundError)
    return { statusCode: 404, body: { error: "Not found." } };
  throw error;
}

/**
 * Payments (Stripe):
 * - `POST /checkout { productId }` — session + same origin; returns the hosted checkout URL.
 * - `POST /billing/portal` — session + same origin; returns the provider's self-service URL.
 * - `POST /admin/products/sync-provider` — ADMIN: creates provider prices for active products.
 * - `POST /webhooks/stripe` — no session (Stripe calls it); the raw body's signature is verified
 *   before anything is read, and only then are licences granted, extended or revoked.
 */
export function registerPaymentRoutes(
  app: FastifyInstance,
  deps: { useCases: CommerceUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const authenticate = createAuthenticateHook(resolveSession);
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const requireAdmin = createRequireRoleHook(["ADMIN"]);
  const write = { config: { rateLimit: routeRateLimit(env, 20, "1 minute") }, bodyLimit: 1024 };

  app.post(
    "/checkout",
    { ...write, preHandler: [verifyOrigin, authenticate] },
    async (request, reply) => {
      const body = checkoutRequestSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send(INVALID_REQUEST);
      const user = request.currentUser;
      return privateResponse(reply, mapPaymentError, async () =>
        useCases.startCheckout.execute({
          userId: sessionUserId(request),
          email: user?.email ?? "",
          productId: body.data.productId,
          // The schema only accepts both consents as `true`; the version says which wording.
          termsVersion: CURRENT_TERMS_VERSION,
        }),
      );
    },
  );

  app.post(
    "/billing/portal",
    { ...write, preHandler: [verifyOrigin, authenticate] },
    async (request, reply) =>
      privateResponse(reply, mapPaymentError, async () =>
        useCases.openBillingPortal.execute(sessionUserId(request)),
      ),
  );

  app.post(
    "/admin/products/sync-provider",
    { ...write, preHandler: [verifyOrigin, authenticate, requireAdmin] },
    async (request, reply) =>
      privateResponse(reply, mapPaymentError, async () =>
        useCases.syncProducts.execute(sessionUserId(request)),
      ),
  );

  // The webhook needs the exact bytes Stripe signed, so it gets its own JSON parser (raw buffer)
  // in an encapsulated scope — every other route keeps the normal JSON parsing.
  void app.register((scope, _options, pluginDone) => {
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => {
        done(null, body);
      },
    );
    scope.post(
      "/webhooks/stripe",
      {
        config: { rateLimit: routeRateLimit(env, 300, "1 minute") },
        bodyLimit: WEBHOOK_BODY_LIMIT_BYTES,
      },
      async (request, reply) => {
        const signature = request.headers["stripe-signature"];
        if (typeof signature !== "string" || !Buffer.isBuffer(request.body)) {
          return reply.code(400).send(INVALID_REQUEST);
        }
        try {
          const result = await useCases.handlePaymentEvent.execute(request.body, signature);
          request.log.info({ handled: result.handled }, "Payment webhook");
          return reply.code(200).send({ received: true });
        } catch (error) {
          if (error instanceof InvalidWebhookError) return reply.code(400).send(INVALID_REQUEST);
          if (error instanceof PaymentsDisabledError)
            return reply.code(404).send({ error: "Not found." });
          throw error;
        }
      },
    );
    pluginDone();
  });
}
