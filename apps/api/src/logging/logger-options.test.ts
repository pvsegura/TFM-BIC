import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { createLogCapture } from "../test-support/log-capture.js";
import { createLoggerOptions } from "./logger-options.js";

const ENV = { NODE_ENV: "staging", LOG_LEVEL: "info", APP_VERSION: "0.1.0+abc123" } as const;

function logger(overrides: Partial<Record<keyof typeof ENV, string>> = {}) {
  const capture = createLogCapture();
  const app = Fastify({
    logger: {
      ...createLoggerOptions({ ...ENV, ...overrides } as never),
      stream: capture.stream,
    },
  });
  return { log: app.log, capture };
}

describe("createLoggerOptions (M18)", () => {
  it("stamps every line with service, environment, release, an ISO time and a level label", () => {
    const { log, capture } = logger();
    log.info({ answer: 42 }, "something.happened");

    const [line] = capture.lines();
    expect(line).toMatchObject({
      level: "info",
      service: "tfm-bic-api",
      env: "staging",
      version: "0.1.0+abc123",
      msg: "something.happened",
      answer: 42,
    });
    expect(new Date(line?.time as string).toISOString()).toBe(line?.time);
    expect(line).not.toHaveProperty("pid");
    expect(line).not.toHaveProperty("hostname");
  });

  it("honours LOG_LEVEL and is silent under NODE_ENV=test", () => {
    const warnOnly = logger({ LOG_LEVEL: "warn" });
    warnOnly.log.info("dropped");
    warnOnly.log.warn("kept");
    expect(warnOnly.capture.lines().map((l) => l.msg)).toEqual(["kept"]);

    const test = logger({ NODE_ENV: "test" });
    test.log.error("never written");
    expect(test.capture.lines()).toEqual([]);
  });

  it("redacts secret-bearing fields wherever a developer logs them", () => {
    const { log, capture } = logger();
    log.info(
      {
        password: "hunter2-password",
        newPassword: "new-hunter2",
        token: "reset-token-value",
        user: { password: "nested-password", apiKey: "gemini-key-123" },
        headers: { authorization: "Bearer session-abc", cookie: "sid=cookie-value" },
        secret: "some-secret",
      },
      "careless.event",
    );

    const text = capture.text();
    for (const leaked of [
      "hunter2-password",
      "new-hunter2",
      "reset-token-value",
      "nested-password",
      "gemini-key-123",
      "session-abc",
      "cookie-value",
      "some-secret",
    ]) {
      expect(text).not.toContain(leaked);
    }
    expect(text).toContain("[redacted]");
  });

  it("keeps bound SQL parameters out of error lines (M15 serializer still applies)", () => {
    const { log, capture } = logger();
    log.error(new Error("Failed query: select 1\nparams: someone@example.com,hash"));
    expect(capture.text()).not.toContain("someone@example.com");
    expect(capture.lines()[0]).toMatchObject({ level: "error", err: { type: "Error" } });
  });
});
