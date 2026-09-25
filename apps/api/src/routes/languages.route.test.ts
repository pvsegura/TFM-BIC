import { loadEnv } from "@tfm-bic/config";
import type { LanguageLevelsResponse, LanguagesResponse } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(env: Record<string, string> = {}) {
  const testDeps = buildTestDeps();
  app = buildServer(
    loadEnv({ NODE_ENV: "test", AUTH_SESSION_SECRET: "test-secret-value", ...env }),
    testDeps.deps,
    testDeps.profileDeps,
    testDeps.contentDeps,
    testDeps.lessonDeps,
    testDeps.exerciseDeps,
    testDeps.gamificationDeps,
    testDeps.vocabularyDeps,
    testDeps.phoneticsDeps,
    testDeps.videoDeps,
    testDeps.audioDeps,
  );
  return { app, ...testDeps };
}

describe("GET /languages", () => {
  it("is public: an anonymous caller gets the language catalog", async () => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: "/languages" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toBeUndefined();
    const body = response.json<LanguagesResponse>();
    expect(body.languages.map((l) => l.code)).toEqual(["pl", "xx"]);
  });

  it("exposes only the public language fields — no isActive or other internal metadata", async () => {
    const { app } = build();

    const body = (await app.inject({ method: "GET", url: "/languages" })).json<LanguagesResponse>();

    expect(Object.keys(body.languages[0] ?? {}).sort()).toEqual([
      "code",
      "direction",
      "locale",
      "name",
      "nativeName",
    ]);
    expect(body.languages[0]).toEqual({
      code: "pl",
      name: "Polish",
      nativeName: "polski",
      locale: "pl-PL",
      direction: "ltr",
    });
  });

  it("never lists an inactive language", async () => {
    const { app, contentRepository } = build();
    contentRepository.catalog = {
      ...contentRepository.catalog,
      languages: contentRepository.catalog.languages.map((l) =>
        l.code === "xx" ? { ...l, isActive: false } : l,
      ),
    };

    const body = (await app.inject({ method: "GET", url: "/languages" })).json<LanguagesResponse>();

    expect(body.languages.map((l) => l.code)).toEqual(["pl"]);
  });

  it("serves a language added only to the catalog data, with no route or handler changes", async () => {
    const { app } = build();

    const body = (await app.inject({ method: "GET", url: "/languages" })).json<LanguagesResponse>();

    // `xx` exists nowhere in the API code — only in the (fake) catalog data.
    expect(body.languages.find((l) => l.code === "xx")?.name).toBe("Testlandic");
  });
});

describe("GET /languages/:languageCode/levels", () => {
  it("returns the declared levels with availability, lowest CEFR level first", async () => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: "/languages/pl/levels" });

    expect(response.statusCode).toBe(200);
    const body = response.json<LanguageLevelsResponse>();
    expect(body.language.code).toBe("pl");
    expect(body.levels).toEqual([
      { id: "a1", label: "A1", status: "available" },
      { id: "a2", label: "A2", status: "planned" },
    ]);
  });

  it("returns only the levels the language declares", async () => {
    const { app } = build();

    const body = (
      await app.inject({ method: "GET", url: "/languages/xx/levels" })
    ).json<LanguageLevelsResponse>();

    expect(body.levels.map((l) => l.id)).toEqual(["a1"]);
  });

  it("is a 404 for a well-formed but unknown language", async () => {
    const { app } = build();

    const response = await app.inject({ method: "GET", url: "/languages/zz/levels" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Language not found." });
  });

  it("is a 404 for an inactive language, indistinguishable from an unknown one", async () => {
    const { app, contentRepository } = build();
    contentRepository.catalog = {
      ...contentRepository.catalog,
      languages: contentRepository.catalog.languages.map((l) =>
        l.code === "xx" ? { ...l, isActive: false } : l,
      ),
    };

    const response = await app.inject({ method: "GET", url: "/languages/xx/levels" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Language not found." });
  });

  it.each(["POL", "p", "pl-PL", "pl1", "%27%20OR%201%3D1", "%3Cscript%3E"])(
    "is a 400 for the malformed language code %s, without echoing it",
    async (code) => {
      const { app } = build();

      const response = await app.inject({ method: "GET", url: `/languages/${code}/levels` });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request." });
    },
  );

  it("never lets a path-traversal-shaped code reach anything", async () => {
    const { app } = build();

    const response = await app.inject({
      method: "GET",
      url: "/languages/..%2F..%2Fetc%2Fpasswd/levels",
    });

    expect([400, 404]).toContain(response.statusCode);
    expect(response.body).not.toContain("passwd");
  });
});

describe("public discovery: rate limiting and failures", () => {
  it("rate-limits an anonymous caller", async () => {
    const { app } = build();

    let last = 200;
    for (let i = 0; i < 130; i += 1) {
      last = (await app.inject({ method: "GET", url: "/languages" })).statusCode;
    }

    expect(last).toBe(429);
  });

  it("raises the ceiling for E2E runs only when the E2E flag is set", async () => {
    const { app } = build({ E2E_RELAXED_RATE_LIMITS: "true" });

    let last = 200;
    for (let i = 0; i < 130; i += 1) {
      last = (await app.inject({ method: "GET", url: "/languages" })).statusCode;
    }

    expect(last).toBe(200);
  });

  it("returns a generic 500 and leaks nothing when the repository fails", async () => {
    const { app, contentRepository } = build();
    contentRepository.listLanguages = () =>
      Promise.reject(new Error("connection string postgres://user:secret@host/db"));

    const response = await app.inject({ method: "GET", url: "/languages" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
    expect(response.body).not.toContain("secret");
  });
});
