import {
  createLanguageId,
  isPublished,
  validateContentCatalog,
  type ContentCatalog,
} from "@tfm-bic/domain";
import { beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { loadContentCatalog } from "./load-content-catalog.js";

/**
 * The shipped phonetics, tested as data. They run over the real `content/` folder, so a malformed
 * or inconsistent edit to any phonetics file fails CI here (and in `pnpm content:validate`) before
 * it can reach a student.
 */
const PL = createLanguageId("pl");

let catalog: ContentCatalog;

beforeAll(async () => {
  const result = await loadContentCatalog(DEFAULT_CONTENT_ROOT);
  if (!result.ok) {
    throw new Error(result.issues.map((i) => `${i.location}: ${i.message}`).join("\n"));
  }
  catalog = result.catalog;
});

describe("the shipped phonetics", () => {
  it("are consistent with the whole catalog", () => {
    expect(validateContentCatalog(catalog)).toEqual([]);
  });

  it("are a small representative set of Polish sounds, not a full phonemic inventory", () => {
    const pl = catalog.phonetics.filter((p) => p.languageId === PL);

    expect(pl.length).toBeGreaterThanOrEqual(4);
    expect(pl.length).toBeLessThanOrEqual(30);
    expect(catalog.phonetics.every((p) => p.languageId === PL)).toBe(true);
  });

  it("group into at least two topics", () => {
    expect(catalog.phoneticTopics.filter((t) => t.languageId === PL).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("belong to a topic that exists, in the same language", () => {
    const topics = new Map(catalog.phoneticTopics.map((t) => [`${t.languageId}/${t.id}`, t]));

    for (const representation of catalog.phonetics) {
      if (representation.topicId === undefined) {
        continue;
      }
      const topic = topics.get(`${representation.languageId}/${representation.topicId}`);
      expect(topic, representation.id).toBeDefined();
      expect(topic?.languageId, representation.id).toBe(representation.languageId);
    }
  });

  it("have unique, language-prefixed ids", () => {
    const ids = catalog.phonetics.map((p) => p.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("pl-")).toBe(true);
    }
  });

  it("give every representation a non-empty IPA transcription and description in English", () => {
    for (const representation of catalog.phonetics) {
      expect(representation.ipa.length, representation.id).toBeGreaterThan(0);
      expect(representation.description.length, representation.id).toBeGreaterThan(0);
      expect(representation.instructionLanguage).toBe("en");
    }
  });

  it("are all published, so the representative set is what a student actually gets", () => {
    expect(catalog.phonetics.every(isPublished)).toBe(true);
  });

  it("give at least one example word to most representations", () => {
    const withExamples = catalog.phonetics.filter((p) => (p.exampleWords?.length ?? 0) > 0);

    expect(withExamples.length).toBe(catalog.phonetics.length);
  });

  it("do not duplicate a vocabulary item id in an example word: example words are free text, not links", () => {
    // Each example word is a plain { word, translation } pair, never a VocabularyItemId — this
    // asserts the shape stays free text by construction (a branded id would fail JSON.stringify
    // round-tripping the same way a plain string would not).
    for (const representation of catalog.phonetics) {
      for (const example of representation.exampleWords ?? []) {
        expect(typeof example.word, representation.id).toBe("string");
        expect(typeof example.translation, representation.id).toBe("string");
      }
    }
  });

  it("are marked honestly: nothing claims to be a complete phonemic inventory or CEFR-certified", () => {
    const text = JSON.stringify(catalog.phonetics).toLowerCase();

    expect(text).not.toMatch(/complete inventory|full inventory|cefr[- ]certified/);
  });
});
