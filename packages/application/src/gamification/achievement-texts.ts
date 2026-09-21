import {
  InvalidAchievementError,
  type AchievementKey,
  type AchievementRegistry,
} from "@tfm-bic/domain";

/** What a student reads for one achievement in one language. */
export interface AchievementText {
  readonly title: string;
  readonly description: string;
}

/**
 * Every language the achievement texts exist in: language code → achievement key → text.
 * Achievements themselves are language-neutral (a key, an icon, a reward, a rule); this is the
 * only place their wording lives, so adding a language is adding an entry here and touching
 * no logic. The interface is English-only today because M8 ships no interface localisation;
 * this is the seam a later milestone extends.
 */
export type AchievementTextCatalog = Readonly<
  Record<string, Readonly<Record<string, AchievementText>>>
>;

export const DEFAULT_INTERFACE_LOCALE = "en";

export const DEFAULT_ACHIEVEMENT_TEXT_CATALOG: AchievementTextCatalog = {
  en: {
    "first-exercise": {
      title: "First exercise",
      description: "Answer an exercise correctly for the first time.",
    },
    "first-lesson": {
      title: "First lesson",
      description: "Complete your first lesson.",
    },
    "ten-correct-exercises": {
      title: "Ten exercises",
      description: "Answer ten different exercises correctly.",
    },
    "hundred-points": {
      title: "One hundred points",
      description: "Reach 100 points.",
    },
  },
};

function baseLanguage(tag: string): string {
  return tag.toLowerCase().split("-")[0] ?? "";
}

/**
 * The texts of the achievements, checked when the server starts: the default language must
 * exist, and every language must have a non-empty title and description for **every**
 * achievement in the registry — so adding an achievement without its texts, or a language
 * with gaps, stops the server instead of showing an empty card later.
 */
export class AchievementTexts {
  readonly locales: readonly string[];

  constructor(
    registry: AchievementRegistry,
    private readonly catalog: AchievementTextCatalog,
    private readonly defaultLocale: string,
  ) {
    if (!(defaultLocale in catalog)) {
      throw new InvalidAchievementError(
        `The default language "${defaultLocale}" has no achievement texts.`,
      );
    }
    for (const [locale, entries] of Object.entries(catalog)) {
      for (const rule of registry.all()) {
        const key = rule.achievement.key;
        const text = entries[key];
        if (!text || text.title.trim() === "" || text.description.trim() === "") {
          throw new InvalidAchievementError(
            `Achievement "${key}" has no complete text in "${locale}".`,
          );
        }
      }
    }
    this.locales = Object.keys(catalog);
  }

  /**
   * The first language asked for that has texts, matching a regional variant (`en-GB`) to its
   * base language; otherwise the default. `*` and unsupported languages are ignored.
   */
  pickLocale(requested: readonly string[]): string {
    for (const tag of requested) {
      const base = baseLanguage(tag);
      const match = this.locales.find((locale) => locale.toLowerCase() === base);
      if (match !== undefined) {
        return match;
      }
    }
    return this.defaultLocale;
  }

  /** The text of an achievement, in the given language or — if it has none — the default one. */
  describe(key: AchievementKey, locale: string): AchievementText {
    const entries = this.catalog[locale] ?? this.catalog[this.defaultLocale];
    const text = entries?.[key];
    if (!text) {
      // Unreachable for a key from the registry: the constructor proved every one has a text.
      throw new InvalidAchievementError(`Achievement "${key}" has no text.`);
    }
    return text;
  }
}
