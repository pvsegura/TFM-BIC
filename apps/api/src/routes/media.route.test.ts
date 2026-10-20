import { loadEnv } from "@tfm-bic/config";
import {
  makeContentItem,
  makeLanguageLevel,
  makeVocabularyCatalog,
} from "@tfm-bic/application/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/**
 * The media endpoints apply the same visibility rule as the content they belong to: a lesson's
 * media is served only while the lesson itself is visible (published, active language, available
 * level), a word's only while the word is.
 */
function build(options: { polishActive?: boolean } = {}) {
  const testDeps = buildTestDeps(NOW);
  const catalog = makeVocabularyCatalog();
  catalog.languageLevels = [...catalog.languageLevels, makeLanguageLevel("pl", "b1", "planned")];
  catalog.content = [...catalog.content, makeContentItem("pl-planned-level", "pl", "b1")];
  catalog.languages = catalog.languages.map((language) =>
    language.code === "pl" ? { ...language, isActive: options.polishActive ?? true } : language,
  );
  testDeps.contentRepository.catalog = catalog;
  testDeps.vocabularyRepository.categories = [...catalog.vocabularyCategories];
  testDeps.vocabularyRepository.items = [...catalog.vocabulary];
  app = buildServer(
    loadEnv({
      NODE_ENV: "test",
      APP_BASE_URL: "https://app.example.com",
      AUTH_SESSION_SECRET: "test-secret-value",
    }),
    testDeps.appDeps,
  );
  return app;
}

function get(server: FastifyInstance, url: string) {
  return server.inject({ method: "GET", url });
}

describe("GET /media/lessons/:lessonId", () => {
  it("answers for a visible lesson, with no video when none is published yet", async () => {
    const response = await get(build(), "/media/lessons/pl-first");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      contentType: "lesson",
      contentId: "pl-first",
      video: null,
      audio: [],
    });
  });

  it.each([
    ["a draft lesson", "pl-draft"],
    ["an unknown lesson", "pl-nope"],
    ["a lesson in a level that is not available", "pl-planned-level"],
  ])("is 404 for %s", async (_, lessonId) => {
    const response = await get(build(), `/media/lessons/${lessonId}`);

    expect(response.statusCode).toBe(404);
  });

  it("is 404 for a published lesson of an inactive language", async () => {
    const response = await get(build({ polishActive: false }), "/media/lessons/pl-first");

    expect(response.statusCode).toBe(404);
  });

  it("rejects a malformed id", async () => {
    const response = await get(build(), "/media/lessons/Not_An_Id");

    expect(response.statusCode).toBe(400);
  });
});

describe("GET /media/vocabulary/:vocabularyId", () => {
  it("answers for a visible word", async () => {
    const response = await get(build(), "/media/vocabulary/pl-dom");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ contentType: "vocabulary-item", contentId: "pl-dom" });
  });

  it("is 404 for a published word of an inactive language", async () => {
    const response = await get(build({ polishActive: false }), "/media/vocabulary/pl-dom");

    expect(response.statusCode).toBe(404);
  });
});

describe("GET /media/grammar/:topicId", () => {
  it("is 404 when there is no grammar reference", async () => {
    const response = await get(build(), "/media/grammar/pl-cases");

    expect(response.statusCode).toBe(404);
  });
});
