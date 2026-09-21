import { afterEach, describe, expect, it } from "vitest";

import { loadContentCatalog } from "./load-content-catalog.js";
import {
  contentFile,
  exerciseFile,
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

const messagesOf = (issues: { location: string; message: string }[]) =>
  issues.map((issue) => `${issue.location}: ${issue.message}`).join("\n");

const DIR = "languages/xx/levels/a1/exercises";
const exercisePath = (id: string) => `${DIR}/${id}.json`;

/** The valid tree (one lesson, `xx-one`) plus the given exercise files. */
function withExercises(files: FixtureFiles): FixtureFiles {
  return { ...validTree("xx"), ...files };
}

const choice = {
  type: "multiple-choice",
  explanation: "Because.",
  configuration: {
    options: [
      { id: "a", text: "First" },
      { id: "b", text: "Second" },
    ],
    correctOptionId: "b",
  },
};
const typed = {
  type: "text-answer",
  configuration: { acceptedAnswers: ["yes", "yes."], caseSensitive: true },
};

describe("loading exercises", () => {
  it("loads exercises of every type into the catalog, tied to their lesson", async () => {
    const result = await load(
      withExercises({
        [exercisePath("xx-one-choice")]: exerciseFile("xx-one-choice", "xx", "a1", "xx-one", {
          ...choice,
          order: 10,
        }),
        [exercisePath("xx-one-typed")]: exerciseFile("xx-one-typed", "xx", "a1", "xx-one", {
          ...typed,
          order: 20,
        }),
        [exercisePath("xx-one-statement")]: exerciseFile("xx-one-statement", "xx", "a1", "xx-one", {
          order: 30,
        }),
      }),
    );

    if (!result.ok) {
      throw new Error(messagesOf(result.issues));
    }
    expect(result.catalog.exercises.map((e) => [e.id, e.type, e.lessonId])).toEqual([
      ["xx-one-choice", "multiple-choice", "xx-one"],
      ["xx-one-statement", "true-false", "xx-one"],
      ["xx-one-typed", "text-answer", "xx-one"],
    ]);
  });

  it("carries the configuration and explanation and leaves out file-format fields", async () => {
    const result = await load(
      withExercises({
        [exercisePath("xx-one-choice")]: exerciseFile(
          "xx-one-choice",
          "xx",
          "a1",
          "xx-one",
          choice,
        ),
      }),
    );

    if (!result.ok) {
      throw new Error(messagesOf(result.issues));
    }
    const [exercise] = result.catalog.exercises;
    expect(exercise).toMatchObject({
      id: "xx-one-choice",
      languageId: "xx",
      levelId: "a1",
      status: "published",
      order: 10,
      instructionLanguage: "en",
      explanation: "Because.",
      configuration: { correctOptionId: "b" },
    });
    expect(exercise).not.toHaveProperty("schemaVersion");
  });

  it("applies the documented default when a text exercise does not state case sensitivity", async () => {
    const result = await load(
      withExercises({
        [exercisePath("xx-one-typed")]: exerciseFile("xx-one-typed", "xx", "a1", "xx-one", {
          type: "text-answer",
          configuration: { acceptedAnswers: ["yes"] },
        }),
      }),
    );

    if (!result.ok) {
      throw new Error(messagesOf(result.issues));
    }
    expect(result.catalog.exercises[0]).toMatchObject({
      configuration: { acceptedAnswers: ["yes"], caseSensitive: false },
    });
  });

  it("loads a tree with no exercises folder at all", async () => {
    const result = await load(validTree("xx"));

    if (!result.ok) {
      throw new Error(messagesOf(result.issues));
    }
    expect(result.catalog.exercises).toEqual([]);
  });

  it("loads exercises of several languages from their own folders, with no per-language code", async () => {
    const result = await load({
      ...validTree("xx"),
      ...validTree("yy"),
      [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one"),
      "languages/yy/levels/a1/exercises/yy-one-a.json": exerciseFile(
        "yy-one-a",
        "yy",
        "a1",
        "yy-one",
      ),
    });

    if (!result.ok) {
      throw new Error(messagesOf(result.issues));
    }
    expect(result.catalog.exercises.map((e) => e.id)).toEqual(["xx-one-a", "yy-one-a"]);
  });

  it("ignores files that are not exercises (README.md, notes)", async () => {
    const result = await load(
      withExercises({ [`${DIR}/README.md`]: "# notes", [`${DIR}/notes.txt`]: "hello" }),
    );

    expect(result.ok).toBe(true);
  });

  it("reads exercises in a stable order, whatever the file system returns", async () => {
    const files = withExercises({
      [exercisePath("xx-one-c")]: exerciseFile("xx-one-c", "xx", "a1", "xx-one", { order: 3 }),
      [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", { order: 1 }),
      [exercisePath("xx-one-b")]: exerciseFile("xx-one-b", "xx", "a1", "xx-one", { order: 2 }),
    });

    const first = await load(files);
    await handle?.cleanup();
    const second = await load(files);

    if (!first.ok || !second.ok) {
      throw new Error("expected success");
    }
    expect(first.catalog.exercises.map((e) => e.id)).toEqual(["xx-one-a", "xx-one-b", "xx-one-c"]);
    expect(second.catalog.exercises.map((e) => e.id)).toEqual(
      first.catalog.exercises.map((e) => e.id),
    );
  });

  describe("rejects", () => {
    it("an unknown exercise type, naming the file", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            type: "matching",
          }),
        }),
      );

      expect(issues.some((issue) => issue.location === `${DIR}/xx-one-a.json`)).toBe(true);
    });

    it("a malformed configuration, with the file and the offending field", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            configuration: { correctAnswer: "yes" },
          }),
        }),
      );

      expect(messagesOf(issues)).toContain(`${DIR}/xx-one-a.json`);
      expect(messagesOf(issues)).toContain("configuration");
    });

    it("a multiple-choice exercise whose correct option is not offered", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            ...choice,
            configuration: { ...choice.configuration, correctOptionId: "zzz" },
          }),
        }),
      );

      expect(messagesOf(issues)).toContain("correctOptionId");
    });

    it("a text exercise with no accepted answers", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            type: "text-answer",
            configuration: { acceptedAnswers: [] },
          }),
        }),
      );

      expect(messagesOf(issues)).toContain("acceptedAnswers");
    });

    it("a missing prompt", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            prompt: undefined,
          }),
        }),
      );

      expect(messagesOf(issues)).toContain("prompt");
    });

    it("a prompt containing markup", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            prompt: "Click <img src=x onerror=alert(1)>",
          }),
        }),
      );

      expect(messagesOf(issues)).toContain("prompt");
    });

    it("an invalid order", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", { order: 0 }),
        }),
      );

      expect(messagesOf(issues)).toContain("order");
    });

    it("malformed JSON, naming the file", async () => {
      const issues = await issuesOf(withExercises({ [exercisePath("xx-one-a")]: "{ not json" }));

      expect(messagesOf(issues)).toContain(`${DIR}/xx-one-a.json: File is not valid JSON.`);
    });

    it("a file that names a different language than its folder", async () => {
      const issues = await issuesOf({
        ...validTree("xx"),
        ...validTree("yy"),
        [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "yy", "a1", "yy-one"),
      });

      expect(messagesOf(issues)).toContain('languageId "yy" does not match its folder "xx"');
    });

    it("a file that names a different level than its folder", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a2", "xx-one"),
        }),
      );

      expect(messagesOf(issues)).toContain('levelId "a2" does not match its folder "a1"');
    });

    it("a file whose name is not its id", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("wrong-name")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one"),
        }),
      );

      expect(messagesOf(issues)).toContain('File must be named "xx-one-a.json" (its id).');
    });

    it("an exercise folder inside a level folder that is not a CEFR level", async () => {
      const issues = await issuesOf(
        withExercises({
          "languages/xx/levels/zz9/exercises/xx-a.json": exerciseFile("xx-a", "xx", "a1", "xx-one"),
        }),
      );

      expect(messagesOf(issues)).toContain('Folder "zz9" is not a CEFR level id.');
    });

    it("an oversized file, without reading it", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            prompt: "a".repeat(300 * 1024),
          }),
        }),
      );

      expect(messagesOf(issues)).toContain("too large");
    });
  });

  describe("rejects, across files (the whole catalog)", () => {
    it("duplicate exercise ids", async () => {
      const files = withExercises({
        "languages/xx/levels/a1/content/xx-two.json": contentFile("xx-two", "xx", "a1", {
          order: 20,
        }),
        [exercisePath("xx-dup")]: exerciseFile("xx-dup", "xx", "a1", "xx-one"),
        "languages/xx/levels/a2/exercises/xx-dup.json": exerciseFile(
          "xx-dup",
          "xx",
          "a2",
          "xx-one",
        ),
        "languages/xx/language.json": languageFile("xx", {
          levels: [
            { id: "a1", status: "available" },
            { id: "a2", status: "planned" },
          ],
        }),
      });

      expect(messagesOf(await issuesOf(files))).toContain('Duplicate exercise id "xx-dup".');
    });

    it("an exercise whose lesson does not exist", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-missing"),
        }),
      );

      expect(messagesOf(issues)).toContain('references unknown lesson "xx-missing"');
    });

    it("an exercise attached to an explanation, not a lesson", async () => {
      const issues = await issuesOf(
        withExercises({
          "languages/xx/levels/a1/content/xx-note.json": contentFile("xx-note", "xx", "a1", {
            type: "explanation",
            order: 20,
          }),
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-note"),
        }),
      );

      expect(messagesOf(issues)).toContain('"xx-note", which is not a lesson');
    });

    it("two exercises with the same order in one lesson", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", { order: 5 }),
          [exercisePath("xx-one-b")]: exerciseFile("xx-one-b", "xx", "a1", "xx-one", { order: 5 }),
        }),
      );

      expect(messagesOf(issues)).toContain('reuses order 5 in lesson "xx-one"');
    });

    it("an exercise id that is also a content id", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one")]: exerciseFile("xx-one", "xx", "a1", "xx-one"),
        }),
      );

      expect(messagesOf(issues)).toContain(
        'Exercise id "xx-one" is also the id of a content item.',
      );
    });

    it("reports every problem at once, not just the first", async () => {
      const issues = await issuesOf(
        withExercises({
          [exercisePath("xx-one-a")]: exerciseFile("xx-one-a", "xx", "a1", "xx-one", {
            type: "matching",
          }),
          [exercisePath("xx-one-b")]: exerciseFile("xx-one-b", "xx", "a1", "xx-one", {
            order: "first",
          }),
          [exercisePath("xx-one-c")]: "{",
        }),
      );

      expect(issues.length).toBeGreaterThanOrEqual(3);
    });
  });
});
