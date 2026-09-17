import { describe, expect, it } from "vitest";

import { verifyEmailRequestSchema } from "./verify-email-request.schema.js";

describe("verifyEmailRequestSchema", () => {
  it("accepts a non-empty token", () => {
    expect(verifyEmailRequestSchema.safeParse({ token: "some-token" }).success).toBe(true);
  });

  it("rejects an empty token", () => {
    expect(verifyEmailRequestSchema.safeParse({ token: "" }).success).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(verifyEmailRequestSchema.safeParse({}).success).toBe(false);
  });
});
