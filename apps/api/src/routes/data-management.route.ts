import type { ResolveSessionUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  deleteAccountRequestSchema,
  personalDataExportQuerySchema,
  personalDataExportSchema,
} from "@tfm-bic/contracts";
import { AccountDeletionRefusedError, personalDataExportFileName } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";

import type { PrivacyUseCases } from "../composition/privacy-use-cases.js";
import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { perUserRateLimit } from "../security/rate-limits.js";

const INVALID_BODY = { error: "Invalid request body." } as const;
const INVALID_QUERY = { error: "Invalid query." } as const;
const ACCOUNT_NOT_FOUND = { error: "Account not found." } as const;
/** The deletion body is a password and a boolean. */
const BODY_LIMIT_BYTES = 1024;
/** Same multiplier and meaning as the auth routes (see auth.route.ts). */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

/**
 * Privacy & Data Management (M15, ADR-026) — self-service access/portability and erasure for the
 * session user only. There is no `:userId` anywhere: the account is always `request.currentUser`.
 * Not under `/privacy`, which is the public privacy-notice page (no page-vs-API path clash).
 *
 * - `GET /data-management/export` — the personal-data export (JSON attachment, version 1).
 *   5 an hour: a person has no reason to download their data more often, and each export reads
 *   every store.
 * - `POST /data-management/account-deletion` — `{ password, confirm: true }`; immediate,
 *   irreversible erasure; clears the session cookie. 5 an hour: it checks a password, so it is
 *   rate limited like the other password-checking routes.
 *
 * Both responses are `private, no-store`. Logs carry the event and the user id only — never the
 * export contents, the password or the cookie.
 */
export function registerDataManagementRoutes(
  app: FastifyInstance,
  deps: { useCases: PrivacyUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(deps.resolveSession);
  // Per user as well as per address (M16, S-03): a stolen session cannot spread password guesses
  // (deletion) or exports over many addresses.
  const exportUserLimit = perUserRateLimit(app, env, "data-export", {
    max: 5,
    timeWindow: "1 hour",
  });
  const deletionUserLimit = perUserRateLimit(app, env, "account-deletion", {
    max: 5,
    timeWindow: "1 hour",
  });

  function rateLimit(max: number, timeWindow: string) {
    return {
      max: env.E2E_RELAXED_RATE_LIMITS ? max * E2E_RATE_LIMIT_MULTIPLIER : max,
      timeWindow,
    };
  }

  app.get(
    "/data-management/export",
    { preHandler: [authenticate, exportUserLimit], config: { rateLimit: rateLimit(5, "1 hour") } },
    async (request, reply) => {
      reply.header("cache-control", "private, no-store");
      if (!personalDataExportQuerySchema.safeParse(request.query).success) {
        return reply.code(400).send(INVALID_QUERY);
      }
      const user = request.currentUser!;
      const document = await useCases.exportPersonalData.execute({ userId: user.id });
      if (document === null) {
        return reply.code(404).send(ACCOUNT_NOT_FOUND);
      }
      const body = personalDataExportSchema.parse(document);
      request.log.info({ userId: user.id }, "privacy.data_export_generated");
      return reply
        .header("x-content-type-options", "nosniff")
        .header(
          "content-disposition",
          `attachment; filename="${personalDataExportFileName(new Date(body.generatedAt))}"`,
        )
        .type("application/json; charset=utf-8")
        .send(JSON.stringify(body, null, 2));
    },
  );

  app.post(
    "/data-management/account-deletion",
    {
      preHandler: [verifyOrigin, authenticate, deletionUserLimit],
      bodyLimit: BODY_LIMIT_BYTES,
      config: { rateLimit: rateLimit(5, "1 hour") },
    },
    async (request, reply) => {
      reply.header("cache-control", "private, no-store");
      const parsed = deleteAccountRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY);
      }
      const user = request.currentUser!;
      try {
        const result = await useCases.deleteAccount.execute({
          userId: user.id,
          password: parsed.data.password,
        });
        request.log.info({ userId: user.id, deleted: result.deleted }, "privacy.account_deleted");
      } catch (error) {
        if (error instanceof AccountDeletionRefusedError) {
          request.log.info({ userId: user.id }, "privacy.account_deletion_refused");
          return reply.code(403).send({ error: error.message });
        }
        throw error;
      }
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return reply.code(204).send();
    },
  );
}
