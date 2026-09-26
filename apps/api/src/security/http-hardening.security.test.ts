import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildTestServer } from "../test-support/build-test-server.js";
import { apiSecurityHeaders, REQUEST_TIMEOUT_MS } from "./http-security.js";

/**
 * M16 (audit S-06, S-07, S-08, S-10, S-01): cross-cutting HTTP hardening of the whole API — every
 * route, including errors, 404s and rate-limited replies.
 */

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function server(envOverrides: Record<string, string> = {}): FastifyInstance {
  app = buildTestServer(envOverrides).app;
  return app;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const JSON_HEADERS = { "content-type": "application/json" };

describe("security headers on every API response", () => {
  const requests = [
    { name: "a public read", method: "GET", url: "/health" },
    { name: "an unauthenticated read", method: "GET", url: "/auth/me" },
    { name: "an unknown route", method: "GET", url: "/does-not-exist" },
    {
      name: "a malformed body",
      method: "POST",
      url: "/auth/login",
      headers: JSON_HEADERS,
      payload: "{",
    },
  ] as const;

  it.each(requests)("are present on $name", async (request) => {
    const response = await server().inject(request);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers.server).toBeUndefined();
  });

  it("default responses to no-store, so private data is never cached by a browser or proxy", async () => {
    const response = await server().inject({ method: "GET", url: "/auth/me" });

    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("keeps a route's own Cache-Control", async () => {
    const app = server();
    app.get("/test-only-cacheable", (_request, reply) =>
      reply.header("cache-control", "public, max-age=60").send({ ok: true }),
    );

    const response = await app.inject({ method: "GET", url: "/test-only-cacheable" });

    expect(response.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("sends no Strict-Transport-Security outside staging/production (plain-HTTP local dev)", async () => {
    const response = await server().inject({ method: "GET", url: "/health" });

    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });

  it.each(["production", "staging"] as const)(
    "sends Strict-Transport-Security in %s, where HTTPS is required",
    (nodeEnv) => {
      expect(apiSecurityHeaders(nodeEnv)["strict-transport-security"]).toBe(
        "max-age=31536000; includeSubDomains",
      );
    },
  );

  it.each(["development", "test"] as const)("has no HSTS entry in %s", (nodeEnv) => {
    expect(apiSecurityHeaders(nodeEnv)).not.toHaveProperty("strict-transport-security");
  });
});

describe("request ids", () => {
  it("returns a random UUID request id on every response, for log correlation", async () => {
    const app = server();

    const first = await app.inject({ method: "GET", url: "/health" });
    const second = await app.inject({ method: "GET", url: "/health" });

    expect(first.headers["x-request-id"]).toMatch(UUID);
    expect(second.headers["x-request-id"]).toMatch(UUID);
    expect(first.headers["x-request-id"]).not.toBe(second.headers["x-request-id"]);
  });

  it("never adopts a client-supplied request id (log forging)", async () => {
    const response = await server().inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "attacker\ncontrolled" },
    });

    expect(response.headers["x-request-id"]).toMatch(UUID);
  });
});

describe("error responses", () => {
  it("answers an unknown route with a generic 404 that does not reflect the path", async () => {
    const response = await server().inject({ method: "GET", url: "/nope/<script>alert(1)" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Not found." });
    expect(response.body).not.toContain("nope");
  });

  it("answers malformed JSON with a 400 that says so (not 'Internal Server Error')", async () => {
    const response = await server().inject({
      method: "POST",
      url: "/auth/login",
      headers: JSON_HEADERS,
      payload: "{bad",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
  });

  it("answers an unsupported content type with a 415", async () => {
    const response = await server().inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "text/xml" },
      payload: "<login/>",
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ error: "Unsupported media type." });
  });

  it("answers rate limiting with 429 'Too many requests.' and keeps Retry-After", async () => {
    const app = server();
    const login = () =>
      app.inject({
        method: "POST",
        url: "/auth/password-reset/request",
        payload: { email: "someone@example.com" },
      });
    for (let i = 0; i < 5; i += 1) {
      await login();
    }

    const response = await login();

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({ error: "Too many requests." });
    expect(response.headers["retry-after"]).toBeDefined();
  });

  it("keeps a generic 500 for unexpected failures", async () => {
    app = buildTestServer({ DEFAULT_LANGUAGE: "not-a-valid-code" }).app;

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal Server Error" });
    expect(response.headers["x-request-id"]).toMatch(UUID);
  });
});

describe("resource limits", () => {
  it("refuses a body over the 16 KiB server-wide default on a route with no limit of its own", async () => {
    const response = await server().inject({
      method: "POST",
      url: "/auth/login",
      headers: JSON_HEADERS,
      payload: JSON.stringify({ email: "a@example.com", password: "x".repeat(20 * 1024) }),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: "Request body too large." });
  });

  it("sets a non-zero request timeout (slow-request protection without a proxy)", async () => {
    const app = server();
    await app.ready();

    expect(app.server.requestTimeout).toBe(REQUEST_TIMEOUT_MS);
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });
});

describe("client address behind a proxy (TRUST_PROXY)", () => {
  // `inject` connects from 127.0.0.1. Five password-reset requests per client per hour.
  async function resetRequestsFrom(app: FastifyInstance, forwardedFor: string) {
    return app.inject({
      method: "POST",
      url: "/auth/password-reset/request",
      headers: { "x-forwarded-for": forwardedFor },
      payload: { email: "someone@example.com" },
    });
  }

  it("ignores X-Forwarded-For by default: a client cannot escape its limit by inventing addresses", async () => {
    const app = server();
    for (let i = 0; i < 5; i += 1) {
      await resetRequestsFrom(app, `203.0.113.${String(i)}`);
    }

    const response = await resetRequestsFrom(app, "203.0.113.99");

    expect(response.statusCode).toBe(429);
  });

  it("rate limits each real client separately when the proxy is trusted", async () => {
    const app = server({ TRUST_PROXY: "127.0.0.1" });
    for (let i = 0; i < 5; i += 1) {
      await resetRequestsFrom(app, "203.0.113.1");
    }

    const limited = await resetRequestsFrom(app, "203.0.113.1");
    const otherClient = await resetRequestsFrom(app, "203.0.113.2");

    expect(limited.statusCode).toBe(429);
    expect(otherClient.statusCode).toBe(200);
  });
});
