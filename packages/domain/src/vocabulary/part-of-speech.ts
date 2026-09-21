/**
 * The word classes an entry may declare. A closed, language-neutral set so the interface and the
 * API can rely on it; it is optional on an entry, because not every word needs (or has an
 * uncontroversial) classification. Extending it is a change here plus the file schema.
 */
export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "numeral",
  "preposition",
  "conjunction",
  "interjection",
  "particle",
  "phrase",
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export function isValidPartOfSpeech(value: string): value is PartOfSpeech {
  return PARTS_OF_SPEECH.some((part) => part === value);
}
