import { describe, expect, it } from "vitest";

import { avatarIdSchema } from "./avatar-catalog.schema.js";
import { profileValidationErrorResponseSchema } from "./profile-validation-error.schema.js";

describe("profileValidationErrorResponseSchema", () => {
  it("accepts a generic error with no field detail", () => {
    expect(profileValidationErrorResponseSchema.parse({ error: "Invalid request body." })).toEqual({
      error: "Invalid request body.",
    });
  });

  it("accepts per-field messages for the four editable fields", () => {
    const body = {
      error: "Invalid request body.",
      fields: {
        firstName: "a",
        lastName: "b",
        nickname: "c",
        avatarId: "d",
      },
    };
    expect(profileValidationErrorResponseSchema.parse(body)).toEqual(body);
  });

  it("strips field keys that are not editable profile fields", () => {
    const parsed = profileValidationErrorResponseSchema.parse({
      error: "Invalid request body.",
      fields: { nickname: "c", role: "leaked", stack: "at foo (bar.ts:1)" },
    });

    expect(parsed.fields).toEqual({ nickname: "c" });
  });

  it("rejects a body without an error message", () => {
    expect(profileValidationErrorResponseSchema.safeParse({ fields: {} }).success).toBe(false);
  });
});

describe("avatarIdSchema error message", () => {
  it("gives a user-facing message and never echoes the rejected value", () => {
    const result = avatarIdSchema.safeParse("https://evil.example.com/a.png");

    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/available avatars/i);
    expect(message).not.toContain("evil");
  });
});
