import type { AppEnv } from "@tfm-bic/config";
import { clientErrorReportSchema } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";

import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import type { MetricsRegistry } from "../observability/metrics.js";
import { routeRateLimit } from "../security/rate-limits.js";

/** Anything the schema allows is far smaller. */
const BODY_LIMIT_BYTES = 1024;

/**
 * POST /client-errors (M18, ADR-029): the SPA reports an error it could not handle, so frontend
 * failures show up in the same log stream as the API's. Public (errors happen before login too),
 * same-origin only, rate limited per address, and the body is a closed contract with no free
 * text — see `clientErrorReportSchema`. Nothing is stored; one `client.error` line is written.
 */
export function registerClientErrorRoutes(
  app: FastifyInstance,
  deps: { env: AppEnv; metrics: MetricsRegistry },
): void {
  const verifyOrigin = createVerifyOriginHook(deps.env.APP_BASE_URL);

  app.post(
    "/client-errors",
    {
      preHandler: [verifyOrigin],
      bodyLimit: BODY_LIMIT_BYTES,
      config: { rateLimit: routeRateLimit(deps.env, 10, "1 minute") },
    },
    async (request, reply) => {
      const report = clientErrorReportSchema.safeParse(request.body);
      if (!report.success) {
        return reply.code(400).send({ error: "Invalid request." });
      }
      deps.metrics.increment("client_errors_total", { kind: report.data.kind });
      request.log.warn(report.data, "client.error");
      return reply.code(204).send();
    },
  );
}
