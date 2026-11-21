import { describe, expect, it } from "vitest";

import { canAccess, hasPremium, type Licence } from "./entitlement.js";

const now = new Date("2026-11-21T10:00:00.000Z");
const past = new Date("2026-01-01T00:00:00.000Z");
const future = new Date("2027-01-01T00:00:00.000Z");
const licence = (kind: Licence["kind"], overrides: Partial<Licence> = {}): Licence => ({
  kind,
  startsAt: past,
  endsAt: null,
  revokedAt: null,
  ...overrides,
});

describe("canAccess", () => {
  it("opens free and challenge content to everyone", () => {
    expect(canAccess([], { tier: "free" }, now)).toBe(true);
    expect(canAccess([], { tier: "challenge" }, now)).toBe(true);
  });

  it("opens only the purchased course level", () => {
    const owned = [licence("COURSE_A1")];
    expect(canAccess(owned, { tier: "course", levelId: "a1" }, now)).toBe(true);
    expect(canAccess(owned, { tier: "course", levelId: "a2" }, now)).toBe(false);
    expect(hasPremium(owned, now)).toBe(false);
  });

  it("opens every course while Premium is active, and nothing after it ends", () => {
    const active = [licence("PREMIUM_MONTHLY", { endsAt: future })];
    expect(canAccess(active, { tier: "course", levelId: "b2" }, now)).toBe(true);
    const ended = [licence("PREMIUM_MONTHLY", { endsAt: now })];
    expect(canAccess(ended, { tier: "course", levelId: "a1" }, now)).toBe(false);
  });

  it("grants nothing for a revoked licence", () => {
    const refunded = [licence("COURSE_A1", { revokedAt: past })];
    expect(canAccess(refunded, { tier: "course", levelId: "a1" }, now)).toBe(false);
  });
});
