import { describe, expect, it } from "vitest";

import {
  ACTIVE_WINDOW_DAYS,
  accuracyPercent,
  activeSince,
  isActiveStudent,
  recentWeekStarts,
  weekStartUtc,
} from "./teacher-dashboard-metrics.js";

const NOW = new Date("2026-09-25T10:30:00.000Z"); // a Friday

describe("active student definition", () => {
  it("uses a seven-day window", () => {
    expect(ACTIVE_WINDOW_DAYS).toBe(7);
  });

  it("starts the window exactly seven days before now", () => {
    expect(activeSince(NOW).toISOString()).toBe("2026-09-18T10:30:00.000Z");
  });

  it("counts a student whose last activity is inside the window, boundary included", () => {
    expect(isActiveStudent(new Date("2026-09-24T00:00:00.000Z"), NOW)).toBe(true);
    expect(isActiveStudent(new Date("2026-09-18T10:30:00.000Z"), NOW)).toBe(true);
  });

  it("does not count a student whose last activity is older, or who has none", () => {
    expect(isActiveStudent(new Date("2026-09-18T10:29:59.999Z"), NOW)).toBe(false);
    expect(isActiveStudent(null, NOW)).toBe(false);
  });
});

describe("accuracyPercent", () => {
  it("is correct attempts over all attempts, as a whole percentage", () => {
    expect(accuracyPercent(3, 4)).toBe(75);
    expect(accuracyPercent(1, 3)).toBe(33);
    expect(accuracyPercent(2, 3)).toBe(67);
    expect(accuracyPercent(0, 5)).toBe(0);
    expect(accuracyPercent(5, 5)).toBe(100);
  });

  it("is null, not zero, when there are no attempts — no attempts is not a bad result", () => {
    expect(accuracyPercent(0, 0)).toBeNull();
  });

  it("refuses impossible inputs instead of reporting a misleading number", () => {
    expect(() => accuracyPercent(5, 4)).toThrow(RangeError);
    expect(() => accuracyPercent(-1, 4)).toThrow(RangeError);
    expect(() => accuracyPercent(1.5, 4)).toThrow(RangeError);
  });
});

describe("weekly buckets (UTC, weeks start on Monday)", () => {
  it("maps any instant to the Monday 00:00 UTC that starts its week", () => {
    expect(weekStartUtc(NOW).toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(weekStartUtc(new Date("2026-09-21T00:00:00.000Z")).toISOString()).toBe(
      "2026-09-21T00:00:00.000Z",
    );
    // Sunday late evening is still the previous week.
    expect(weekStartUtc(new Date("2026-09-20T23:59:59.999Z")).toISOString()).toBe(
      "2026-09-14T00:00:00.000Z",
    );
  });

  it("lists the last N week starts, oldest first, ending with the current week", () => {
    expect(recentWeekStarts(NOW, 3).map((d) => d.toISOString())).toEqual([
      "2026-09-07T00:00:00.000Z",
      "2026-09-14T00:00:00.000Z",
      "2026-09-21T00:00:00.000Z",
    ]);
  });

  it("refuses a non-positive week count", () => {
    expect(() => recentWeekStarts(NOW, 0)).toThrow(RangeError);
  });
});
