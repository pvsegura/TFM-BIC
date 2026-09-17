import { describe, expect, it } from "vitest";

import { authUserResponseSchema } from "./auth-user-response.schema.js";

describe("authUserResponseSchema", () => {
  it("accepts a well-formed safe user", () => {
    expect(
      authUserResponseSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        email: "user@example.com",
        role: "STUDENT",
        emailVerified: true,
      }).success,
    ).toBe(true);
  });

  it("rejects a role outside the known set", () => {
    expect(
      authUserResponseSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        email: "user@example.com",
        role: "ADMIN",
        emailVerified: true,
      }).success,
    ).toBe(false);
  });

  it("rejects a payload carrying a password hash field", () => {
    const result = authUserResponseSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
      passwordHash: "$argon2id$...",
    });
    expect(result.success && !("passwordHash" in result.data)).toBe(true);
  });
});
