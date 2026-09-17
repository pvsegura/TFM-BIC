import { describe, expect, it } from "vitest";

import { passwordResetRequestSchema } from "./password-reset-request.schema.js";

describe("passwordResetRequestSchema", () => {
  it("accepts a well-formed email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "user@example.com" }).success).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(passwordResetRequestSchema.safeParse({}).success).toBe(false);
  });
});
