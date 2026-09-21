/**
 * Grammatical genders, for the languages that have them. An entry's gender is optional: a
 * language with no grammatical gender, or a word that has none (a verb, a numeral), simply omits
 * it. Finer distinctions some languages make inside a gender (animacy, for instance) are not
 * modelled here; an entry's `note` can carry them as plain text until a milestone needs more.
 */
export const GRAMMATICAL_GENDERS = ["masculine", "feminine", "neuter", "common"] as const;
export type GrammaticalGender = (typeof GRAMMATICAL_GENDERS)[number];

export function isValidGrammaticalGender(value: string): value is GrammaticalGender {
  return GRAMMATICAL_GENDERS.some((gender) => gender === value);
}
