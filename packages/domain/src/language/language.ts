import type { LanguageId } from "./language-id.js";

export const TEXT_DIRECTIONS = ["ltr", "rtl"] as const;
export type TextDirection = (typeof TEXT_DIRECTIONS)[number];

export function isValidTextDirection(value: string): value is TextDirection {
  return TEXT_DIRECTIONS.some((direction) => direction === value);
}

/**
 * A language the platform can teach. Its ISO code is its identity — there is
 * deliberately no separate surrogate id until a database needs one. `locale`
 * is a BCP 47 tag for the default regional variant (`pl-PL`); it is distinct
 * from the language so regional variants can be added later without changing
 * how content is addressed. `direction` lets the UI set `dir` from metadata
 * instead of assuming left-to-right. `isActive` is the catalog on/off switch:
 * an inactive language is never offered to students.
 */
export interface Language {
  code: LanguageId;
  /** English name, used for sorting and as the accessible name. */
  name: string;
  /** The language's name in itself ("polski"). */
  nativeName: string;
  locale: string;
  direction: TextDirection;
  isActive: boolean;
}

/**
 * True when `tag` is a well-formed BCP 47 tag whose primary language subtag is
 * `languageId`. Syntax only — it does not check the region against a registry.
 */
export function isValidLocaleForLanguage(tag: string, languageId: LanguageId): boolean {
  let canonical: string | undefined;
  try {
    canonical = Intl.getCanonicalLocales(tag)[0];
  } catch {
    return false;
  }
  if (canonical === undefined || canonical.length === 0) {
    return false;
  }
  return new Intl.Locale(canonical).language === languageId;
}
