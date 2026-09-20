import { describe, expect, it } from "vitest";

import { AVATAR_CATALOG } from "../media/avatar-catalog.js";
import { createAvatarId } from "./avatar-selection.js";
import { InvalidAvatarIdError } from "./errors/invalid-avatar-id.error.js";

describe("createAvatarId", () => {
  it.each(AVATAR_CATALOG.map((avatar) => avatar.id))("accepts catalog id %s", (id) => {
    expect(createAvatarId(id)).toBe(id);
  });

  it("rejects an id that is not in the catalog", () => {
    expect(() => createAvatarId("avatar-99")).toThrow(InvalidAvatarIdError);
  });

  it("rejects an arbitrary external URL", () => {
    expect(() => createAvatarId("https://evil.example.com/a.png")).toThrow(InvalidAvatarIdError);
  });

  it("rejects an empty string", () => {
    expect(() => createAvatarId("")).toThrow(InvalidAvatarIdError);
  });

  it("does not trim — surrounding whitespace makes the id invalid", () => {
    expect(() => createAvatarId(" avatar-01 ")).toThrow(InvalidAvatarIdError);
  });

  it("does not echo the rejected value in the error message", () => {
    expect.assertions(1);
    try {
      createAvatarId("https://evil.example.com/a.png");
    } catch (error) {
      expect((error as Error).message).not.toContain("evil");
    }
  });
});
