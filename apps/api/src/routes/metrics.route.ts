import { createHash, timingSafeEqual } from "node:crypto";

import type { AppEnv } from "@tfm-bic/config";
import type { SharedPoolStats } from "@tfm-bic/data";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { LOG_SERVICE_NAME } from "../logging/logger-options.js";
import type { MetricsRegistry } from "../observability/metrics.js";
import type { ReadinessState } from "../observability/readiness-monitor.js";
import { routeRateLimit } from "../security/rate-limits.js";

const UNAUTHORIZED = { error: "Unauthorized." } as const;
const NOT_CHECKED: ReadinessState = { ready: null, lastFailureReason: null, since: null };

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time comparison of `Authorization: Bearer <token>` (hashes make lengths equal). */
function hasToken(request: FastifyRequest, expected: Buffer): boolean {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return false;
  }
  return timingSafeEqual(digest(header.slice("Bearer ".length)), expected);
}

/**
 * GET /internal/metrics (M18, ADR-029): the process's aggregates as JSON, for an operator (curl)
 * or a future scraper. Registered **only when METRICS_TOKEN is set**, so by default it does not
 * exist; with it, only a bearer of the token gets an answer. Everything in it is counts, route
 * templates, bounded categories and the public release id — no user data, no configuration.
 * Values are per process and reset on restart.
 */
export function registerMetricsRoute(
  app: FastifyInstance,
  deps: {
    env: AppEnv;
    metrics: MetricsRegistry;
    readiness?: () => ReadinessState;
    databaseStats: () => SharedPoolStats;
  },
): void {
  const { env } = deps;
  if (!env.METRICS_TOKEN) {
    return;
  }
  const expected = digest(env.METRICS_TOKEN);
  const startedAt = Date.now();

  app.get(
    "/internal/metrics",
    { config: { rateLimit: routeRateLimit(env, 60, "1 minute") } },
    async (request, reply) => {
      if (!hasToken(request, expected)) {
        return reply.code(401).send(UNAUTHORIZED);
      }
      const memory = process.memoryUsage();
      return {
        service: LOG_SERVICE_NAME,
        env: env.NODE_ENV,
        version: env.APP_VERSION,
        generatedAt: new Date().toISOString(),
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        process: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed },
        readiness: deps.readiness?.() ?? NOT_CHECKED,
        database: deps.databaseStats(),
        ...deps.metrics.snapshot(),
      };
    },
  );
}
