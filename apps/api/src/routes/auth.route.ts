import {
  authUserResponseSchema,
  loginRequestSchema,
  messageResponseSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  verifyEmailRequestSchema,
} from "@tfm-bic/contracts";
import type { AppEnv } from "@tfm-bic/config";
import { toSafeUser } from "@tfm-bic/domain";
import type { FastifyInstance } from "fastify";

import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "../constants/session-cookie.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import type { AuthUseCases } from "../composition/auth-use-cases.js";
import { mapAuthError } from "./auth-error.mapper.js";

const INVALID_BODY_RESPONSE = { error: "Invalid request body." } as const;

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { useCases: AuthUseCases; env: AppEnv },
): void {
  const { useCases, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(useCases.resolveSession);
  const isSecureCookie = env.NODE_ENV === "production" || env.NODE_ENV === "staging";

  app.post(
    "/auth/register",
    { preHandler: [verifyOrigin], config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const parsed = registerRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY_RESPONSE);
      }
      try {
        const result = await useCases.register.execute(parsed.data);
        return messageResponseSchema.parse(result);
      } catch (error) {
        const mapped = mapAuthError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/auth/login",
    { preHandler: [verifyOrigin], config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const parsed = loginRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY_RESPONSE);
      }
      try {
        const result = await useCases.login.execute(parsed.data);
        reply.setCookie(SESSION_COOKIE_NAME, result.sessionToken, {
          httpOnly: true,
          secure: isSecureCookie,
          sameSite: "strict",
          path: "/",
          maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
          signed: true,
        });
        request.log.info({ userId: result.user.id }, "auth.login_success");
        return authUserResponseSchema.parse(result.user);
      } catch (error) {
        request.log.info("auth.login_failure");
        const mapped = mapAuthError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post("/auth/logout", { preHandler: [verifyOrigin] }, async (request, reply) => {
    const rawCookie = request.cookies[SESSION_COOKIE_NAME];
    if (rawCookie) {
      const unsigned = request.unsignCookie(rawCookie);
      if (unsigned.valid && unsigned.value) {
        await useCases.logout.execute({ sessionToken: unsigned.value });
      }
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    request.log.info("auth.logout");
    return reply.code(204).send();
  });

  app.get("/auth/me", { preHandler: [authenticate] }, (request, reply) => {
    if (!request.currentUser) {
      // Unreachable: `authenticate` already replies 401 and short-circuits
      // when there is no current user — this satisfies the type checker
      // without duplicating that response.
      return reply.code(401).send({ error: "Unauthenticated" });
    }
    return authUserResponseSchema.parse(toSafeUser(request.currentUser));
  });

  app.post(
    "/auth/email-verification/confirm",
    { preHandler: [verifyOrigin], config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const parsed = verifyEmailRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY_RESPONSE);
      }
      try {
        await useCases.verifyEmail.execute(parsed.data);
        request.log.info("auth.email_verified");
        return messageResponseSchema.parse({ message: "Email verified." });
      } catch (error) {
        const mapped = mapAuthError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.post(
    "/auth/email-verification/resend",
    { preHandler: [verifyOrigin], config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const parsed = resendVerificationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY_RESPONSE);
      }
      const result = await useCases.resendVerification.execute(parsed.data);
      return messageResponseSchema.parse(result);
    },
  );

  app.post(
    "/auth/password-reset/request",
    { preHandler: [verifyOrigin], config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const parsed = passwordResetRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY_RESPONSE);
      }
      const result = await useCases.requestPasswordReset.execute(parsed.data);
      request.log.info("auth.password_reset_requested");
      return messageResponseSchema.parse(result);
    },
  );

  app.post(
    "/auth/password-reset/confirm",
    { preHandler: [verifyOrigin], config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const parsed = passwordResetConfirmSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(INVALID_BODY_RESPONSE);
      }
      try {
        await useCases.confirmPasswordReset.execute(parsed.data);
        request.log.info("auth.password_reset_completed");
        return messageResponseSchema.parse({ message: "Password updated. Please log in again." });
      } catch (error) {
        const mapped = mapAuthError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );
}
