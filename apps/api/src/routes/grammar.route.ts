import type { AppEnv } from "@verbysia/config";
import {
  grammarListQuerySchema,
  grammarListResponseSchema,
  grammarTopicParamSchema,
  grammarTopicResponseSchema,
} from "@verbysia/contracts";
import { GrammarTopicNotFoundError, type GrammarTopic } from "@verbysia/domain";
import type { FastifyInstance } from "fastify";

import type { ContentUseCases } from "../composition/content-use-cases.js";
import { publicRateLimit } from "./public-rate-limit.js";
import { INVALID_REQUEST } from "./route-helpers.js";

const NOT_FOUND = { error: "Grammar topic not found." } as const;

function summary(topic: GrammarTopic) {
  return {
    id: topic.id,
    languageId: topic.languageId,
    category: topic.category,
    ...(topic.levelId ? { levelId: topic.levelId } : {}),
    title: topic.title,
    description: topic.description,
  };
}

/**
 * The grammar reference (M23) — public and read-only, like the catalog (ADR-018): reference
 * tables are not personal data and no progress is kept, so no session is needed. One generic
 * route set for every language. Responses go through allowlisting schemas (no status, no order).
 */
export function registerGrammarRoutes(
  app: FastifyInstance,
  deps: { useCases: ContentUseCases; env: AppEnv },
): void {
  const { listGrammarTopics: list, getGrammarTopic: get } = deps.useCases;
  const config = { rateLimit: publicRateLimit(deps.env) };

  app.get("/grammar", { config }, async (request, reply) => {
    const query = grammarListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }
    const topics = await list.execute({ languageId: query.data.language });
    return grammarListResponseSchema.parse({ topics: topics.map(summary) });
  });

  app.get("/grammar/:topicId", { config }, async (request, reply) => {
    const params = grammarTopicParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(404).send(NOT_FOUND);
    }
    try {
      const topic = await get.execute({ topicId: params.data.topicId });
      return grammarTopicResponseSchema.parse({
        ...summary(topic),
        instructionLanguage: topic.instructionLanguage,
        sections: topic.sections,
      });
    } catch (error) {
      if (error instanceof GrammarTopicNotFoundError) {
        return reply.code(404).send(NOT_FOUND);
      }
      throw error;
    }
  });
}
