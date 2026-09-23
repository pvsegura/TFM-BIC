import { afterEach, describe, expect, it } from "vitest";

import { loadContentCatalog } from "./load-content-catalog.js";
import {
  contentFile,
  languageFile,
  makeContentRoot,
  phoneticEntry,
  phoneticFile,
  validTree,
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

const DIR = "languages/xx/phonetics";
const phoneticsPath = (topicId: string) => `${DIR}/${topicId}.json`;

/** The valid tree (one lesson) plus the given phonetics files. */
function tree(phonetics: FixtureFiles, code = "xx"): FixtureFiles {
  return { ...validTree(code), ...phonetics };
}

describe("loadContentCatalog — phonetics", () => {
  it("loads a topic file into a topic and its representations, which inherit what the file says", async () => {
    const result = await load(
      tree({
        [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
          title: "Consonants",
          description: "Consonant sounds.",
          instructionLanguage: "es",
          items: [
            phoneticEntry("xx-ipa-ts", { ipa: "t͡ʂ", description: "A sound.", order: 10 }),
            phoneticEntry("xx-ipa-a", { ipa: "a", description: "Another sound.", order: 20 }),
          ],
        }),
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.catalog.phoneticTopics).toEqual([
      {
        id: "consonants",
        languageId: "xx",
        status: "published",
        order: 10,
        instructionLanguage: "es",
        title: "Consonants",
        description: "Consonant sounds.",
      },
    ]);
    expect(result.catalog.phonetics.map((item) => item.id)).toEqual(["xx-ipa-ts", "xx-ipa-a"]);
    expect(result.catalog.phonetics[0]).toMatchObject({
      languageId: "xx",
      topicId: "consonants",
      instructionLanguage: "es",
      ipa: "t͡ʂ",
      description: "A sound.",
    });
  });

  it("carries the optional level, note and example words through, and leaves the missing ones missing", async () => {
    const result = await load(
      tree({
        [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
          items: [
            phoneticEntry("xx-ipa-ts", {
              levelId: "a1",
              note: "Contrasts with ć.",
              exampleWords: [{ word: "czas", translation: "time" }],
            }),
            phoneticEntry("xx-ipa-a", { order: 20 }),
          ],
        }),
      }),
    );

    if (!result.ok) throw new Error(messagesOf(result.issues));
    expect(result.catalog.phonetics[0]).toMatchObject({
      levelId: "a1",
      note: "Contrasts with ć.",
      exampleWords: [{ word: "czas", translation: "time" }],
    });
    for (const absent of ["levelId", "note", "exampleWords"]) {
      expect(result.catalog.phonetics[1], absent).not.toHaveProperty(absent);
    }
  });

  it("does not carry file-format fields (schemaVersion, items) into a topic", async () => {
    const result = await load(
      tree({ [phoneticsPath("consonants")]: phoneticFile("consonants", "xx") }),
    );

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.phoneticTopics[0]).not.toHaveProperty("schemaVersion");
    expect(result.catalog.phoneticTopics[0]).not.toHaveProperty("items");
  });

  it("loads a language with no phonetics folder as having no phonetics", async () => {
    const result = await load(validTree());

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.phoneticTopics).toEqual([]);
    expect(result.catalog.phonetics).toEqual([]);
  });

  it("loads several languages' phonetics, the same topic id in each, with no per-language code", async () => {
    const result = await load({
      ...validTree("xx"),
      ...validTree("yy"),
      "languages/xx/phonetics/consonants.json": phoneticFile("consonants", "xx"),
      "languages/yy/phonetics/consonants.json": phoneticFile("consonants", "yy"),
    });

    if (!result.ok) throw new Error(messagesOf(result.issues));
    expect(result.catalog.phoneticTopics.map((t) => `${t.languageId}/${t.id}`)).toEqual([
      "xx/consonants",
      "yy/consonants",
    ]);
    expect(result.catalog.phonetics.map((item) => item.languageId)).toEqual(["xx", "yy"]);
  });

  it("loads a right-to-left language the same way as any other", async () => {
    const result = await load({
      "languages/qq/language.json": languageFile("qq", { direction: "rtl" }),
      "languages/qq/levels/a1/content/qq-one.json": contentFile("qq-one", "qq", "a1"),
      "languages/qq/phonetics/consonants.json": phoneticFile("consonants", "qq"),
    });

    expect(result.ok).toBe(true);
  });

  it("reads the files in name order, so the result never depends on the file system", async () => {
    const result = await load(
      tree({
        [phoneticsPath("vowels")]: phoneticFile("vowels", "xx", { order: 20 }),
        [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", { order: 10 }),
      }),
    );

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.phoneticTopics.map((t) => t.id)).toEqual(["consonants", "vowels"]);
  });

  it("ignores files that are not JSON, such as a README", async () => {
    const result = await load(
      tree({
        [`${DIR}/README.md`]: "# notes",
        [phoneticsPath("consonants")]: phoneticFile("consonants", "xx"),
      }),
    );

    expect(result.ok).toBe(true);
  });

  describe("rejects", () => {
    it("a file whose languageId is not its folder's language", async () => {
      const issues = await issuesOf(
        tree({ [phoneticsPath("consonants")]: phoneticFile("consonants", "yy") }),
      );

      expect(messagesOf(issues)).toContain(
        `${phoneticsPath("consonants")}: languageId "yy" does not match its folder "xx".`,
      );
    });

    it("a file that is not named after its topic id", async () => {
      const issues = await issuesOf(
        tree({ [phoneticsPath("other")]: phoneticFile("consonants", "xx") }),
      );

      expect(messagesOf(issues)).toContain('File must be named "consonants.json" (its id).');
    });

    it("a file that fails its schema, naming the field", async () => {
      const issues = await issuesOf(
        tree({
          [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
            items: [phoneticEntry("xx-ipa-ts", { ipa: "" })],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(`${phoneticsPath("consonants")}: items.0.ipa`);
    });

    it("a file with an entry carrying a key the format does not know", async () => {
      const issues = await issuesOf(
        tree({
          [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
            items: [phoneticEntry("xx-ipa-ts", { audioUrl: "https://example.com/a.mp3" })],
          }),
        }),
      );

      expect(issues.length).toBeGreaterThan(0);
    });

    it("a file that is not valid JSON", async () => {
      const issues = await issuesOf(tree({ [phoneticsPath("consonants")]: "{ not json" }));

      expect(messagesOf(issues)).toContain(
        `${phoneticsPath("consonants")}: File is not valid JSON.`,
      );
    });

    it("a phonetics file that is far too large, without reading it", async () => {
      const issues = await issuesOf(
        tree({
          [phoneticsPath("consonants")]: JSON.stringify({ padding: "x".repeat(300 * 1024) }),
        }),
      );

      expect(messagesOf(issues)).toContain("File is too large");
    });

    it("an id used by two representations, even in different topics", async () => {
      const issues = await issuesOf(
        tree({
          [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
            items: [phoneticEntry("xx-ipa-ts")],
          }),
          [phoneticsPath("vowels")]: phoneticFile("vowels", "xx", {
            order: 20,
            items: [phoneticEntry("xx-ipa-ts")],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(
        'catalog: Duplicate phonetic representation id "xx-ipa-ts".',
      );
    });

    it("an entry in a level its language does not declare", async () => {
      const issues = await issuesOf(
        tree({
          [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
            items: [phoneticEntry("xx-ipa-ts", { levelId: "c2" })],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(
        'Phonetic representation "xx-ipa-ts" is in level "c2", which language "xx" does not declare.',
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
          [phoneticsPath("consonants")]: phoneticFile("consonants", "xx", {
            items: [phoneticEntry("xx-ipa-ts", { levelId: "a2" })],
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(
        'Published phonetic representation "xx-ipa-ts" is in xx/a2, which is not available.',
      );
    });
  });
});
