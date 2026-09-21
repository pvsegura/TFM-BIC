import { describe, expect, it } from "vitest";

import { foldForSearch, matchesVocabularySearch } from "./vocabulary-search.js";

const entry = (lemma: string, translation: string, plural?: string) => ({
  lemma,
  translation,
  ...(plural === undefined ? {} : { plural }),
});

describe("foldForSearch", () => {
  it("lower-cases, so a search does not depend on capitalisation", () => {
    expect(foldForSearch("DOM")).toBe("dom");
    expect(foldForSearch("Dzień Dobry")).toBe("dzien dobry");
  });

  it("removes combining diacritics, so a learner without the right keyboard still finds the word", () => {
    expect(foldForSearch("cześć")).toBe("czesc");
    expect(foldForSearch("źdźbło")).toBe("zdzblo");
    expect(foldForSearch("niño")).toBe("nino");
    expect(foldForSearch("Français")).toBe("francais");
  });

  it("folds the Latin letters Unicode does not decompose into a base letter plus a mark", () => {
    expect(foldForSearch("Łódź")).toBe("lodz");
    expect(foldForSearch("Straße")).toBe("strasse");
    expect(foldForSearch("Øl")).toBe("ol");
    expect(foldForSearch("Đ")).toBe("d");
    expect(foldForSearch("ısı")).toBe("isi");
  });

  it("gives an equal result for text that is canonically the same but encoded differently", () => {
    const decomposed = String.fromCharCode(0x65, 0x301); // "e" followed by a combining acute
    const composed = String.fromCharCode(0xe9); // the single precomposed letter

    expect(decomposed).not.toBe(composed);
    expect(foldForSearch(decomposed)).toBe("e");
    expect(foldForSearch(composed)).toBe("e");
  });

  it("collapses runs of whitespace and trims", () => {
    expect(foldForSearch("  dzień   dobry ")).toBe("dzien dobry");
    expect(foldForSearch("a\t\nb")).toBe("a b");
  });

  it("leaves scripts without case or marks in a comparable form", () => {
    expect(foldForSearch("李")).toBe("李");
    expect(foldForSearch("123")).toBe("123");
    expect(foldForSearch("")).toBe("");
  });
});

describe("matchesVocabularySearch", () => {
  it("finds a word by a fragment of its lemma", () => {
    expect(matchesVocabularySearch(entry("dom", "house"), "dom")).toBe(true);
    expect(matchesVocabularySearch(entry("domowy", "home (adj.)"), "dom")).toBe(true);
    expect(matchesVocabularySearch(entry("kot", "cat"), "dom")).toBe(false);
  });

  it("finds a word by its meaning, in the other direction", () => {
    expect(matchesVocabularySearch(entry("dom", "house; home"), "hous")).toBe(true);
    expect(matchesVocabularySearch(entry("dom", "house; home"), "casa")).toBe(false);
  });

  it("finds a word by its plural form", () => {
    expect(matchesVocabularySearch(entry("brat", "brother", "bracia"), "braci")).toBe(true);
  });

  it("ignores case and diacritics on both sides", () => {
    expect(matchesVocabularySearch(entry("cześć", "hi; bye"), "CZESC")).toBe(true);
    expect(matchesVocabularySearch(entry("czesc", "hi; bye"), "cześć")).toBe(true);
    expect(matchesVocabularySearch(entry("Łódź", "Lodz"), "lodz")).toBe(true);
  });

  it("matches a phrase across the words of one field", () => {
    expect(matchesVocabularySearch(entry("dzień dobry", "good morning"), "dzien do")).toBe(true);
  });

  it("never matches across two fields: the lemma and the meaning are not one long string", () => {
    expect(matchesVocabularySearch(entry("dom", "house"), "domhouse")).toBe(false);
    expect(matchesVocabularySearch(entry("dom", "house"), "dom house")).toBe(false);
  });

  it("treats an empty term as matching nothing in particular (callers do not search for nothing)", () => {
    expect(matchesVocabularySearch(entry("dom", "house"), "")).toBe(true);
  });

  it("treats query characters as plain text, not as a pattern", () => {
    expect(matchesVocabularySearch(entry("dom", "house"), ".*")).toBe(false);
    expect(matchesVocabularySearch(entry("a.b", "dotted"), ".")).toBe(true);
    expect(matchesVocabularySearch(entry("dom", "house"), "%")).toBe(false);
    expect(matchesVocabularySearch(entry("dom", "house"), "'; DROP TABLE x;--")).toBe(false);
  });
});
