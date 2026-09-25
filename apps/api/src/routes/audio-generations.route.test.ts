import { loadEnv } from "@tfm-bic/config";
import { FakeAudioGenerationService, isWav, type FakeAudioGenerationScenario } from "@tfm-bic/data";
import { makeVocabularyCatalog } from "@tfm-bic/application/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const PASSWORD = "correct-password";
const NOW = new Date("2026-01-01T00:00:00.000Z");

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(
  overrides: Partial<Parameters<typeof loadEnv>[0]> = {},
  scenarios: ReadonlyMap<string, FakeAudioGenerationScenario> = new Map(),
) {
  const testDeps = buildTestDeps(NOW);
  const catalog = makeVocabularyCatalog();
  testDeps.contentRepository.catalog = catalog;
  testDeps.vocabularyRepository.categories = [...catalog.vocabularyCategories];
  testDeps.vocabularyRepository.items = [...catalog.vocabulary];
  const provider = new FakeAudioGenerationService(scenarios);
  testDeps.audioDeps.provider = provider;
  app = buildServer(
    loadEnv({
      NODE_ENV: "test",
      APP_BASE_URL,
      AUTH_SESSION_SECRET: "test-secret-value",
      ...overrides,
    }),
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
  return { app, provider, ...testDeps };
}

type Built = ReturnType<typeof build>;

async function signIn(built: Built, email = "ana@example.com") {
  built.userRepository.seed("STUDENT", {
    email,
    normalizedEmail: email,
    passwordHash: await built.passwordHasher.hash(PASSWORD),
    emailVerified: true,
  });
  const response = await built.app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: PASSWORD },
  });
  const cookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    throw new Error("test setup failed: no session cookie");
  }
  return cookie;
}

const LEMMA = {
  source: { type: "vocabulary-item", vocabularyItemId: "pl-dom", part: "lemma" },
  voice: "standard",
};

function generate(
  built: Built,
  cookie: string | undefined,
  payload: unknown = LEMMA,
  headers: Record<string, string> = { origin: APP_BASE_URL },
) {
  return built.app.inject({
    method: "POST",
    url: "/audio-generations",
    payload: payload as object,
    headers,
    ...(cookie ? { cookies: { [SESSION_COOKIE_NAME]: cookie } } : {}),
  });
}

describe("POST /audio-generations — authentication", () => {
  it("returns 401 without a session and with a tampered cookie, and generates nothing", async () => {
    const built = build();
    const cookie = await signIn(built);

    expect((await generate(built, undefined)).statusCode).toBe(401);
    expect((await generate(built, `${cookie}tampered`)).statusCode).toBe(401);
    expect(built.provider.calls).toHaveLength(0);
  });

  it("refuses a cross-origin request (CSRF defence in depth)", async () => {
    const built = build();
    const cookie = await signIn(built);

    const response = await generate(built, cookie, LEMMA, { origin: "https://evil.example" });

    expect(response.statusCode).toBe(403);
    expect(built.provider.calls).toHaveLength(0);
  });
});

describe("POST /audio-generations — success", () => {
  it("returns the clip itself as audio/wav, never cached by a shared cache", async () => {
    const built = build();
    const cookie = await signIn(built);

    const response = await generate(built, cookie);

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("audio/wav");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(isWav(new Uint8Array(response.rawPayload))).toBe(true);
  });

  it("speaks the text from the catalog, in the entry's language, with the requested profile", async () => {
    const built = build();
    const cookie = await signIn(built);

    await generate(built, cookie, {
      source: { type: "vocabulary-item", vocabularyItemId: "pl-dom", part: "example" },
      voice: "slow",
    });

    expect(built.provider.calls).toEqual([
      { text: "Mój dom jest mały.", languageId: "pl", locale: "pl-PL", voice: "slow" },
    ]);
  });

  it("serves a repeated identical request without generating it again", async () => {
    const built = build();
    const cookie = await signIn(built);

    await generate(built, cookie);
    const second = await generate(built, cookie);

    expect(second.statusCode).toBe(200);
    expect(built.provider.calls).toHaveLength(1);
  });
});

describe("POST /audio-generations — validation", () => {
  it.each([
    ["free text", { ...LEMMA, text: "anything at all" }],
    ["a user id", { ...LEMMA, userId: "someone-else" }],
    ["a provider voice name", { ...LEMMA, voice: "Kore" }],
    ["an unknown source", { ...LEMMA, source: { ...LEMMA.source, type: "url" } }],
    ["a malformed entry id", { ...LEMMA, source: { ...LEMMA.source, vocabularyItemId: "../x" } }],
    ["an empty JSON body", {}],
  ])("rejects %s with 400 and a fixed message, before any generation", async (_name, payload) => {
    const built = build();
    const cookie = await signIn(built);

    const response = await generate(built, cookie, payload);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
    expect(built.provider.calls).toHaveLength(0);
  });

  it("rejects an oversized body with 413 before parsing it", async () => {
    const built = build();
    const cookie = await signIn(built);

    const response = await generate(built, cookie, { ...LEMMA, padding: "x".repeat(2000) });

    expect(response.statusCode).toBe(413);
    expect(built.provider.calls).toHaveLength(0);
  });

  it.each(["pl-nope", "pl-draft-word", "pl-hidden"])(
    "answers 404 for an entry the student cannot see (%s), without echoing the id",
    async (vocabularyItemId) => {
      const built = build();
      const cookie = await signIn(built);

      const response = await generate(built, cookie, {
        ...LEMMA,
        source: { ...LEMMA.source, vocabularyItemId },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Audio source not found." });
      expect(response.body).not.toContain(vocabularyItemId);
    },
  );

  it("answers 404 for the example of an entry that has none", async () => {
    const built = build();
    const cookie = await signIn(built);

    const response = await generate(built, cookie, {
      ...LEMMA,
      source: { ...LEMMA.source, vocabularyItemId: "pl-kot", part: "example" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("answers 422 when the content's text is longer than the configured limit", async () => {
    const built = build({ AUDIO_GENERATION_MAX_TEXT_LENGTH: "2" });
    built.audioDeps.options.maxTextLength = 2;
    const cookie = await signIn(built);

    const response = await generate(built, cookie);

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error: "This text is too long to convert to audio." });
    expect(built.provider.calls).toHaveLength(0);
  });
});

describe("POST /audio-generations — provider failures are translated, never passed through", () => {
  it.each([
    ["provider-unavailable", 503, "Audio generation is temporarily unavailable."],
    ["rate-limited", 503, "Audio generation is temporarily unavailable."],
    ["timeout", 504, "Audio generation took too long. Please try again."],
    ["provider-rejected", 502, "Audio could not be generated for this text."],
  ] as const)("%s → %i with a fixed message", async (scenario, status, message) => {
    const built = build({}, new Map([["dom", scenario]]));
    const cookie = await signIn(built);

    const response = await generate(built, cookie);

    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({ error: message });
    expect(response.body).not.toMatch(/fake scenario|gemini|provider/i);
  });

  it("asks the client to retry later when the provider is unavailable", async () => {
    const built = build({}, new Map([["dom", "provider-unavailable"]]));
    const cookie = await signIn(built);

    const response = await generate(built, cookie);

    expect(response.headers["retry-after"]).toBeDefined();
  });

  it("never caches a failure: once the provider recovers, the same request succeeds", async () => {
    const scenarios = new Map<string, FakeAudioGenerationScenario>([
      ["dom", "provider-unavailable"],
    ]);
    const built = build({}, scenarios);
    const cookie = await signIn(built);

    expect((await generate(built, cookie)).statusCode).toBe(503);
    scenarios.delete("dom");
    expect((await generate(built, cookie)).statusCode).toBe(200);
  });
});

describe("POST /audio-generations — rate limiting", () => {
  it("bounds how many clips can be requested", async () => {
    const built = build();
    const cookie = await signIn(built);

    let last = 0;
    for (let request = 0; request < 31; request += 1) {
      last = (await generate(built, cookie)).statusCode;
    }

    expect(last).toBe(429);
  });

  it("relaxes the limit only when the E2E-only flag is set", async () => {
    const built = build({ E2E_RELAXED_RATE_LIMITS: "true" });
    const cookie = await signIn(built);

    let last = 0;
    for (let request = 0; request < 31; request += 1) {
      last = (await generate(built, cookie)).statusCode;
    }

    expect(last).toBe(200);
  });
});
