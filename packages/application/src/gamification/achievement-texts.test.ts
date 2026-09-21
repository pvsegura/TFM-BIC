import {
  AchievementRegistry,
  completionCountRule,
  createAchievementKey,
  createDefaultAchievementRegistry,
  InvalidAchievementError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
  type AchievementTextCatalog,
} from "./achievement-texts.js";

const registry = createDefaultAchievementRegistry();
const key = createAchievementKey;

/** A locale that does not exist in the product: proves that adding one needs no logic change. */
const FICTIONAL: AchievementTextCatalog[string] = {
  "first-exercise": { title: "Xx first", description: "Xx do one exercise." },
  "first-lesson": { title: "Xx lesson", description: "Xx do one lesson." },
  "ten-correct-exercises": { title: "Xx ten", description: "Xx do ten exercises." },
  "hundred-points": { title: "Xx hundred", description: "Xx reach 100 points." },
};

function texts(extra: AchievementTextCatalog = {}) {
  return new AchievementTexts(
    registry,
    { ...DEFAULT_ACHIEVEMENT_TEXT_CATALOG, ...extra },
    DEFAULT_INTERFACE_LOCALE,
  );
}

describe("the default texts", () => {
  it("cover every achievement in English, with a title and a description", () => {
    const en = texts();

    for (const rule of registry.all()) {
      const text = en.describe(rule.achievement.key, "en");
      expect(text.title.trim()).not.toBe("");
      expect(text.description.trim()).not.toBe("");
    }
  });

  it("are keyed by the language-neutral achievement key, never by the wording", () => {
    expect(Object.keys(DEFAULT_ACHIEVEMENT_TEXT_CATALOG.en ?? {}).sort()).toEqual(
      registry
        .all()
        .map((rule) => rule.achievement.key)
        .sort(),
    );
  });
});

describe("resolving a text for a language", () => {
  it("returns the text of the requested language", () => {
    expect(texts({ xx: FICTIONAL }).describe(key("first-exercise"), "xx").title).toBe("Xx first");
  });

  it("falls back to the default language for one that has no texts", () => {
    expect(texts().describe(key("first-exercise"), "qq")).toEqual(
      texts().describe(key("first-exercise"), "en"),
    );
  });
});

describe("choosing a language from what the client asks for", () => {
  const supported = texts({ xx: FICTIONAL });

  it("takes the first requested language that is supported, in order", () => {
    expect(supported.pickLocale(["qq", "xx", "en"])).toBe("xx");
    expect(supported.pickLocale(["en", "xx"])).toBe("en");
  });

  it("matches a regional variant to its base language, ignoring case", () => {
    expect(supported.pickLocale(["XX-Latn"])).toBe("xx");
    expect(supported.pickLocale(["en-GB"])).toBe("en");
  });

  it("uses the default when none is supported, or none is asked for", () => {
    expect(supported.pickLocale(["qq", "zz"])).toBe("en");
    expect(supported.pickLocale([])).toBe("en");
    expect(supported.pickLocale(["*"])).toBe("en");
  });

  it("lists the languages it can serve", () => {
    expect([...supported.locales].sort()).toEqual(["en", "xx"]);
  });
});

describe("start-up validation", () => {
  it("refuses a language whose texts miss an achievement", () => {
    const partial = {
      "first-exercise": FICTIONAL["first-exercise"],
    } as AchievementTextCatalog[string];

    expect(() => texts({ xx: partial })).toThrow(InvalidAchievementError);
  });

  it("refuses a catalog without the default language", () => {
    expect(() => new AchievementTexts(registry, { xx: FICTIONAL }, "en")).toThrow(
      InvalidAchievementError,
    );
  });

  it("refuses a new achievement that has no text in some language", () => {
    const grown = new AchievementRegistry([
      ...registry.all(),
      completionCountRule({
        key: key("fifty-correct-exercises"),
        iconId: "target",
        reason: "exercise-completed",
        trigger: "exercise-completed",
        target: 50,
      }),
    ]);

    expect(
      () => new AchievementTexts(grown, DEFAULT_ACHIEVEMENT_TEXT_CATALOG, DEFAULT_INTERFACE_LOCALE),
    ).toThrow(/fifty-correct-exercises/);
  });

  it("refuses an empty title", () => {
    const blank = {
      ...FICTIONAL,
      "first-exercise": { title: " ", description: "x" },
    } as AchievementTextCatalog[string];

    expect(() => texts({ xx: blank })).toThrow(InvalidAchievementError);
  });
});
