import { describe, expect, it } from "vitest";

import { FALLBACK_AVATAR_GLYPH, getAvatarGlyph, hasAvatarGlyph } from "./avatar-glyphs.js";

describe("getAvatarGlyph", () => {
  it("returns a distinct glyph for each known avatar id", () => {
    const ids = ["avatar-01", "avatar-02", "avatar-03", "avatar-04", "avatar-05", "avatar-06"];
    const glyphs = ids.map((id) => getAvatarGlyph(id));

    expect(new Set(glyphs).size).toBe(ids.length);
    expect(glyphs).not.toContain(FALLBACK_AVATAR_GLYPH);
  });

  it("falls back for an id it has no glyph for instead of throwing", () => {
    expect(getAvatarGlyph("avatar-99")).toBe(FALLBACK_AVATAR_GLYPH);
  });

  it("falls back when there is no avatar", () => {
    expect(getAvatarGlyph(null)).toBe(FALLBACK_AVATAR_GLYPH);
  });

  it("does not treat Object.prototype keys as glyphs", () => {
    expect(getAvatarGlyph("constructor")).toBe(FALLBACK_AVATAR_GLYPH);
    expect(getAvatarGlyph("__proto__")).toBe(FALLBACK_AVATAR_GLYPH);
  });
});

describe("hasAvatarGlyph", () => {
  it("is true for a known id and false otherwise", () => {
    expect(hasAvatarGlyph("avatar-01")).toBe(true);
    expect(hasAvatarGlyph("avatar-99")).toBe(false);
    expect(hasAvatarGlyph("toString")).toBe(false);
  });
});
