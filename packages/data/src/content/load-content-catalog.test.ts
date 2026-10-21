import { afterEach, describe, expect, it } from "vitest";

import { loadContentCatalog, MAX_CONTENT_FILE_BYTES } from "./load-content-catalog.js";
import {
  contentFile,
  languageFile,
  makeContentRoot,
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

const messagesOf = (issues: { message: string }[]) => issues.map((i) => i.message).join("\n");

describe("loadContentCatalog", () => {
  it("loads a valid tree into a catalog", async () => {
    const result = await load(validTree("xx"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.catalog.languages.map((l) => l.code)).toEqual(["xx"]);
    expect(result.catalog.languageLevels).toEqual([
      { languageId: "xx", levelId: "a1", status: "available" },
    ]);
    expect(result.catalog.content.map((c) => c.id)).toEqual(["xx-one"]);
  });

  it("loads several languages, each from its own folder, with no per-language code", async () => {
    const result = await load({ ...validTree("xx"), ...validTree("yy") });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.catalog.languages.map((l) => l.code)).toEqual(["xx", "yy"]);
  });

  it("does not carry file-format fields (schemaVersion) into the catalog", async () => {
    const result = await load(validTree());

    if (!result.ok) throw new Error("expected success");
    expect(result.catalog.languages[0]).not.toHaveProperty("schemaVersion");
    expect(result.catalog.languages[0]).not.toHaveProperty("levels");
    expect(result.catalog.content[0]).not.toHaveProperty("schemaVersion");
  });

  it("ignores files that are not content (README.md, notes)", async () => {
    const result = await load({
      ...validTree(),
      "languages/README.md": "# docs",
      "languages/xx/README.md": "# docs",
      "languages/xx/levels/a1/README.md": "# docs",
      "languages/xx/levels/a1/content/notes.txt": "not content",
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a planned level with a draft in preparation", async () => {
    const result = await load({
      ...validTree(),
      "languages/xx/language.json": languageFile("xx", {
        levels: [
          { id: "a1", status: "available" },
          { id: "a2", status: "planned" },
        ],
      }),
      "languages/xx/levels/a2/content/xx-later.json": contentFile("xx-later", "xx", "a2", {
        status: "draft",
      }),
    });

    expect(result.ok).toBe(true);
  });

  describe("rejects", () => {
    it("a missing content root", async () => {
      handle = await makeContentRoot({});
      const result = await loadContentCatalog(`${handle.root}/does-not-exist`);

      expect(result.ok).toBe(false);
    });

    it("a language folder without language.json", async () => {
      const issues = await issuesOf({
        "languages/xx/levels/a1/content/xx-one.json": contentFile("xx-one", "xx", "a1"),
      });

      expect(messagesOf(issues)).toContain("language.json");
      expect(issues[0]?.location).toBe("languages/xx");
    });

    it("malformed JSON, naming the file", async () => {
      const issues = await issuesOf({ "languages/xx/language.json": "{ not json" });

      expect(issues[0]?.location).toBe("languages/xx/language.json");
      expect(issues[0]?.message).toMatch(/not valid JSON/i);
    });

    it("a schema violation, with the file and the offending field", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/language.json": languageFile("xx", { direction: "sideways" }),
      });

      const issue = issues.find((i) => i.location === "languages/xx/language.json");
      expect(issue?.message).toContain("direction");
    });

    it("a language whose code differs from its folder name", async () => {
      const issues = await issuesOf({
        "languages/xx/language.json": languageFile("yy"),
        "languages/xx/levels/a1/content/yy-one.json": contentFile("yy-one", "yy", "a1"),
      });

      expect(messagesOf(issues)).toContain('does not match its folder "xx"');
    });

    it("a folder name that is not a valid language id", async () => {
      const issues = await issuesOf({ "languages/Polish/language.json": languageFile("pl") });

      expect(messagesOf(issues)).toContain("not a valid language id");
    });

    it("a level folder that is not a CEFR level", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/z9/content/xx-two.json": contentFile("xx-two", "xx", "a1"),
      });

      expect(messagesOf(issues)).toContain('"z9" is not a CEFR level');
    });

    it("a content file that names a different language than its folder", async () => {
      const issues = await issuesOf({
        ...validTree("xx"),
        ...validTree("yy"),
        "languages/xx/levels/a1/content/xx-two.json": contentFile("xx-two", "yy", "a1", {
          order: 2,
        }),
      });

      expect(messagesOf(issues)).toContain('languageId "yy" does not match its folder "xx"');
    });

    it("a content file that names a different level than its folder", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/a1/content/xx-two.json": contentFile("xx-two", "xx", "a2", {
          order: 2,
        }),
      });

      expect(messagesOf(issues)).toContain('levelId "a2" does not match its folder "a1"');
    });

    it("a content file whose name is not its id", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/a1/content/whatever.json": contentFile("xx-two", "xx", "a1", {
          order: 2,
        }),
      });

      expect(messagesOf(issues)).toContain('must be named "xx-two.json"');
    });

    it("duplicate content ids", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/a1/content/xx-one.json": contentFile("xx-one", "xx", "a1"),
        "languages/xx/language.json": languageFile("xx", {
          levels: [
            { id: "a1", status: "available" },
            { id: "a2", status: "available" },
          ],
        }),
        "languages/xx/levels/a2/content/xx-one.json": contentFile("xx-one", "xx", "a2"),
      });

      expect(messagesOf(issues)).toContain('Duplicate content id "xx-one"');
    });

    it("an invalid ordering (two items with the same order)", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/a1/content/xx-two.json": contentFile("xx-two", "xx", "a1"),
      });

      expect(messagesOf(issues)).toContain("reuses order 10");
    });

    it("an available level with no published content", async () => {
      const issues = await issuesOf({
        "languages/xx/language.json": languageFile("xx"),
      });

      expect(messagesOf(issues)).toContain("available but has no published content");
    });

    it("published content in a planned level", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/language.json": languageFile("xx", {
          levels: [
            { id: "a1", status: "available" },
            { id: "a2", status: "planned" },
          ],
        }),
        "languages/xx/levels/a2/content/xx-early.json": contentFile("xx-early", "xx", "a2"),
      });

      expect(messagesOf(issues)).toContain("is not available");
    });

    it("a content file with a script tag in its title", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/a1/content/xx-xss.json": contentFile("xx-xss", "xx", "a1", {
          order: 2,
          title: "<script>alert(1)</script>",
        }),
      });

      expect(messagesOf(issues)).toContain("plain text");
    });

    it("an oversized file, without reading it", async () => {
      const issues = await issuesOf({
        ...validTree(),
        "languages/xx/levels/a1/content/xx-big.json": " ".repeat(MAX_CONTENT_FILE_BYTES + 1),
      });

      expect(messagesOf(issues)).toContain("too large");
    });

    it("reports every problem at once, not just the first", async () => {
      const issues = await issuesOf({
        "languages/xx/language.json": "{",
        "languages/yy/language.json": languageFile("yy", { direction: "up" }),
      });

      expect(issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
