import { describe, expect, it } from "vitest";

import { isTokenUsable, type SecurityToken } from "./security-token.js";

const baseToken: SecurityToken = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "11111111-1111-4111-8111-111111111111",
  tokenHash: "b".repeat(64),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date("2026-01-01T01:00:00.000Z"),
  usedAt: null,
};

describe("isTokenUsable", () => {
  it("is true for an unused, unexpired token", () => {
    expect(isTokenUsable(baseToken, new Date("2026-01-01T00:30:00.000Z"))).toBe(true);
  });

  it("is false once the token has expired", () => {
    expect(isTokenUsable(baseToken, new Date("2026-01-01T01:00:01.000Z"))).toBe(false);
  });

  it("is false exactly at the expiry instant", () => {
    expect(isTokenUsable(baseToken, new Date("2026-01-01T01:00:00.000Z"))).toBe(false);
  });

  it("is false once the token has been used, even if not yet expired", () => {
    const used: SecurityToken = { ...baseToken, usedAt: new Date("2026-01-01T00:10:00.000Z") };
    expect(isTokenUsable(used, new Date("2026-01-01T00:20:00.000Z"))).toBe(false);
  });

  it("is false for a token that is both used and expired", () => {
    const usedAndExpired: SecurityToken = {
      ...baseToken,
      usedAt: new Date("2026-01-01T00:10:00.000Z"),
    };
    expect(isTokenUsable(usedAndExpired, new Date("2026-01-01T02:00:00.000Z"))).toBe(false);
  });
});
