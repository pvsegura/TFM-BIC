import type { GetHealthStatusUseCase } from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { healthResponseSchema } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";

/**
 * Thin controller: parse nothing (GET, no input), call the use case, shape
 * the response against the shared contract. No business logic here — see
 * .claude/skills/node-typescript.
 */
export function registerHealthRoutes(
  app: FastifyInstance,
  deps: {
    useCase: GetHealthStatusUseCase;
    env: AppEnv;
    /** Whether the database can serve queries now (M17). Must not throw — a throw is "not ready". */
    isReady: () => Promise<boolean>;
  },
): void {
  // Liveness: cheap, and independent of the database and every provider — a slow dependency must
  // never get a healthy process restarted.
  app.get("/health", () => {
    const result = deps.useCase.execute({
      defaultLanguage: deps.env.DEFAULT_LANGUAGE,
      version: deps.env.APP_VERSION,
    });
    return healthResponseSchema.parse(result);
  });

  // Readiness (M17): can this instance serve requests that need the database? Providers (email,
  // audio, video) are not checked — their failures are handled per request, and an outage of one
  // must not take the whole application out of rotation. The reason is never disclosed.
  app.get("/ready", async (_request, reply) => {
    const ready = await deps.isReady().catch(() => false);
    return reply.code(ready ? 200 : 503).send({ ready });
  });
}
