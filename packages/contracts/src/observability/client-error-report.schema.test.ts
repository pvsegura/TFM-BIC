import { describe, expect, it } from "vitest";

import { clientErrorReportSchema } from "./client-error-report.schema.js";

const VALID = { kind: "render", name: "TypeError", path: "/learn/lessons/pl-greetings" };

describe("clientErrorReportSchema (M18)", () => {
  it("accepts a kind, an error class name and a page path", () => {
    expect(clientErrorReportSchema.parse(VALID)).toEqual(VALID);
  });

  it.each([
    ["an unknown kind", { ...VALID, kind: "console" }],
    ["a message field (never accepted)", { ...VALID, message: "user typed secret" }],
    ["a stack field", { ...VALID, stack: "at x" }],
    ["a path with a query string", { ...VALID, path: "/reset-password?token=abc" }],
    ["a path with a fragment", { ...VALID, path: "/x#token" }],
    ["a relative or absolute URL", { ...VALID, path: "https://evil.example/" }],
    ["a name with spaces", { ...VALID, name: "Cannot read property" }],
    ["a name that is too long", { ...VALID, name: "E".repeat(65) }],
    ["a path that is too long", { ...VALID, path: `/${"a".repeat(200)}` }],
    ["a control character (log injection)", { ...VALID, path: "/a\nfake log line" }],
  ])("refuses %s", (_label, body) => {
    expect(clientErrorReportSchema.safeParse(body).success).toBe(false);
  });
});
