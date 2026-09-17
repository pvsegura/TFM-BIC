import { describe, expect, it } from "vitest";

import { isSessionExpired, type Session } from "./session.js";

const baseSession: Session = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  tokenHash: "a".repeat(64),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date("2026-01-08T00:00:00.000Z"),
  rotatedAt: null,
};

describe("isSessionExpired", () => {
  it("is false before the expiry instant", () => {
    expect(isSessionExpired(baseSession, new Date("2026-01-07T23:59:59.000Z"))).toBe(false);
  });

  it("is true after the expiry instant", () => {
    expect(isSessionExpired(baseSession, new Date("2026-01-08T00:00:01.000Z"))).toBe(true);
  });

  it("is true exactly at the expiry instant", () => {
    expect(isSessionExpired(baseSession, new Date("2026-01-08T00:00:00.000Z"))).toBe(true);
  });
});
