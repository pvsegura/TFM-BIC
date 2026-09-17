import { describe, expect, it } from "vitest";

import { resendVerificationRequestSchema } from "./resend-verification-request.schema.js";

describe("resendVerificationRequestSchema", () => {
  it("accepts a well-formed email", () => {
    expect(resendVerificationRequestSchema.safeParse({ email: "user@example.com" }).success).toBe(
      true,
    );
  });

  it("rejects a missing email", () => {
    expect(resendVerificationRequestSchema.safeParse({}).success).toBe(false);
  });
});
