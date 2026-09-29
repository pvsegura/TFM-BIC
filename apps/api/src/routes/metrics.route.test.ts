import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildTestServer } from "../test-support/build-test-server.js";

const TOKEN = "metrics-token-for-tests-0123456789abcdef";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function scrape(authorization?: string) {
  return app!.inject({
    method: "GET",
    url: "/internal/metrics",
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /internal/metrics (M18)", () => {
  it("does not exist unless METRICS_TOKEN is configured", async () => {
    ({ app } = buildTestServer());
    const response = await scrape(`Bearer ${TOKEN}`);
    expect(response.statusCode).toBe(404);
  });

  it.each([undefined, "Bearer wrong-token-0123456789abcdef0123456789", `Basic ${TOKEN}`, TOKEN])(
    "refuses authorization %j with a generic 401",
    async (authorization) => {
      ({ app } = buildTestServer({ METRICS_TOKEN: TOKEN }));
      const response = await scrape(authorization);
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "Unauthorized." });
    },
  );

  it("returns the release, process, readiness, database and HTTP metrics — and no secrets", async () => {
    ({ app } = buildTestServer({
      METRICS_TOKEN: TOKEN,
      APP_VERSION: "0.1.0+abc",
      AUTH_SESSION_SECRET: "session-secret-that-must-not-appear-0000",
    }));
    await app.inject({ method: "GET", url: "/languages" });

    const response = await scrape(`Bearer ${TOKEN}`);

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = response.json<Record<string, unknown>>();
    expect(body).toMatchObject({
      service: "tfm-bic-api",
      env: "test",
      version: "0.1.0+abc",
      uptimeSeconds: expect.any(Number) as number,
      process: {
        rssBytes: expect.any(Number) as number,
        heapUsedBytes: expect.any(Number) as number,
      },
      readiness: { ready: null },
      database: { pools: 0, waitingRequests: 0 },
    });
    expect(body.counters).toContainEqual({
      name: "http_responses_total",
      labels: { method: "GET", route: "/languages", status: "200" },
      value: 1,
    });
    const text = response.body;
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain("session-secret-that-must-not-appear");
  });
});
