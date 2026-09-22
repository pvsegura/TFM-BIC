import type {
  VocabularyCategoriesResult,
  VocabularyCategoryView,
  VocabularyItemDetail,
  VocabularyListEntry,
  VocabularyListResult,
  VocabularyUserStateView,
  ResolveSessionUseCase,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  userVocabularyQuerySchema,
  vocabularyActionRequestSchema,
  vocabularyCategoriesQuerySchema,
  vocabularyCategoriesResponseSchema,
  vocabularyIdParamSchema,
  vocabularyItemResponseSchema,
  vocabularyListQuerySchema,
  vocabularyListResponseSchema,
  vocabularyStatusRequestSchema,
  vocabularyUserStateResponseSchema,
  type VocabularyItemResponse,
  type VocabularyUserStateResponse,
} from "@tfm-bic/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { VocabularyUseCases } from "../composition/vocabulary-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { createVerifyOriginHook } from "../hooks/verify-origin.js";
import { mapVocabularyError } from "./vocabulary-error.mapper.js";
import { vocabularyReadRateLimit, vocabularyWriteRateLimit } from "./vocabulary-rate-limit.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/** `save`, `unsave`, `learned` and the status body together are at most a handful of bytes;
 * anything bigger is rejected (413) before it is parsed. */
const ACTION_BODY_LIMIT_BYTES = 1024;

/** Vocabulary state is per student, so no shared cache (browser, proxy or CDN) may keep any of it. */
function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The student the request is for — always the session's, set by `authenticate`. */
function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs. Failing loudly beats
    // carrying on with no identity.
    throw new Error("A vocabulary handler ran without an authenticated user.");
  }
  return user.id;
}

function toUserStateResponse(state: VocabularyUserStateView): VocabularyUserStateResponse {
  return vocabularyUserStateResponseSchema.parse({
    status: state.status,
    createdAt: state.createdAt?.toISOString() ?? null,
    updatedAt: state.updatedAt?.toISOString() ?? null,
    learnedAt: state.learnedAt?.toISOString() ?? null,
  });
}

function toEntryResponse(entry: {
  item: VocabularyListEntry["item"];
  category: VocabularyListEntry["category"];
  userState: VocabularyUserStateView;
}): VocabularyItemResponse {
  // Parsed through the allowlisting response schema: only the fields it names — never a status,
  // a category id beyond `id`/`title`, or anything else a domain object might carry — can leave
  // the API.
  return vocabularyItemResponseSchema.parse({
    ...entry.item,
    category: entry.category,
    userState: toUserStateResponse(entry.userState),
  });
}

function toListResponse({ items, total, nextAfter }: VocabularyListResult) {
  return vocabularyListResponseSchema.parse({
    items: items.map(toEntryResponse),
    total,
    nextAfter,
  });
}

function toCategoryResponse(category: VocabularyCategoryView) {
  return {
    id: category.id,
    languageId: category.languageId,
    title: category.title,
    description: category.description,
    instructionLanguage: category.instructionLanguage,
    progress: category.progress,
  };
}

function toCategoriesResponse({ categories, progress }: VocabularyCategoriesResult) {
  return vocabularyCategoriesResponseSchema.parse({
    categories: categories.map(toCategoryResponse),
    progress,
  });
}

function toDetailResponse({
  item,
  category,
  userState,
}: VocabularyItemDetail): VocabularyItemResponse {
  return toEntryResponse({ item, category, userState });
}

/**
 * The student vocabulary experience (M9) — authenticated-only, and generic: one set of routes for
 * every language. An entry is content grouped in a category of its own language (ADR-022); only
 * the student's own relationship to it is stored.
 *
 * - `GET /vocabulary?language=&level=&category=&status=&q=&limit=&after=` — entries a student may
 *   browse, with their own state, one page at a time.
 * - `GET /vocabulary/categories?language=` — the language's topics with progress per topic and
 *   overall.
 * - `GET /vocabulary/:vocabularyId` — one entry with its category title and the caller's state.
 * - `GET /user-vocabulary?language=&level=&category=&status=&q=&limit=&after=` — "My Vocabulary":
 *   only words the student has touched.
 * - `POST /vocabulary/:vocabularyId/save` — puts the word on the list (idempotent).
 * - `POST /vocabulary/:vocabularyId/unsave` — takes it off the list (idempotent; the only way back
 *   to `new`).
 * - `POST /vocabulary/:vocabularyId/learned` — marks it known (idempotent; never refused).
 * - `PUT /vocabulary/:vocabularyId/status` — sets `saved`, `learning` or `learned` directly; a step
 *   the domain refuses is a `409`, and the record is left untouched.
 *
 * The user is always the session's, never a URL/query/body value. There is no route that creates,
 * edits or publishes an entry, and none that reads or changes another student's state.
 */
export function registerVocabularyRoutes(
  app: FastifyInstance,
  deps: { useCases: VocabularyUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const verifyOrigin = createVerifyOriginHook(env.APP_BASE_URL);
  const authenticate = createAuthenticateHook(resolveSession);
  const readConfig = { config: { rateLimit: vocabularyReadRateLimit(env) } };
  const writeConfig = {
    config: { rateLimit: vocabularyWriteRateLimit(env) },
    bodyLimit: ACTION_BODY_LIMIT_BYTES,
  };

  app.get("/vocabulary", { ...readConfig, preHandler: [authenticate] }, async (request, reply) => {
    const query = vocabularyListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const result = await useCases.listVocabulary.execute({
        userId: sessionUserId(request),
        languageId: query.data.language,
        levelId: query.data.level,
        categoryId: query.data.category,
        status: query.data.status,
        q: query.data.q,
        limit: query.data.limit,
        after: query.data.after,
      });
      noStore(reply);
      return toListResponse(result);
    } catch (error) {
      const mapped = mapVocabularyError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  app.get(
    "/vocabulary/categories",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const query = vocabularyCategoriesQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const result = await useCases.listVocabularyCategories.execute({
          userId: sessionUserId(request),
          languageId: query.data.language,
        });
        noStore(reply);
        return toCategoriesResponse(result);
      } catch (error) {
        const mapped = mapVocabularyError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.get(
    "/vocabulary/:vocabularyId",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const params = vocabularyIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const detail = await useCases.getVocabularyItem.execute({
          userId: sessionUserId(request),
          vocabularyItemId: params.data.vocabularyId,
        });
        noStore(reply);
        return toDetailResponse(detail);
      } catch (error) {
        const mapped = mapVocabularyError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  app.get(
    "/user-vocabulary",
    { ...readConfig, preHandler: [authenticate] },
    async (request, reply) => {
      const query = userVocabularyQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      try {
        const result = await useCases.listUserVocabulary.execute({
          userId: sessionUserId(request),
          languageId: query.data.language,
          levelId: query.data.level,
          categoryId: query.data.category,
          status: query.data.status,
          q: query.data.q,
          limit: query.data.limit,
          after: query.data.after,
        });
        noStore(reply);
        return toListResponse(result);
      } catch (error) {
        const mapped = mapVocabularyError(error);
        return reply.code(mapped.statusCode).send(mapped.body);
      }
    },
  );

  /** The client controls nothing but which entry: a body naming a user, a time or a status is
   * refused, not silently ignored. */
  function parseAction(request: FastifyRequest) {
    const params = vocabularyIdParamSchema.safeParse(request.params);
    const body = vocabularyActionRequestSchema.safeParse(request.body);
    return params.success && body.success ? params.data.vocabularyId : null;
  }

  const actionRoute = { ...writeConfig, preHandler: [verifyOrigin, authenticate] };

  app.post("/vocabulary/:vocabularyId/save", actionRoute, async (request, reply) => {
    const vocabularyItemId = parseAction(request);
    if (vocabularyItemId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const state = await useCases.saveVocabularyItem.execute({
        userId: sessionUserId(request),
        vocabularyItemId,
      });
      noStore(reply);
      return toUserStateResponse(state);
    } catch (error) {
      const mapped = mapVocabularyError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  app.post("/vocabulary/:vocabularyId/unsave", actionRoute, async (request, reply) => {
    const vocabularyItemId = parseAction(request);
    if (vocabularyItemId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    const state = await useCases.unsaveVocabularyItem.execute({
      userId: sessionUserId(request),
      vocabularyItemId,
    });
    noStore(reply);
    return toUserStateResponse(state);
  });

  app.post("/vocabulary/:vocabularyId/learned", actionRoute, async (request, reply) => {
    const vocabularyItemId = parseAction(request);
    if (vocabularyItemId === null) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const state = await useCases.markVocabularyItemLearned.execute({
        userId: sessionUserId(request),
        vocabularyItemId,
      });
      noStore(reply);
      return toUserStateResponse(state);
    } catch (error) {
      const mapped = mapVocabularyError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });

  app.put("/vocabulary/:vocabularyId/status", actionRoute, async (request, reply) => {
    const params = vocabularyIdParamSchema.safeParse(request.params);
    const body = vocabularyStatusRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send(INVALID_REQUEST);
    }

    try {
      const state = await useCases.updateVocabularyStatus.execute({
        userId: sessionUserId(request),
        vocabularyItemId: params.data.vocabularyId,
        status: body.data.status,
      });
      noStore(reply);
      return toUserStateResponse(state);
    } catch (error) {
      const mapped = mapVocabularyError(error);
      return reply.code(mapped.statusCode).send(mapped.body);
    }
  });
}
