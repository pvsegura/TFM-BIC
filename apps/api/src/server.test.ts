import { loadEnv } from "@tfm-bic/config";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "./server.js";
import { buildTestDeps } from "./test-support/build-test-deps.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(env: ReturnType<typeof loadEnv>, runtime: Parameters<typeof buildServer>[14] = {}) {
  const {
    deps,
    profileDeps,
    contentDeps,
    lessonDeps,
    exerciseDeps,
    gamificationDeps,
    vocabularyDeps,
    phoneticsDeps,
    videoDeps,
    audioDeps,
    teachingDeps,
    emailDeps,
    privacyDeps,
  } = buildTestDeps();
  return buildServer(
    env,
    deps,
    profileDeps,
    contentDeps,
    lessonDeps,
    exerciseDeps,
    gamificationDeps,
    vocabularyDeps,
    phoneticsDeps,
    videoDeps,
    audioDeps,
    teachingDeps,
    emailDeps,
    privacyDeps,
    runtime,
  );
}

describe("GET /health", () => {
  it("returns an ok status matching the shared contract shape", async () => {
    app = build(loadEnv({ NODE_ENV: "test" }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body: { status: string; timestamp: string; defaultLanguage: string } = response.json();
    expect(body.status).toBe("ok");
    expect(body.defaultLanguage).toBe("pl");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("reflects a configured DEFAULT_LANGUAGE", async () => {
    app = build(loadEnv({ NODE_ENV: "test", DEFAULT_LANGUAGE: "en" }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.json()).toMatchObject({ defaultLanguage: "en" });
  });
});

describe("error handling", () => {
  it("returns a generic 500 body (and logs the real error) when a route throws", async () => {
    // A misconfigured DEFAULT_LANGUAGE is a realistic way for this to
    // happen today: loadEnv() only checks it's a string, so an invalid
    // code reaches GetHealthStatusUseCase and fails LanguageId validation.
    app = build(loadEnv({ NODE_ENV: "test", DEFAULT_LANGUAGE: "not-a-valid-code" }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /ready (M17: reflects the database)", () => {
  it("is 200 when the readiness check passes", async () => {
    app = build(loadEnv({ NODE_ENV: "test" }), { isReady: () => Promise.resolve(true) });

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ready: true });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("is 503 when the database is unreachable — and says nothing about why", async () => {
    app = build(loadEnv({ NODE_ENV: "test" }), { isReady: () => Promise.resolve(false) });

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ ready: false });
  });

  it("is 503 (not 500) when the check itself throws", async () => {
    app = build(loadEnv({ NODE_ENV: "test" }), {
      isReady: () => Promise.reject(new Error("connect ECONNREFUSED 10.0.0.5:5432")),
    });

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("ECONNREFUSED");
  });

  it("defaults to ready when no check is wired (the in-process NODE_ENV=test database)", async () => {
    app = build(loadEnv({ NODE_ENV: "test" }));

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
  });
});

describe("GET /health (M17: liveness only)", () => {
  it("reports the build version and nothing else from the environment", async () => {
    app = build(loadEnv({ NODE_ENV: "test", APP_VERSION: "0.1.0+abc1234" }), {
      isReady: () => Promise.resolve(false),
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    // Liveness never depends on the database: a slow DB must not get the container restarted.
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual([
      "defaultLanguage",
      "status",
      "timestamp",
      "version",
    ]);
    expect(response.json()).toMatchObject({ version: "0.1.0+abc1234" });
  });
});
