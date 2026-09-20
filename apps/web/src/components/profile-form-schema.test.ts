import { AVATAR_CATALOG } from "@tfm-bic/contracts";
import { hasAvatarGlyph } from "@tfm-bic/ui";
import { describe, expect, it } from "vitest";

import { profileFormSchema, toFormValues } from "./profile-form-schema.js";

const EMPTY = { firstName: "", lastName: "", nickname: "", avatarId: null } as const;

describe("toFormValues", () => {
  it("turns an unset profile into empty inputs", () => {
    expect(
      toFormValues({
        userId: "u",
        firstName: null,
        lastName: null,
        nickname: null,
        avatarId: null,
        email: "a@example.com",
        role: "STUDENT",
      }),
    ).toEqual(EMPTY);
  });

  it("carries saved values through and leaves out account fields", () => {
    const values = toFormValues({
      userId: "u",
      firstName: "Łukasz",
      lastName: "Kowalski",
      nickname: "lukas",
      avatarId: "avatar-02",
      email: "a@example.com",
      role: "TEACHER",
    });

    expect(values).toEqual({
      firstName: "Łukasz",
      lastName: "Kowalski",
      nickname: "lukas",
      avatarId: "avatar-02",
    });
  });
});

describe("profileFormSchema", () => {
  const parse = (values: Record<string, unknown>) =>
    profileFormSchema.safeParse({ ...EMPTY, ...values });

  it("accepts valid values and passes them through trimmed", () => {
    const result = parse({
      firstName: "  Ana ",
      lastName: "García",
      nickname: " anita ",
      avatarId: "avatar-04",
    });

    expect(result.data).toEqual({
      firstName: "Ana",
      lastName: "García",
      nickname: "anita",
      avatarId: "avatar-04",
    });
  });

  it("turns a blank input into null, which clears that field on the server", () => {
    const result = parse({ firstName: "", lastName: "García", nickname: "" });

    expect(result.data).toMatchObject({ firstName: null, lastName: "García", nickname: null });
  });

  it("treats a whitespace-only input as blank rather than sending it", () => {
    const result = parse({ firstName: "     ", nickname: "\t  " });

    expect(result.data).toMatchObject({ firstName: null, nickname: null });
  });

  it("omits the avatar when none is chosen (an avatar can be replaced, not cleared)", () => {
    const result = parse({ firstName: "Ana", avatarId: null });

    expect(result.data).not.toHaveProperty("avatarId");
  });

  it("preserves Unicode exactly", () => {
    const result = parse({ firstName: "Łukasz", lastName: "Dvořák-Nguyễn", nickname: "李小龙" });

    expect(result.data).toMatchObject({
      firstName: "Łukasz",
      lastName: "Dvořák-Nguyễn",
      nickname: "李小龙",
    });
  });

  it("reports a too-short nickname against the nickname field", () => {
    const result = parse({ nickname: "x" });

    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === "nickname");
    expect(issue?.message).toMatch(/2–30 characters/);
  });

  it("reports an over-long name against that field", () => {
    const result = parse({ lastName: "a".repeat(101) });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === "lastName")).toBe(true);
  });

  it("reports a control character in a name", () => {
    const result = parse({ firstName: "Ana\nMaria" });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === "firstName")).toBe(true);
  });

  it("rejects an avatar id that is not in the catalog", () => {
    const result = parse({ avatarId: "https://evil.example.com/a.png" });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.path[0] === "avatarId")).toBe(true);
  });

  it("never lets an unknown field through to the request", () => {
    const result = parse({ firstName: "Ana", role: "TEACHER", userId: "someone-else" });

    expect(result.data).not.toHaveProperty("role");
    expect(result.data).not.toHaveProperty("userId");
  });
});

describe("avatar catalog and UI glyphs", () => {
  it("has a glyph for every avatar in the shared catalog", () => {
    // Adding an avatar to the catalog without giving the UI a glyph for it
    // would silently show the fallback — this makes that a test failure.
    for (const avatar of AVATAR_CATALOG) {
      expect(hasAvatarGlyph(avatar.id), `no glyph for ${avatar.id}`).toBe(true);
    }
  });
});
