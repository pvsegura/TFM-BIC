import { describe, expect, it } from "vitest";

import { AVATAR_CATALOG, avatarIdSchema } from "./avatar-catalog.schema.js";

describe("avatarIdSchema", () => {
  it.each(AVATAR_CATALOG.map((avatar) => avatar.id))("accepts catalog id %s", (id) => {
    expect(avatarIdSchema.safeParse(id).success).toBe(true);
  });

  it("rejects an id that is not in the catalog", () => {
    expect(avatarIdSchema.safeParse("avatar-99").success).toBe(false);
  });

  it("rejects an arbitrary external URL", () => {
    expect(avatarIdSchema.safeParse("https://evil.example.com/a.png").success).toBe(false);
  });

  it.each([null, undefined, 1, {}, []])("rejects the non-string value %j", (value) => {
    expect(avatarIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("AVATAR_CATALOG (re-exported for the frontend)", () => {
  it("exposes an id and a label for every avatar", () => {
    expect(AVATAR_CATALOG.length).toBeGreaterThan(0);
    for (const avatar of AVATAR_CATALOG) {
      expect(avatar.id).toBeTruthy();
      expect(avatar.label).toBeTruthy();
    }
  });
});
