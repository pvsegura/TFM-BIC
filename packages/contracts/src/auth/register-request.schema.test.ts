import { describe, expect, it } from "vitest";

import { registerRequestSchema } from "./register-request.schema.js";

describe("registerRequestSchema", () => {
  it("accepts a well-formed registration request", () => {
    expect(
      registerRequestSchema.safeParse({ email: "user@example.com", password: "a-good-password" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(registerRequestSchema.safeParse({ password: "a-good-password" }).success).toBe(false);
  });

  it("rejects a syntactically invalid email", () => {
    expect(
      registerRequestSchema.safeParse({ email: "not-an-email", password: "a-good-password" })
        .success,
    ).toBe(false);
  });

  it("rejects a too-short password", () => {
    expect(
      registerRequestSchema.safeParse({ email: "user@example.com", password: "short" }).success,
    ).toBe(false);
  });

  it("rejects an excessively long password", () => {
    expect(
      registerRequestSchema.safeParse({ email: "user@example.com", password: "a".repeat(200) })
        .success,
    ).toBe(false);
  });

  it("rejects an extra, unexpected field (e.g. a client-supplied role)", () => {
    expect(
      registerRequestSchema.safeParse({
        email: "user@example.com",
        password: "a-good-password",
        role: "TEACHER",
      }).success,
    ).toBe(false);
  });
});
