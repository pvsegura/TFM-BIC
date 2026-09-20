import { describe, expect, it } from "vitest";

import { updateProfileRequestSchema } from "./update-profile-request.schema.js";

const parse = (body: unknown) => updateProfileRequestSchema.safeParse(body);

describe("updateProfileRequestSchema", () => {
  describe("valid requests", () => {
    it("accepts an empty object (nothing to change)", () => {
      expect(parse({}).success).toBe(true);
    });

    it("accepts every editable field at once", () => {
      const result = parse({
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-01",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a single field on its own", () => {
      expect(parse({ nickname: "fox" }).success).toBe(true);
    });

    it("accepts an explicit null to clear a text field", () => {
      const result = parse({ firstName: null, lastName: null, nickname: null });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ firstName: null, lastName: null, nickname: null });
    });

    it("trims surrounding whitespace in the parsed output", () => {
      const result = parse({ firstName: "  Ana  ", nickname: "  fox " });
      expect(result.data).toEqual({ firstName: "Ana", nickname: "fox" });
    });

    it.each(["Łukasz", "Dvořák", "Nguyễn", "李", "محمد", "Σωκράτης", "José María"])(
      "accepts the international name %s unchanged",
      (name) => {
        expect(parse({ firstName: name }).data).toEqual({ firstName: name });
      },
    );

    it("accepts HTML-like input as inert text without altering it", () => {
      const payload = "<script>alert(1)</script>";
      expect(parse({ firstName: payload, nickname: payload }).data).toEqual({
        firstName: payload,
        nickname: payload,
      });
    });

    it("accepts SQL-like input as inert text without altering it", () => {
      const payload = "Robert'); DROP TABLE users;--";
      expect(parse({ lastName: payload }).data).toEqual({ lastName: payload });
    });
  });

  describe("names (first/last)", () => {
    it.each(["firstName", "lastName"])("rejects a whitespace-only %s", (field) => {
      expect(parse({ [field]: "     " }).success).toBe(false);
    });

    it.each(["firstName", "lastName"])("rejects an empty-string %s", (field) => {
      expect(parse({ [field]: "" }).success).toBe(false);
    });

    it.each(["firstName", "lastName"])("accepts a %s of exactly 100 characters", (field) => {
      expect(parse({ [field]: "a".repeat(100) }).success).toBe(true);
    });

    it.each(["firstName", "lastName"])("rejects a %s of 101 characters", (field) => {
      expect(parse({ [field]: "a".repeat(101) }).success).toBe(false);
    });

    it("rejects an extremely long name", () => {
      expect(parse({ firstName: "a".repeat(100_000) }).success).toBe(false);
    });

    it.each(["Ana\nMaria", "Ana\r\nMaria", "Ana\tMaria", "Ana\u0000"])(
      "rejects control characters (%j)",
      (name) => {
        expect(parse({ firstName: name }).success).toBe(false);
      },
    );
  });

  describe("nickname", () => {
    it("rejects a whitespace-only nickname", () => {
      expect(parse({ nickname: "      " }).success).toBe(false);
    });

    it("rejects a single-character nickname", () => {
      expect(parse({ nickname: "a" }).success).toBe(false);
    });

    it("accepts a nickname of exactly 2 and exactly 30 characters", () => {
      expect(parse({ nickname: "ab" }).success).toBe(true);
      expect(parse({ nickname: "a".repeat(30) }).success).toBe(true);
    });

    it("rejects a nickname of 31 characters", () => {
      expect(parse({ nickname: "a".repeat(31) }).success).toBe(false);
    });

    it("rejects a nickname containing a control character", () => {
      expect(parse({ nickname: "fo\nx" }).success).toBe(false);
    });
  });

  describe("avatarId", () => {
    it("rejects an unknown avatar id", () => {
      expect(parse({ avatarId: "avatar-99" }).success).toBe(false);
    });

    it("rejects an arbitrary external URL", () => {
      expect(parse({ avatarId: "https://evil.example.com/a.png" }).success).toBe(false);
    });

    it("rejects a javascript: URL", () => {
      expect(parse({ avatarId: "javascript:alert(1)" }).success).toBe(false);
    });

    it("rejects null — an avatar can be replaced but not cleared", () => {
      expect(parse({ avatarId: null }).success).toBe(false);
    });

    it("rejects an id with surrounding whitespace", () => {
      expect(parse({ avatarId: " avatar-01 " }).success).toBe(false);
    });
  });

  describe("mass assignment", () => {
    it.each([
      ["role", "TEACHER"],
      ["userId", "another-user"],
      ["emailVerified", true],
      ["email", "attacker@example.com"],
      ["passwordHash", "x"],
      ["id", "another-user"],
      ["createdAt", "2020-01-01T00:00:00.000Z"],
      ["subscriptionStatus", "premium"],
    ])("rejects a client-supplied %s", (field, value) => {
      expect(parse({ firstName: "Ana", [field]: value }).success).toBe(false);
    });

    it("rejects the forged-identity payload from the M4 brief", () => {
      expect(parse({ role: "teacher", userId: "another-user", emailVerified: true }).success).toBe(
        false,
      );
    });

    it("rejects an own __proto__ key produced by JSON.parse", () => {
      const body: unknown = JSON.parse('{"__proto__": {"role": "TEACHER"}}');
      expect(parse(body).success).toBe(false);
    });
  });

  describe("type confusion", () => {
    it.each([42, true, [], {}, ["Ana"]])("rejects the non-string name %j", (value) => {
      expect(parse({ firstName: value }).success).toBe(false);
    });

    it.each([null, "Ana", 42, true, []])("rejects the non-object body %j", (body) => {
      // `null` is a valid *field* value but never a valid body.
      expect(parse(body).success).toBe(false);
    });
  });
});
