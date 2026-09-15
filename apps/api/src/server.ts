import { GetHealthStatusUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { SystemClock } from "@tfm-bic/data";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import { registerHealthRoutes } from "./routes/health.route.js";

export function buildServer(env: AppEnv): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      // Never log secrets/PII — see docs/security/security-baseline.md.
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });

  const useCase = new GetHealthStatusUseCase(new SystemClock());
  registerHealthRoutes(app, { useCase, env });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    /* v8 ignore next -- @preserve: defensive fallback for Fastify's own
       internal errors (e.g. malformed request bodies), which set
       error.statusCode; every error M1's own route/use-case code can throw
       is a plain Error with no statusCode, so only the `?? 500` side is
       reachable from today's two GET routes. Full 4xx-vs-5xx handling
       (and hiding internal error.message on 5xx) is deferred until a route
       actually produces client input errors worth distinguishing. */
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({ error: "Internal Server Error" });
  });

  return app;
}
