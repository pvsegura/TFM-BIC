import { describe, expect, it } from "vitest";

import { profileResponseSchema } from "./profile-response.schema.js";

const complete = {
  userId: "user-1",
  firstName: "Łukasz",
  lastName: "Kowalski",
  nickname: "lukas",
  avatarId: "avatar-02",
  email: "lukas@example.com",
  role: "STUDENT",
};

describe("profileResponseSchema", () => {
  it("accepts a complete profile", () => {
    expect(profileResponseSchema.parse(complete)).toEqual(complete);
  });

  it("accepts an unset profile with null fields", () => {
    const empty = {
      ...complete,
      firstName: null,
      lastName: null,
      nickname: null,
      avatarId: null,
    };
    expect(profileResponseSchema.parse(empty)).toEqual(empty);
  });

  it("strips fields that must never leave the server", () => {
    const parsed = profileResponseSchema.parse({
      ...complete,
      passwordHash: "argon2id$secret",
      normalizedEmail: "lukas@example.com",
      createdAt: new Date(),
      sessionToken: "secret",
    });

    expect(parsed).toEqual(complete);
    expect(parsed).not.toHaveProperty("passwordHash");
    expect(parsed).not.toHaveProperty("sessionToken");
  });

  it("rejects a role that is not a known role", () => {
    expect(profileResponseSchema.safeParse({ ...complete, role: "ROOT" }).success).toBe(false);
  });

  it("rejects an avatar id that is not in the catalog", () => {
    expect(profileResponseSchema.safeParse({ ...complete, avatarId: "avatar-99" }).success).toBe(
      false,
    );
  });

  it("rejects a response missing the account email", () => {
    const { email: _email, ...withoutEmail } = complete;
    expect(profileResponseSchema.safeParse(withoutEmail).success).toBe(false);
  });
});
