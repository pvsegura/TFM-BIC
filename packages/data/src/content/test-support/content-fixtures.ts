import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/** Relative path (posix, from the content root) -> file body. An object is
 * written as JSON; a string is written verbatim (for malformed-file tests). */
export type FixtureFiles = Record<string, unknown>;

export interface ContentRootHandle {
  /** A throw-away content root (the folder that contains `languages/`). */
  root: string;
  cleanup: () => Promise<void>;
}

/** Writes `files` under a fresh temp directory. Tests use this instead of the
 * real `content/` so they control every byte the loader sees. */
export async function makeContentRoot(files: FixtureFiles): Promise<ContentRootHandle> {
  const root = await mkdtemp(path.join(tmpdir(), "tfm-content-"));
  for (const [relative, body] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(
      target,
      typeof body === "string" ? body : JSON.stringify(body, null, 2),
      "utf8",
    );
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export function languageFile(code: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    code,
    name: `Language ${code}`,
    nativeName: `Native ${code}`,
    locale: code,
    direction: "ltr",
    isActive: true,
    levels: [{ id: "a1", status: "available" }],
    ...overrides,
  };
}

export function contentFile(
  id: string,
  languageId: string,
  levelId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: 1,
    id,
    languageId,
    levelId,
    type: "lesson",
    status: "published",
    order: 10,
    instructionLanguage: "en",
    title: `Title ${id}`,
    description: `Description ${id}`,
    blocks: [{ type: "explanation", text: `Body ${id}` }],
    ...overrides,
  };
}

/** An exercise file for a lesson. Defaults to a valid true/false exercise. */
export function exerciseFile(
  id: string,
  languageId: string,
  levelId: string,
  lessonId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: 1,
    id,
    languageId,
    levelId,
    lessonId,
    type: "true-false",
    status: "published",
    order: 10,
    instructionLanguage: "en",
    prompt: `Prompt ${id}`,
    configuration: { correctAnswer: true },
    ...overrides,
  };
}

/** A complete, valid one-language tree for `code` (a fictional code in tests). */
export function validTree(code = "xx"): FixtureFiles {
  return {
    [`languages/${code}/language.json`]: languageFile(code),
    [`languages/${code}/levels/a1/content/${code}-one.json`]: contentFile(
      `${code}-one`,
      code,
      "a1",
    ),
  };
}
