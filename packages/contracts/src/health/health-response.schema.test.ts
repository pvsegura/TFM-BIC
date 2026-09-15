import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "./health-response.schema.js";

describe("healthResponseSchema", () => {
  it("accepts a well-formed health response", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      timestamp: "2026-01-01T00:00:00.000Z",
      defaultLanguage: "pl",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    { status: "down", timestamp: "2026-01-01T00:00:00.000Z", defaultLanguage: "pl" },
    { status: "ok", timestamp: "not-a-date", defaultLanguage: "pl" },
    { status: "ok", timestamp: "2026-01-01T00:00:00.000Z" },
  ])("rejects a malformed payload %j", (payload) => {
    expect(healthResponseSchema.safeParse(payload).success).toBe(false);
  });
});
