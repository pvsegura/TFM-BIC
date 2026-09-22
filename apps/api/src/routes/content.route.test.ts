import { loadEnv } from "@tfm-bic/config";
import type { ContentListResponse, ContentResponse } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps();
  app = buildServer(
    loadEnv({ NODE_ENV: "test", AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.deps,
    testDeps.profileDeps,
    testDeps.contentDeps,
    testDeps.lessonDeps,
    testDeps.exerciseDeps,
    testDeps.gamificationDeps,
    testDeps.vocabularyDeps,
  );
  return { app, ...testDeps };
}

const list = (app: FastifyInstance, query: string) =>
  app.inject({ method: "GET", url: `/content${query}` });

describe("GET /content?language=&level=", () => {
  it("is public and lists published items in explicit order", async () => {
    const { app } = build();

    const response = await list(app, "?language=pl&level=a1");

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toBeUndefined();
    const body = response.json<ContentListResponse>();
    // The repository holds pl-second (order 20) before pl-first (order 10).
    expect(body.items.map((i) => i.id)).toEqual(["pl-first", "pl-second"]);
  });

  it("returns summaries only: no bodies, no status, nothing internal", async () => {
    const { app } = build();

    const body = (await list(app, "?language=pl&level=a1")).json<ContentListResponse>();

    expect(Object.keys(body.items[0] ?? {}).sort()).toEqual([
      "description",
      "id",
      "instructionLanguage",
      "languageId",
      "levelId",
      "order",
      "title",
      "type",
    ]);
  });

  it("never exposes draft or archived content", async () => {
    const { app } = build();

    const response = await list(app, "?language=pl&level=a1");

    expect(response.body).not.toContain("pl-draft");
    expect(response.body).not.toContain("pl-archived");
  });

  it("serves a language that exists only as catalog data, through the same route", async () => {
    const { app } = build();

    const body = (await list(app, "?language=xx&level=a1")).json<ContentListResponse>();

    expect(body.items.map((i) => i.id)).toEqual(["xx-only"]);
  });

  it("ignores unrelated query parameters", async () => {
    const { app } = build();

    const response = await list(app, "?language=pl&level=a1&utm_source=x");

    expect(response.statusCode).toBe(200);
  });

  it.each([
    ["no parameters", ""],
    ["no level", "?language=pl"],
    ["no language", "?level=a1"],
    ["an unknown level id", "?language=pl&level=a3"],
    ["an uppercase level", "?language=pl&level=A1"],
    ["a malformed language", "?language=Polish&level=a1"],
    ["a repeated language parameter", "?language=pl&language=xx&level=a1"],
    ["an injection-shaped language", "?language=pl%27%20OR%20%271%27%3D%271&level=a1"],
    ["a script-shaped level", "?language=pl&level=%3Cscript%3E"],
    ["an oversized value", `?language=${"a".repeat(5000)}&level=a1`],
  ])("is a 400 for %s, without echoing the input", async (_label, query) => {
    const { app } = build();

    const response = await list(app, query);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });

  it("is a 404 for a well-formed but unknown language", async () => {
    const { app } = build();

    const response = await list(app, "?language=zz&level=a1");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Language not found." });
  });

  it("is a 404 for a planned level: unavailable combinations are not selectable", async () => {
    const { app } = build();

    const response = await list(app, "?language=pl&level=a2");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Level not available." });
  });

  it("is a 404 for a level the language does not declare", async () => {
    const { app } = build();

    expect((await list(app, "?language=pl&level=c2")).statusCode).toBe(404);
  });

  it("returns a generic 500 and leaks nothing when the repository fails", async () => {
    const { app, contentRepository } = build();
    contentRepository.listContent = () =>
      Promise.reject(new Error("disk path /srv/content/secret"));

    const response = await list(app, "?language=pl&level=a1");

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /content/:contentId", () => {
  it("returns a published item with its structured blocks", async () => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: "/content/pl-first" });

    expect(response.statusCode).toBe(200);
    const body = response.json<ContentResponse>();
    expect(body.id).toBe("pl-first");
    expect(body.blocks).toEqual([{ type: "explanation", text: "Body of pl-first" }]);
  });

  it("does not expose the item's status or any other internal field", async () => {
    const { app } = build();

    const body = (await app.inject({ method: "GET", url: "/content/pl-first" })).json<
      Record<string, unknown>
    >();

    expect(Object.keys(body).sort()).toEqual([
      "blocks",
      "description",
      "id",
      "instructionLanguage",
      "languageId",
      "levelId",
      "order",
      "title",
      "type",
    ]);
  });

  it.each(["pl-draft", "pl-archived", "pl-later", "pl-does-not-exist"])(
    "is a 404 for %s: unpublished and missing content look identical",
    async (id) => {
      const { app } = build();

      const response = await app.inject({ method: "GET", url: `/content/${id}` });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Content not found." });
    },
  );

  it("is a 404 when the item's language has been switched off", async () => {
    const { app, contentRepository } = build();
    contentRepository.catalog = {
      ...contentRepository.catalog,
      languages: contentRepository.catalog.languages.map((l) =>
        l.code === "xx" ? { ...l, isActive: false } : l,
      ),
    };

    expect((await app.inject({ method: "GET", url: "/content/xx-only" })).statusCode).toBe(404);
  });

  it.each([
    "PL-FIRST",
    "pl_first",
    "1pl",
    "pl--x",
    "%3Cscript%3E",
    "pl%27%20OR%20%271",
    `pl-${"a".repeat(80)}`,
  ])("is a 400 for the malformed id %s", async (id) => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: `/content/${id}` });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });

  it("never lets a path-traversal-shaped id reach anything", async () => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: "/content/..%2F..%2Fpackage.json" });

    expect([400, 404]).toContain(response.statusCode);
    expect(response.body).not.toContain("tfm-bic");
  });

  it("serializes ordinary punctuation as inert JSON string data, unchanged", async () => {
    const { app, contentRepository } = build();
    const [first] = contentRepository.catalog.content;
    if (!first) throw new Error("fixture missing");
    const text = '5 < 6 & 7 > 3, "quoted"';
    const item = { ...first, blocks: [{ type: "explanation" as const, text }] };
    contentRepository.catalog = { ...contentRepository.catalog, content: [item] };

    const response = await app.inject({ method: "GET", url: `/content/${first.id}` });

    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json<ContentResponse>().blocks[0]).toEqual({ type: "explanation", text });
  });

  it("fails closed rather than serialize markup, even if it somehow reached the repository", async () => {
    const { app, contentRepository } = build();
    const [first] = contentRepository.catalog.content;
    if (!first) throw new Error("fixture missing");
    const hostile = {
      ...first,
      blocks: [{ type: "explanation" as const, text: "<img src=x onerror=alert(1)>" }],
    };
    contentRepository.catalog = { ...contentRepository.catalog, content: [hostile] };

    const response = await app.inject({ method: "GET", url: `/content/${first.id}` });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("onerror");
  });

  it("fails closed rather than serialize a block type the contract does not know", async () => {
    const { app, contentRepository } = build();
    const [first] = contentRepository.catalog.content;
    if (!first) throw new Error("fixture missing");
    const unknown = {
      ...first,
      blocks: [{ type: "script", code: "alert(1)" }],
    } as unknown as typeof first;
    contentRepository.catalog = { ...contentRepository.catalog, content: [unknown] };

    const response = await app.inject({ method: "GET", url: `/content/${first.id}` });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("alert");
  });
});
