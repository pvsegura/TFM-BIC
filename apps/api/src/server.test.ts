import { loadEnv } from "@tfm-bic/config";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "./server.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("GET /health", () => {
  it("returns an ok status matching the shared contract shape", async () => {
    app = buildServer(loadEnv({ NODE_ENV: "test" }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body: { status: string; timestamp: string; defaultLanguage: string } = response.json();
    expect(body.status).toBe("ok");
    expect(body.defaultLanguage).toBe("pl");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("reflects a configured DEFAULT_LANGUAGE", async () => {
    app = buildServer(loadEnv({ NODE_ENV: "test", DEFAULT_LANGUAGE: "en" }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.json()).toMatchObject({ defaultLanguage: "en" });
  });
});

describe("error handling", () => {
  it("returns a generic 500 body (and logs the real error) when a route throws", async () => {
    // A misconfigured DEFAULT_LANGUAGE is a realistic way for this to
    // happen today: loadEnv() only checks it's a string, so an invalid
    // code reaches GetHealthStatusUseCase and fails LanguageId validation.
    app = buildServer(loadEnv({ NODE_ENV: "test", DEFAULT_LANGUAGE: "not-a-valid-code" }));

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /ready", () => {
  it("returns readiness true", async () => {
    app = buildServer(loadEnv({ NODE_ENV: "test" }));

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ready: true });
  });
});
