/**
 * Latin letters that Unicode normalisation does not split into a base letter plus a combining
 * mark, so stripping marks alone leaves them alone ("ł" stays "ł"). They are folded explicitly to
 * what a learner without the right keyboard types. A generic table of characters, not a language
 * rule: it applies to every language's text the same way.
 */
const UNDECOMPOSABLE: Readonly<Record<string, string>> = {
  ł: "l",
  đ: "d",
  ø: "o",
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ı: "i",
};

const UNDECOMPOSABLE_PATTERN = new RegExp(`[${Object.keys(UNDECOMPOSABLE).join("")}]`, "gu");

/**
 * Reduces text to the form a search compares in: lower case, canonically decomposed with the
 * combining marks removed, the letters above folded, and whitespace collapsed. Deterministic and
 * locale-independent (the same input folds the same way on every machine). Both the entry's text
 * and the student's term go through it, so "CZESC", "cześć" and "czesc" all meet.
 */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(UNDECOMPOSABLE_PATTERN, (letter) => UNDECOMPOSABLE[letter] ?? letter)
    .replace(/\s+/gu, " ")
    .trim();
}

/** The fields of an entry a student can search. Notes and examples are deliberately not searched. */
interface Searchable {
  lemma: string;
  translation: string;
  plural?: string | undefined;
}

/**
 * Whether an entry matches a search term: the folded term is a substring of the folded lemma,
 * meaning or plural. It is a plain substring test — the term is never interpreted as a pattern,
 * so `.*` or `%` only match text that literally contains them — and the fields are matched one at
 * a time, never as one long string.
 */
export function matchesVocabularySearch(entry: Searchable, term: string): boolean {
  const needle = foldForSearch(term);
  if (needle === "") {
    return true;
  }
  const fields = [entry.lemma, entry.translation];
  if (entry.plural !== undefined) {
    fields.push(entry.plural);
  }
  return fields.some((field) => foldForSearch(field).includes(needle));
}
