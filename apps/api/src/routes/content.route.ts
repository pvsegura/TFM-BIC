import type { AppEnv } from "@tfm-bic/config";
import {
  contentIdParamSchema,
  contentListQuerySchema,
  contentListResponseSchema,
  contentResponseSchema,
} from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";

import type { ContentUseCases } from "../composition/content-use-cases.js";
import { mapCatalogError } from "./catalog-error.mapper.js";
import { publicRateLimit } from "./public-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/**
 * Content discovery — public and read-only (ADR-018). Only published content
 * of an available language and level is ever returned, and the request never
 * chooses a file path: ids and codes are validated against strict patterns,
 * then looked up in memory.
 *
 * - `GET /content?language=&level=` — summaries (no bodies) in explicit order.
 * - `GET /content/:contentId` — one item with its structured blocks.
 */
export function registerContentRoutes(
  app: FastifyInstance,
  deps: { useCases: ContentUseCases; env: AppEnv },
): void {
  const { useCases, env } = deps;
  const config = { rateLimit: publicRateLimit(env) };

  app.get("/content", { config }, async (request, reply) => {
    const query = contentListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const items = await useCases.listContent.execute({
        languageId: query.data.language,
        levelId: query.data.level,
      });
      return contentListResponseSchema.parse({ items });
    } catch (error) {
      const mapped = mapCatalogError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  app.get("/content/:contentId", { config }, async (request, reply) => {
    const params = contentIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const item = await useCases.getContent.execute({ contentId: params.data.contentId });
      return contentResponseSchema.parse(item);
    } catch (error) {
      const mapped = mapCatalogError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });
}
