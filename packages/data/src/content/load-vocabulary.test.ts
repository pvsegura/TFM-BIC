import { afterEach, describe, expect, it } from "vitest";

import { loadContentCatalog } from "./load-content-catalog.js";
import {
  contentFile,
  languageFile,
  makeContentRoot,
  validTree,
  vocabularyEntry,
  vocabularyFile,
  type ContentRootHandle,
  type FixtureFiles,
} from "./test-support/content-fixtures.js";

let handle: ContentRootHandle | undefined;

afterEach(async () => {
  await handle?.cleanup();
  handle = undefined;
});

async function load(files: FixtureFiles) {
  handle = await makeContentRoot(files);
  return loadContentCatalog(handle.root);
}

async function issuesOf(files: FixtureFiles) {
  const result = await load(files);
  if (result.ok) {
    throw new Error("expected the content to be rejected, but it loaded");
  }
  return result.issues;
}

const messagesOf = (issues: { location: string; message: string }[]) =>
  issues.map((issue) => `${issue.location}: ${issue.message}`).join("\n");

const DIR = "languages/xx/vocabulary";
const vocabularyPath = (categoryId: string) => `${DIR}/${categoryId}.json`;

/** The valid tree (one lesson) plus the given vocabulary files. */
function tree(vocabulary: FixtureFiles, code = "xx"): FixtureFiles {
  return { ...validTree(code), ...vocabulary };
}

describe("loadContentCatalog — vocabulary", () => {
  it("loads a category file into a category and its entries, which inherit what the file says", async () => {
    const result = await load(
      tree({
        [vocabularyPath("food")]: vocabularyFile("food", "xx", {
          title: "Food",
          description: "Things to eat.",
          instructionLanguage: "es",
          items: [
            vocabularyEntry("xx-bread", { lemma: "bread", translation: "pan", order: 10 }),
            vocabularyEntry("xx-water", { lemma: "water", translation: "agua", order: 20 }),
          ],
        }),
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.catalog.vocabularyCategories).toEqual([
      {
        id: "food",
        languageId: "xx",
        status: "published",
        order: 10,
        instructionLanguage: "es",
        title: "Food",
        description: "Things to eat.",
      },
    ]);
    expect(result.catalog.vocabulary.map((item) => item.id)).toEqual(["xx-bread", "xx-water"]);
    expect(result.catalog.vocabulary[0]).toMatchObject({
      languageId: "xx",
      categoryId: "food",
      instructionLanguage: "es",
      lemma: "bread",
      translation: "pan",
    });
  });

  it("carries the optional grammar, level and example fields through, and leaves the missing ones missing", async () => {
    const result = await load(
      tree({
        [vocabularyPath("food")]: vocabularyFile("food", "xx", {
          items: [
            vocabularyEntry("xx-bread", {
              levelId: "a1",
              partOfSpeech: "noun",
              gender: "neuter",
              plural: "breads",
              note: "Countable here.",
              example: { text: "A bread.", translation: "Un pan." },
            }),
            vocabularyEntry("xx-water", { order: 20 }),
          ],
        }),
      }),
    );

    if (!result.ok) throw new Error(messagesOf(result.issues));
    expect(result.catalog.vocabulary[0]).toMatchObject({
      levelId: "a1",
      partOfSpeech: "noun",
      gender: "neuter",
      plural: "breads",
      note: "Countable here.",
      example: { text: "A bread.", translation: "Un pan." },
    });
    for (const absent of ["levelId", "partOfSpeech", "gender", "plural", "note", "example"]) {
      expect(result.catalog.vocabulary[1], absent).not.toHaveProperty(absent);
    }
  });

  it("does not carry file-format fields (schemaVersion, items) into a category", async () => {
    const result = await load(tree({ [vocabularyPath("food")]: vocabularyFile("food", "xx") }));

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.vocabularyCategories[0]).not.toHaveProperty("schemaVersion");
    expect(result.catalog.vocabularyCategories[0]).not.toHaveProperty("items");
  });

  it("loads a language with no vocabulary folder as having no vocabulary", async () => {
    const result = await load(validTree());

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.vocabularyCategories).toEqual([]);
    expect(result.catalog.vocabulary).toEqual([]);
  });

  it("loads several languages' vocabulary, the same category id in each, with no per-language code", async () => {
    const result = await load({
      ...validTree("xx"),
      ...validTree("yy"),
      "languages/xx/vocabulary/food.json": vocabularyFile("food", "xx"),
      "languages/yy/vocabulary/food.json": vocabularyFile("food", "yy"),
    });

    if (!result.ok) throw new Error(messagesOf(result.issues));
    expect(result.catalog.vocabularyCategories.map((c) => `${c.languageId}/${c.id}`)).toEqual([
      "xx/food",
      "yy/food",
    ]);
    expect(result.catalog.vocabulary.map((item) => item.languageId)).toEqual(["xx", "yy"]);
  });

  it("loads a right-to-left language the same way as any other", async () => {
    const result = await load({
      "languages/qq/language.json": languageFile("qq", { direction: "rtl" }),
      "languages/qq/levels/a1/content/qq-one.json": contentFile("qq-one", "qq", "a1"),
      "languages/qq/vocabulary/greetings.json": vocabularyFile("greetings", "qq"),
    });

    expect(result.ok).toBe(true);
  });

  it("reads the files in name order, so the result never depends on the file system", async () => {
    const result = await load(
      tree({
        [vocabularyPath("zebra")]: vocabularyFile("zebra", "xx", { order: 20 }),
        [vocabularyPath("apple")]: vocabularyFile("apple", "xx", { order: 10 }),
      }),
    );

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.vocabularyCategories.map((c) => c.id)).toEqual(["apple", "zebra"]);
  });

  it("ignores files that are not JSON, such as a README", async () => {
    const result = await load(
      tree({
        [`${DIR}/README.md`]: "# notes",
        [vocabularyPath("food")]: vocabularyFile("food", "xx"),
      }),
    );

    expect(result.ok).toBe(true);
  });

  describe("rejects", () => {
    it("a file whose languageId is not its folder's language", async () => {
      const issues = await issuesOf(
        tree({ [vocabularyPath("food")]: vocabularyFile("food", "yy") }),
      );

      expect(messagesOf(issues)).toContain(
        `${vocabularyPath("food")}: languageId "yy" does not match its folder "xx".`,
      );
    });

    it("a file that is not named after its category id", async () => {
      const issues = await issuesOf(
        tree({ [vocabularyPath("other")]: vocabularyFile("food", "xx") }),
      );

      expect(messagesOf(issues)).toContain('File must be named "food.json" (its id).');
    });

    it("a file that fails its schema, naming the field", async () => {
      const issues = await issuesOf(
        tree({
          [vocabularyPath("food")]: vocabularyFile("food", "xx", {
            items: [vocabularyEntry("xx-bread", { gender: "male" })],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(`${vocabularyPath("food")}: items.0.gender`);
    });

    it("a file with an entry carrying a key the format does not know", async () => {
      const issues = await issuesOf(
        tree({
          [vocabularyPath("food")]: vocabularyFile("food", "xx", {
            items: [vocabularyEntry("xx-bread", { audioUrl: "https://example.com/a.mp3" })],
          }),
        }),
      );

      expect(issues.length).toBeGreaterThan(0);
    });

    it("a file that is not valid JSON", async () => {
      const issues = await issuesOf(tree({ [vocabularyPath("food")]: "{ not json" }));

      expect(messagesOf(issues)).toContain(`${vocabularyPath("food")}: File is not valid JSON.`);
    });

    it("a vocabulary file that is far too large, without reading it", async () => {
      const issues = await issuesOf(
        tree({ [vocabularyPath("food")]: JSON.stringify({ padding: "x".repeat(300 * 1024) }) }),
      );

      expect(messagesOf(issues)).toContain("File is too large");
    });

    it("an id used by two entries, even in different categories", async () => {
      const issues = await issuesOf(
        tree({
          [vocabularyPath("food")]: vocabularyFile("food", "xx", {
            items: [vocabularyEntry("xx-bread")],
          }),
          [vocabularyPath("drink")]: vocabularyFile("drink", "xx", {
            order: 20,
            items: [vocabularyEntry("xx-bread")],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain('catalog: Duplicate vocabulary item id "xx-bread".');
    });

    it("an entry in a level its language does not declare", async () => {
      const issues = await issuesOf(
        tree({
          [vocabularyPath("food")]: vocabularyFile("food", "xx", {
            items: [vocabularyEntry("xx-bread", { levelId: "c2" })],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(
        'Vocabulary item "xx-bread" is in level "c2", which language "xx" does not declare.',
      );
    });

    it("a published entry in a level that is not available", async () => {
      const issues = await issuesOf(
        tree({
          "languages/xx/language.json": languageFile("xx", {
            levels: [
              { id: "a1", status: "available" },
              { id: "a2", status: "planned" },
            ],
          }),
          [vocabularyPath("food")]: vocabularyFile("food", "xx", {
            items: [vocabularyEntry("xx-bread", { levelId: "a2" })],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(
        'Published vocabulary item "xx-bread" is in xx/a2, which is not available.',
      );
    });
  });
});
