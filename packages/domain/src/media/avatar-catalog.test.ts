import { describe, expect, it } from "vitest";

import { AVATAR_CATALOG, AVATAR_IDS, isValidAvatarId } from "./avatar-catalog.js";

describe("AVATAR_CATALOG", () => {
  it("offers a small fixed set of avatars", () => {
    expect(AVATAR_CATALOG).toHaveLength(6);
  });

  it("uses stable, unique ids of the form avatar-NN", () => {
    const ids = AVATAR_CATALOG.map((avatar) => avatar.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^avatar-\d{2}$/);
    }
  });

  it("gives every avatar a non-empty, unique label", () => {
    const labels = AVATAR_CATALOG.map((avatar) => avatar.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("exposes ids in catalog order via AVATAR_IDS", () => {
    expect(AVATAR_IDS).toEqual(AVATAR_CATALOG.map((avatar) => avatar.id));
  });
});

describe("isValidAvatarId", () => {
  it.each(AVATAR_CATALOG.map((avatar) => avatar.id))("accepts catalog id %s", (id) => {
    expect(isValidAvatarId(id)).toBe(true);
  });

  it("rejects an id that is not in the catalog", () => {
    expect(isValidAvatarId("avatar-99")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidAvatarId("")).toBe(false);
  });

  it("rejects an arbitrary external URL", () => {
    expect(isValidAvatarId("https://evil.example.com/avatar.png")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isValidAvatarId("AVATAR-01")).toBe(false);
  });

  it("does not match surrounding whitespace", () => {
    expect(isValidAvatarId(" avatar-01")).toBe(false);
    expect(isValidAvatarId("avatar-01 ")).toBe(false);
  });

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])(
    "rejects the Object.prototype key %s",
    (key) => {
      expect(isValidAvatarId(key)).toBe(false);
    },
  );
});
