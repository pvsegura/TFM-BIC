import type { BookIndexRepository } from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import { bookCourseParamSchema, bookIndexSchema } from "@verbysia/contracts";
import type { FastifyInstance } from "fastify";

import { publicRateLimit } from "./public-rate-limit.js";
import { INVALID_REQUEST } from "./route-helpers.js";

/**
 * `GET /books/:course` — page numbers of the course's printed books, so the web can say
 * "Podręcznik s. 42 · Zeszyt s. 27". Public like the catalog: page numbers are not personal and
 * reveal no paid content.
 */
export function registerBookRoutes(
  app: FastifyInstance,
  deps: { books: BookIndexRepository; env: AppEnv },
): void {
  app.get(
    "/books/:course",
    { config: { rateLimit: publicRateLimit(deps.env) } },
    async (request, reply) => {
      const params = bookCourseParamSchema.safeParse(request.params);
      if (!params.success) return reply.code(400).send(INVALID_REQUEST);
      const index = await deps.books.find(params.data.course);
      if (!index) return reply.code(404).send({ error: "No book for this course." });
      return reply
        .header("cache-control", "public, max-age=3600")
        .send(bookIndexSchema.parse(index));
    },
  );
}
