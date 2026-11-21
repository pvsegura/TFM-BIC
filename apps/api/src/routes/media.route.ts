import { createReadStream } from "node:fs";

import type { ContentMediaCatalog } from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import {
  contentMediaResponseSchema,
  grammarTopicParamSchema,
  lessonIdParamSchema,
  mediaIndexResponseSchema,
  vocabularyIdParamSchema,
  type ContentMediaResponse,
} from "@verbysia/contracts";
import type { ServableMediaFile } from "@verbysia/data";
import {
  ContentMediaNotFoundError,
  type ContentMedia,
  type MediaContentType,
} from "@verbysia/domain";
import type { FastifyInstance, FastifyReply } from "fastify";

import type { ContentDependencies } from "../composition/content-dependencies.js";
import type { ContentUseCases } from "../composition/content-use-cases.js";
import { publicRateLimit } from "./public-rate-limit.js";
import { routeRateLimit } from "../security/rate-limits.js";
import { INVALID_REQUEST } from "./route-helpers.js";

const NOT_FOUND = { error: "Not found." } as const;
/** Seeking a video issues many small range requests; generous, but still bounded per client. */
const MEDIA_FILE_REQUESTS_PER_MINUTE = 600;

interface MediaCatalog extends ContentMediaCatalog {
  files: ReadonlyMap<string, ServableMediaFile>;
}

const EMPTY_CATALOG: MediaCatalog = { find: () => undefined, list: () => [], files: new Map() };

function toResponse(
  type: MediaContentType,
  id: string,
  media: ContentMedia | undefined,
): ContentMediaResponse {
  // Parsed through the allowlisting response schema: nothing the manifest carries for operators
  // (provider, model, hashes, errors) can reach the browser.
  return contentMediaResponseSchema.parse({
    contentType: type,
    contentId: id,
    video: media?.video ?? null,
    audio: media?.audio ?? [],
  });
}

/** Parses a single `bytes=` range (the only form browsers send for media). */
export function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : null;
}

function sendFile(reply: FastifyReply, file: ServableMediaFile, rangeHeader: string | undefined) {
  void reply
    .header("Content-Type", file.contentType)
    .header("Accept-Ranges", "bytes")
    // File names carry a content hash (ADR-031): a URL's bytes never change, so cache forever.
    .header("Cache-Control", "public, max-age=31536000, immutable");

  if (rangeHeader) {
    const range = parseRange(rangeHeader, file.size);
    if (!range) {
      return reply
        .code(416)
        .header("Content-Range", `bytes */${String(file.size)}`)
        .send();
    }
    return reply
      .code(206)
      .header(
        "Content-Range",
        `bytes ${String(range.start)}-${String(range.end)}/${String(file.size)}`,
      )
      .header("Content-Length", String(range.end - range.start + 1))
      .send(createReadStream(file.absolutePath, { start: range.start, end: range.end }));
  }
  return reply
    .header("Content-Length", String(file.size))
    .send(createReadStream(file.absolutePath));
}

/**
 * Published educational media (M21, ADR-031) — public and read-only, like the content catalog it
 * belongs to (the same lessons and words are public at /learn). Nothing here generates anything:
 * media is produced offline by the operator pipeline, so no request can cause a provider call.
 *
 *   GET /media                          which content has video/audio (lists, badges)
 *   GET /media/lessons/:lessonId        a lesson's published video
 *   GET /media/vocabulary/:vocabularyId a word's video and pronunciation clips
 *   GET /media/files/*                  a published file — only paths listed in the manifest
 *
 * Media of content a student cannot see is not served: each metadata request goes through
 * `GetContentMediaUseCase`, the same visibility rule as the content's own endpoint.
 */
export function registerMediaRoutes(
  app: FastifyInstance,
  deps: { content: ContentDependencies; useCases: ContentUseCases; env: AppEnv },
): void {
  const catalog: MediaCatalog = deps.content.mediaCatalog ?? EMPTY_CATALOG;
  const config = { rateLimit: publicRateLimit(deps.env) };
  const cacheShort = (reply: FastifyReply) =>
    void reply.header("Cache-Control", "public, max-age=300");

  app.get("/media", { config }, async (_request, reply) => {
    cacheShort(reply);
    return mediaIndexResponseSchema.parse({
      items: catalog.list().map((media) => ({
        contentType: media.content.type,
        contentId: media.content.id,
        hasVideo: media.video !== undefined,
        hasAudio: media.audio.length > 0,
        durationSeconds: media.video?.durationSeconds ?? null,
        posterUrl: media.video?.posterUrl ?? null,
        narrator: media.video?.narrator ?? null,
        targetVocabularyIds: media.video?.targetVocabularyIds ?? [],
        pronunciationUrl: media.audio.find((clip) => clip.purpose === "pronunciation")?.url ?? null,
      })),
    });
  });

  /** A visible item's media — or 404, whatever the reason it is not visible. */
  async function sendContentMedia(
    reply: FastifyReply,
    type: MediaContentType,
    id: string,
  ): Promise<ContentMediaResponse | FastifyReply> {
    try {
      const media = await deps.useCases.getContentMedia.execute({ type, id });
      cacheShort(reply);
      return toResponse(type, id, media);
    } catch (error) {
      if (error instanceof ContentMediaNotFoundError) return reply.code(404).send(NOT_FOUND);
      throw error;
    }
  }

  app.get("/media/lessons/:lessonId", { config }, async (request, reply) => {
    const params = lessonIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send(INVALID_REQUEST);
    return sendContentMedia(reply, "lesson", params.data.lessonId);
  });

  app.get("/media/vocabulary/:vocabularyId", { config }, async (request, reply) => {
    const params = vocabularyIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send(INVALID_REQUEST);
    return sendContentMedia(reply, "vocabulary-item", params.data.vocabularyId);
  });

  app.get("/media/grammar/:topicId", { config }, async (request, reply) => {
    const params = grammarTopicParamSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send(INVALID_REQUEST);
    return sendContentMedia(reply, "grammar-topic", params.data.topicId);
  });

  app.get(
    "/media/files/*",
    { config: { rateLimit: routeRateLimit(deps.env, MEDIA_FILE_REQUESTS_PER_MINUTE, "1 minute") } },
    async (request, reply) => {
      let relative: string;
      try {
        relative = decodeURIComponent((request.params as { "*": string })["*"]);
      } catch {
        return reply.code(400).send(INVALID_REQUEST);
      }
      // Allowlist lookup only — the URL never becomes a filesystem path.
      const file = catalog.files.get(relative);
      if (!file) return reply.code(404).send(NOT_FOUND);
      return sendFile(reply, file, request.headers.range);
    },
  );
}
