import { describe, expect, it } from "vitest";

import { InvalidLevelIdError } from "./errors/invalid-level-id.error.js";
import { CEFR_LEVELS, createLevelId, getLevel, isValidLevelId, LEVEL_IDS } from "./level-id.js";

describe("CEFR level catalog", () => {
  it("contains exactly the six CEFR levels, lowest first", () => {
    expect(LEVEL_IDS).toEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
    expect(CEFR_LEVELS.map((level) => level.label)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
  });

  it("gives every level a stable lowercase id distinct from its display label", () => {
    for (const level of CEFR_LEVELS) {
      expect(level.id).toBe(level.label.toLowerCase());
      expect(level.id).not.toBe(level.label);
    }
  });

  it("ranks levels 1..6 in order, so sorting never depends on the label", () => {
    expect(CEFR_LEVELS.map((level) => level.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("looks a level up by id", () => {
    expect(getLevel(createLevelId("b2"))).toEqual({ id: "b2", label: "B2", rank: 4 });
  });
});

describe("LevelId", () => {
  it.each(LEVEL_IDS)("accepts %s", (id) => {
    expect(isValidLevelId(id)).toBe(true);
    expect(createLevelId(id)).toBe(id);
  });

  it.each(["", "A1", "a", "a0", "a3", "c3", "d1", "pre-a1", " a1", "a1 ", "a1\n", "__proto__"])(
    "rejects %j",
    (invalid) => {
      expect(isValidLevelId(invalid)).toBe(false);
      expect(() => createLevelId(invalid)).toThrow(InvalidLevelIdError);
    },
  );
});
