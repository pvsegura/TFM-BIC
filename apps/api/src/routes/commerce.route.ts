import {
  CommerceNotFoundError,
  InvalidCommerceInputError,
  type ResolveSessionUseCase,
} from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import {
  adminAuditEntrySchema,
  adminGrantLicenceRequestSchema,
  adminLicenceIdParamSchema,
  adminLicenceSchema,
  adminListQuerySchema,
  adminProductIdParamSchema,
  adminProductSchema,
  adminPurchaseSchema,
  adminSubscriptionSchema,
  adminUpdateProductRequestSchema,
  adminUserDetailResponseSchema,
  adminUserIdParamSchema,
  adminUsersQuerySchema,
  adminUsersResponseSchema,
  myAccessResponseSchema,
  publicProductsResponseSchema,
} from "@verbysia/contracts";
import { isLicenceActive, type LicenceRecord } from "@verbysia/domain";
import type { FastifyInstance } from "fastify";

import type { CommerceUseCases } from "../composition/verbysia-dependencies.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createRequireRoleHook } from "../hooks/require-role.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import type { MappedCatalogError } from "./catalog-error.mapper.js";
import { INVALID_REQUEST, privateResponse, sessionUserId } from "./route-helpers.js";
import { routeRateLimit } from "../security/rate-limits.js";

const ADMIN_BODY_LIMIT_BYTES = 4096;

function mapCommerceError(error: unknown): MappedCatalogError {
  if (error instanceof CommerceNotFoundError)
    return { statusCode: 404, body: { error: "Not found." } };
  if (error instanceof InvalidCommerceInputError) return { statusCode: 400, body: INVALID_REQUEST };
  throw error;
}

/** JSON-serialisable copy of a row: every Date becomes an ISO string. */
function iso<T extends object>(row: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

function licenceView(licence: LicenceRecord, now: Date) {
  return adminLicenceSchema.parse({ ...iso(licence), active: isLicenceActive(licence, now) });
}

/**
 * Prices, own access and the admin panel API.
 *
 * Public: `GET /products` — the price list (draft products shown as coming soon, nothing
 * purchasable until a payment provider is configured).
 * Learner: `GET /me/access` — own licences, from the session.
 * Admin (role ADMIN, checked on the server for every request; writes also need a same-origin
 * request and are written to the audit log): users, products, licences, purchases,
 * subscriptions and the audit log itself.
 */
export function registerCommerceRoutes(
  app: FastifyInstance,
  deps: { useCases: CommerceUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const authenticate = createAuthenticateHook(resolveSession);
  const requireAdmin = createRequireRoleHook(["ADMIN"]);
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const read = { config: { rateLimit: routeRateLimit(env, 120, "1 minute") } };
  const adminRead = { ...read, preHandler: [authenticate, requireAdmin] };
  const adminWrite = {
    config: { rateLimit: routeRateLimit(env, 30, "1 minute") },
    bodyLimit: ADMIN_BODY_LIMIT_BYTES,
    preHandler: [verifyOrigin, authenticate, requireAdmin],
  };

  app.get("/products", read, async (_request, reply) => {
    const products = await useCases.listPublicProducts.execute();
    void reply.header("Cache-Control", "public, max-age=60");
    return publicProductsResponseSchema.parse({ products });
  });

  app.get("/me/access", { ...read, preHandler: [authenticate] }, async (request, reply) =>
    privateResponse(reply, mapCommerceError, async () => {
      const access = await useCases.getMyAccess.execute(sessionUserId(request));
      return myAccessResponseSchema.parse({ ...access, licences: access.licences.map(iso) });
    }),
  );

  app.get("/admin/users", adminRead, async (request, reply) => {
    const query = adminUsersQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () => {
      const result = await useCases.admin.searchUsers(
        query.data.q ?? "",
        query.data.limit ?? 25,
        query.data.offset ?? 0,
      );
      return adminUsersResponseSchema.parse({ total: result.total, users: result.users.map(iso) });
    });
  });

  app.get("/admin/users/:userId", adminRead, async (request, reply) => {
    const params = adminUserIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () => {
      const detail = await useCases.admin.getUser(params.data.userId);
      const now = useCases.clock.now();
      return adminUserDetailResponseSchema.parse({
        user: iso(detail.user),
        licences: detail.licences.map((licence) => licenceView(licence, now)),
        purchases: detail.purchases.map((p) => adminPurchaseSchema.parse(iso(p))),
        subscriptions: detail.subscriptions.map((s) => adminSubscriptionSchema.parse(iso(s))),
      });
    });
  });

  app.post("/admin/users/:userId/licences", adminWrite, async (request, reply) => {
    const params = adminUserIdParamSchema.safeParse(request.params);
    const body = adminGrantLicenceRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () => {
      const licence = await useCases.admin.grantLicence(sessionUserId(request), {
        userId: params.data.userId,
        ...body.data,
      });
      void reply.code(201);
      return licenceView(licence, useCases.clock.now());
    });
  });

  app.post("/admin/licences/:licenceId/revoke", adminWrite, async (request, reply) => {
    const params = adminLicenceIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () =>
      licenceView(
        await useCases.admin.revokeLicence(sessionUserId(request), params.data.licenceId),
        useCases.clock.now(),
      ),
    );
  });

  app.get("/admin/products", adminRead, async (_request, reply) =>
    privateResponse(reply, mapCommerceError, async () => ({
      paymentsEnabled: useCases.paymentsEnabled,
      products: (await useCases.admin.listProducts()).map((p) => adminProductSchema.parse(iso(p))),
    })),
  );

  app.patch("/admin/products/:productId", adminWrite, async (request, reply) => {
    const params = adminProductIdParamSchema.safeParse(request.params);
    const body = adminUpdateProductRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () =>
      adminProductSchema.parse(
        iso(
          await useCases.admin.updateProduct(
            sessionUserId(request),
            params.data.productId,
            body.data,
          ),
        ),
      ),
    );
  });

  app.get("/admin/purchases", adminRead, async (request, reply) => {
    const query = adminListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () => ({
      purchases: (await useCases.admin.listPurchases(query.data.limit ?? 50)).map((p) =>
        adminPurchaseSchema.parse(iso(p)),
      ),
    }));
  });

  app.get("/admin/subscriptions", adminRead, async (request, reply) => {
    const query = adminListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () => ({
      subscriptions: (await useCases.admin.listSubscriptions(query.data.limit ?? 50)).map((s) =>
        adminSubscriptionSchema.parse(iso(s)),
      ),
    }));
  });

  app.get("/admin/audit", adminRead, async (request, reply) => {
    const query = adminListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send(INVALID_REQUEST);
    return privateResponse(reply, mapCommerceError, async () => ({
      entries: (await useCases.admin.listAudit(query.data.limit ?? 100)).map((e) =>
        adminAuditEntrySchema.parse(iso(e)),
      ),
    }));
  });
}
