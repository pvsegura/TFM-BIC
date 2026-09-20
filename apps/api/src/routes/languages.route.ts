import type { AppEnv } from "@tfm-bic/config";
import {
  languageCodeParamSchema,
  languageLevelsResponseSchema,
  languagesResponseSchema,
} from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";

import type { ContentUseCases } from "../composition/content-use-cases.js";
import { mapCatalogError } from "./catalog-error.mapper.js";
import { publicRateLimit } from "./public-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/**
 * Language and level discovery — public and read-only (ADR-018): the catalog
 * is not personal data, and browsing what can be learned should not require an
 * account. One generic route set for every language; nothing here knows any
 * language code. Responses are parsed through allowlisting schemas, so no
 * internal metadata can be serialized.
 */
export function registerLanguageRoutes(
  app: FastifyInstance,
  deps: { useCases: ContentUseCases; env: AppEnv },
): void {
  const { useCases, env } = deps;
  const config = { rateLimit: publicRateLimit(env) };

  app.get("/languages", { config }, async () => {
    const languages = await useCases.listLanguages.execute();
    return languagesResponseSchema.parse({ languages });
  });

  app.get("/languages/:languageCode/levels", { config }, async (request, reply) => {
    const params = languageCodeParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const result = await useCases.listLanguageLevels.execute({
        languageId: params.data.languageCode,
      });
      return languageLevelsResponseSchema.parse(result);
    } catch (error) {
      const mapped = mapCatalogError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });
}
