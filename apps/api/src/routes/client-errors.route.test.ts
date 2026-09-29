import Fastify, { type FastifyInstance } from "fastify";
import { loadEnv } from "@tfm-bic/config";
import { afterEach, describe, expect, it } from "vitest";

import { createLoggerOptions } from "../logging/logger-options.js";
import { MetricsRegistry } from "../observability/metrics.js";
import { createLogCapture } from "../test-support/log-capture.js";
import { TEST_APP_BASE_URL } from "../test-support/build-test-server.js";
import { registerClientErrorRoutes } from "./client-errors.route.js";

const REPORT = { kind: "render", name: "TypeError", path: "/learn/lessons/pl-greetings" };

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function server() {
  const env = loadEnv({ NODE_ENV: "test", APP_BASE_URL: TEST_APP_BASE_URL });
  const capture = createLogCapture();
  const metrics = new MetricsRegistry();
  app = Fastify({
    logger: {
      ...createLoggerOptions({ NODE_ENV: "staging", LOG_LEVEL: "info", APP_VERSION: "v" }),
      stream: capture.stream,
    },
  });
  await app.register(import("@fastify/rate-limit"), { global: false });
  registerClientErrorRoutes(app, { env, metrics });
  await app.ready();
  return { capture, metrics };
}

function report(payload: unknown, origin = TEST_APP_BASE_URL) {
  return app!.inject({
    method: "POST",
    url: "/client-errors",
    headers: { origin },
    payload: payload as object,
  });
}

describe("POST /client-errors (M18)", () => {
  it("accepts a report (204), logs it at warn and counts it by kind", async () => {
    const { capture, metrics } = await server();

    const response = await report(REPORT);

    expect(response.statusCode).toBe(204);
    expect(capture.byMessage("client.error")).toEqual([
      expect.objectContaining({
        level: "warn",
        kind: "render",
        name: "TypeError",
        path: REPORT.path,
      }),
    ]);
    expect(metrics.snapshot().counters).toEqual([
      { name: "client_errors_total", labels: { kind: "render" }, value: 1 },
    ]);
  });

  it("refuses anything outside the contract with a generic 400, logging nothing it carried", async () => {
    const { capture, metrics } = await server();

    const response = await report({ ...REPORT, message: "my password is hunter2" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid request." });
    expect(capture.text()).not.toContain("hunter2");
    expect(metrics.snapshot().counters).toEqual([]);
  });

  it("refuses a cross-origin report (403)", async () => {
    await server();
    const response = await report(REPORT, "https://evil.example");
    expect(response.statusCode).toBe(403);
  });

  it("is rate limited per client address", async () => {
    await server();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await report(REPORT)).statusCode);
    }
    expect(statuses.filter((s) => s === 204)).toHaveLength(10);
    expect(statuses.at(-1)).toBe(429);
  });
});
