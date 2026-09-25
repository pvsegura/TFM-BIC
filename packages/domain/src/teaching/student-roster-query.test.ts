import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROSTER_PAGE_SIZE,
  MAX_ROSTER_PAGE,
  MAX_ROSTER_PAGE_SIZE,
  MAX_ROSTER_SEARCH_LENGTH,
  ROSTER_ACTIVITY_FILTERS,
  ROSTER_SORT_DIRECTIONS,
  ROSTER_SORT_FIELDS,
  defaultDirectionFor,
} from "./student-roster-query.js";

describe("student roster query rules", () => {
  it("sorts only by an explicit allowlist of fields", () => {
    expect(ROSTER_SORT_FIELDS).toEqual([
      "name",
      "lastActivity",
      "points",
      "lessonsCompleted",
      "accuracy",
    ]);
    expect(ROSTER_SORT_DIRECTIONS).toEqual(["asc", "desc"]);
  });

  it("filters activity only by the documented active/inactive split", () => {
    expect(ROSTER_ACTIVITY_FILTERS).toEqual(["active", "inactive"]);
  });

  it("bounds the page size and the page number server-side", () => {
    expect(DEFAULT_ROSTER_PAGE_SIZE).toBe(20);
    expect(MAX_ROSTER_PAGE_SIZE).toBe(50);
    expect(DEFAULT_ROSTER_PAGE_SIZE).toBeLessThanOrEqual(MAX_ROSTER_PAGE_SIZE);
    expect(MAX_ROSTER_PAGE).toBeGreaterThan(0);
    expect(MAX_ROSTER_SEARCH_LENGTH).toBe(50);
  });

  it("sorts names A→Z by default and every measure highest/most recent first", () => {
    expect(defaultDirectionFor("name")).toBe("asc");
    expect(defaultDirectionFor("lastActivity")).toBe("desc");
    expect(defaultDirectionFor("points")).toBe("desc");
    expect(defaultDirectionFor("lessonsCompleted")).toBe("desc");
    expect(defaultDirectionFor("accuracy")).toBe("desc");
  });
});
