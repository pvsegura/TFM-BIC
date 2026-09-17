import { describe, expect, it } from "vitest";

import { loginRequestSchema } from "./login-request.schema.js";

describe("loginRequestSchema", () => {
  it("accepts a well-formed login request", () => {
    expect(
      loginRequestSchema.safeParse({ email: "user@example.com", password: "anything" }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginRequestSchema.safeParse({ email: "user@example.com", password: "" }).success).toBe(
      false,
    );
  });

  it("rejects an excessively long password (DoS guard on the hasher)", () => {
    expect(
      loginRequestSchema.safeParse({ email: "user@example.com", password: "a".repeat(1000) })
        .success,
    ).toBe(false);
  });

  it("rejects a missing email", () => {
    expect(loginRequestSchema.safeParse({ password: "anything" }).success).toBe(false);
  });

  it("rejects a syntactically invalid email", () => {
    expect(
      loginRequestSchema.safeParse({ email: "not-an-email", password: "anything" }).success,
    ).toBe(false);
  });
});
