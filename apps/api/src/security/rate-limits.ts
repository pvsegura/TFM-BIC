import type { AppEnv } from "@tfm-bic/config";
import { normalizeEmail } from "@tfm-bic/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Rate-limit building blocks (M16, ADR-027). Two layers:
 *
 * - **Per client address** — a route's `config.rateLimit` (`@fastify/rate-limit`, keyed by
 *   `request.ip`; see TRUST_PROXY for proxies). Built with `routeRateLimit`.
 * - **Per account / per user** — a preHandler from `perUserRateLimit` / `perAccountLoginRateLimit`,
 *   so a limit cannot be escaped by rotating addresses. Built on `app.createRateLimit()`: the
 *   plugin's own `app.rateLimit()` preHandler skips itself when a route limit already ran on the
 *   request, so it cannot be stacked.
 *
 * Stores are in memory, per process — enough for the single API instance ADR-012/015 assume. A
 * scaled-out deployment would need a shared store.
 */

/** `E2E_RELAXED_RATE_LIMITS` (NODE_ENV=test only, packages/config) multiplies every limit: a full
 * Playwright run shares one server and one client address. The real limits are exercised by the
 * route and security tests, which never set it. */
export const E2E_RATE_LIMIT_MULTIPLIER = 100;

export interface RateLimitConfig {
  max: number;
  timeWindow: string;
}

export function routeRateLimit(env: AppEnv, max: number, timeWindow: string): RateLimitConfig {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS ? max * E2E_RATE_LIMIT_MULTIPLIER : max,
    timeWindow,
  };
}

type RateLimitPreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

function keyedRateLimit(
  app: FastifyInstance,
  env: AppEnv,
  options: RateLimitConfig & {
    /** Namespace, so two limits never share a counter. */
    name: string;
    /** The counter key, or `null` to leave the request to the route's other limits. */
    key: (request: FastifyRequest) => string | null;
  },
): RateLimitPreHandler {
  const check = app.createRateLimit({
    ...routeRateLimit(env, options.max, options.timeWindow),
    keyGenerator: (request) => `${options.name}:${options.key(request) ?? ""}`,
  });
  return async function rateLimitPreHandler(request, reply) {
    if (options.key(request) === null) {
      return;
    }
    const limit = await check(request);
    if (!limit.isAllowed && limit.isExceeded) {
      await reply
        .code(429)
        .header("retry-after", String(limit.ttlInSeconds))
        .send({ error: "Too many requests." });
    }
  };
}

/**
 * A limit per authenticated user — must run after `authenticate`. For routes where one account
 * could otherwise spread its requests over many addresses: password checks (account deletion),
 * expensive work (export, audio/video generation).
 */
export function perUserRateLimit(
  app: FastifyInstance,
  env: AppEnv,
  name: string,
  config: RateLimitConfig,
): RateLimitPreHandler {
  return keyedRateLimit(app, env, {
    ...config,
    name: `user:${name}`,
    key: (request) => request.currentUser?.id ?? null,
  });
}

/**
 * Login attempts per account (the normalised email in the body), whichever address they come
 * from — OWASP's recommendation against distributed guessing. Unknown addresses are counted exactly
 * like existing ones, so being limited reveals nothing. A malformed body is left to the route
 * (it answers 400 without checking anything). Password reset stays available to a throttled
 * account's owner.
 */
export function perAccountLoginRateLimit(
  app: FastifyInstance,
  env: AppEnv,
  config: RateLimitConfig,
): RateLimitPreHandler {
  return keyedRateLimit(app, env, {
    ...config,
    name: "login-account",
    key: (request) => {
      const body: unknown = request.body;
      if (typeof body !== "object" || body === null || !("email" in body)) {
        return null;
      }
      const { email } = body;
      return typeof email === "string" && email.trim() !== "" ? normalizeEmail(email) : null;
    },
  });
}
