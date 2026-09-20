import { describe, expect, it } from "vitest";

import { createLanguageId } from "./language-id.js";
import { isLevelSelectable, isValidLevelStatus, LEVEL_STATUSES } from "./language-level.js";
import { createLevelId } from "./level-id.js";

const polishA1 = (status: "available" | "planned") => ({
  languageId: createLanguageId("pl"),
  levelId: createLevelId("a1"),
  status,
});

describe("language-level availability", () => {
  it("has exactly two statuses: available and planned", () => {
    expect(LEVEL_STATUSES).toEqual(["available", "planned"]);
  });

  it.each(["available", "planned"])("accepts the status %s", (status) => {
    expect(isValidLevelStatus(status)).toBe(true);
  });

  it.each(["", "Available", "coming-soon", "unavailable", "draft"])(
    "rejects the status %j",
    (s) => {
      expect(isValidLevelStatus(s)).toBe(false);
    },
  );

  it("only an available level is selectable as a learning option", () => {
    expect(isLevelSelectable(polishA1("available"))).toBe(true);
    expect(isLevelSelectable(polishA1("planned"))).toBe(false);
  });
});
