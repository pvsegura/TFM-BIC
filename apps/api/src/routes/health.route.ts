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
  deps: { useCase: GetHealthStatusUseCase; env: AppEnv },
): void {
  app.get("/health", () => {
    const result = deps.useCase.execute({ defaultLanguage: deps.env.DEFAULT_LANGUAGE });
    return healthResponseSchema.parse(result);
  });

  app.get("/ready", () => ({ ready: true }));
}
