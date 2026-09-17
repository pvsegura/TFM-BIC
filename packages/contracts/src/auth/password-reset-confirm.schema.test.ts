import { describe, expect, it } from "vitest";

import { passwordResetConfirmSchema } from "./password-reset-confirm.schema.js";

describe("passwordResetConfirmSchema", () => {
  it("accepts a token with a valid new password", () => {
    expect(
      passwordResetConfirmSchema.safeParse({ token: "some-token", newPassword: "a-good-password" })
        .success,
    ).toBe(true);
  });

  it("rejects a too-short new password", () => {
    expect(
      passwordResetConfirmSchema.safeParse({ token: "some-token", newPassword: "short" }).success,
    ).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(passwordResetConfirmSchema.safeParse({ newPassword: "a-good-password" }).success).toBe(
      false,
    );
  });
});
