import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { createLoggerOptions } from "../logging/logger-options.js";
import { createLogCapture } from "../test-support/log-capture.js";
import { registerHttpObservability } from "./http-observability.js";
import { MetricsRegistry } from "./metrics.js";

async function server() {
  const capture = createLogCapture();
  const metrics = new MetricsRegistry();
  const app = Fastify({
    logger: {
      ...createLoggerOptions({ NODE_ENV: "staging", LOG_LEVEL: "info", APP_VERSION: "v1" }),
      stream: capture.stream,
    },
    disableRequestLogging: true,
  });
  registerHttpObservability(app, metrics);
  app.get("/health", () => ({ ok: true }));
  app.get("/ready", (_request, reply) => reply.code(503).send({ ready: false }));
  app.get("/lessons/:lessonId", () => ({ ok: true }));
  app.get("/boom", () => {
    throw new Error("boom");
  });
  await app.ready();
  return { app, capture, metrics };
}

describe("registerHttpObservability (M18)", () => {
  it("writes one request.completed line with the route template, status, duration and request id", async () => {
    const { app, capture } = await server();
    await app.inject({ url: "/lessons/pl-greetings?token=secret-query-token" });

    const lines = capture.byMessage("request.completed");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: "info",
      reqId: expect.any(String) as string,
      method: "GET",
      route: "/lessons/:lessonId",
      path: "/lessons/pl-greetings",
      statusCode: 200,
      durationMs: expect.any(Number) as number,
    });
    expect(capture.text()).not.toContain("secret-query-token");
    expect(capture.byMessage("incoming request")).toEqual([]);
  });

  it("counts responses by method, route and status, and records latency per route", async () => {
    const { app, metrics } = await server();
    await app.inject({ url: "/lessons/a" });
    await app.inject({ url: "/lessons/b" });
    await app.inject({ url: "/boom" });
    await app.inject({ url: "/does-not-exist/123" });

    const { counters, histograms } = metrics.snapshot();
    const responses = counters.filter((c) => c.name === "http_responses_total");
    expect(responses).toContainEqual({
      name: "http_responses_total",
      labels: { method: "GET", route: "/lessons/:lessonId", status: "200" },
      value: 2,
    });
    expect(responses).toContainEqual({
      name: "http_responses_total",
      labels: { method: "GET", route: "/boom", status: "500" },
      value: 1,
    });
    // An unmatched URL never becomes a label (unbounded cardinality).
    expect(responses).toContainEqual({
      name: "http_responses_total",
      labels: { method: "GET", route: "unmatched", status: "404" },
      value: 1,
    });
    expect(JSON.stringify(counters)).not.toContain("does-not-exist");
    expect(histograms).toContainEqual(
      expect.objectContaining({
        name: "http_request_duration_ms",
        labels: { method: "GET", route: "/lessons/:lessonId" },
        count: 2,
      }),
    );
  });

  it("keeps successful health probes out of the info log, but logs a failing probe", async () => {
    const { app, capture } = await server();
    await app.inject({ url: "/health" });
    await app.inject({ url: "/ready" });

    const lines = capture.byMessage("request.completed");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ route: "/ready", statusCode: 503, level: "info" });
  });

  it("collapses an unknown HTTP method into one label value", async () => {
    const { app, metrics } = await server();
    app.log.level = "silent";
    await app.inject({ method: "PROPFIND" as "GET", url: "/lessons/a" });
    const methods = metrics
      .snapshot()
      .counters.filter((c) => c.name === "http_responses_total")
      .map((c) => c.labels.method);
    expect(methods.every((m) => ["GET", "OTHER"].includes(m ?? ""))).toBe(true);
  });
});
