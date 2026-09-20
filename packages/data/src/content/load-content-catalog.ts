import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { contentFileSchema, languageFileSchema } from "@tfm-bic/contracts";
import {
  isValidLanguageId,
  isValidLevelId,
  validateContentCatalog,
  type ContentCatalog,
  type ContentItem,
  type Language,
  type LanguageLevel,
} from "@tfm-bic/domain";

import type { ContentIssue } from "./content-validation.error.js";

/** Content files are small hand-authored JSON. A hard cap means an accidental
 * (or malicious) huge file is rejected before it is read into memory. */
export const MAX_CONTENT_FILE_BYTES = 256 * 1024;

export type LoadContentResult =
  { ok: true; catalog: ContentCatalog } | { ok: false; issues: ContentIssue[] };

interface SchemaIssueLike {
  path: readonly PropertyKey[];
  message: string;
}

function describeSchemaIssue(issue: SchemaIssueLike): string {
  const where = issue.path.map(String).join(".");
  return where.length > 0 ? `${where}: ${issue.message}` : issue.message;
}

/** Sorted so the result never depends on the file system's enumeration order. */
async function readDirectory(directory: string) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch {
    return null;
  }
}

/** Reads and parses one JSON file. Any failure is recorded as an issue and
 * yields `undefined`. Symlinks and non-files never reach here (callers only
 * pass real files), and no request-derived text is ever part of a path. */
async function readJson(
  absolute: string,
  location: string,
  issues: ContentIssue[],
): Promise<unknown> {
  try {
    const { size } = await stat(absolute);
    if (size > MAX_CONTENT_FILE_BYTES) {
      issues.push({
        location,
        message: `File is too large (${String(size)} bytes; the limit is ${String(MAX_CONTENT_FILE_BYTES)}).`,
      });
      return undefined;
    }
    return JSON.parse(await readFile(absolute, "utf8")) as unknown;
  } catch (error) {
    const reason =
      error instanceof SyntaxError ? "File is not valid JSON." : "File could not be read.";
    issues.push({ location, message: reason });
    return undefined;
  }
}

async function loadContentFile(
  absolute: string,
  location: string,
  expected: { languageId: string; levelId: string; fileName: string },
  issues: ContentIssue[],
): Promise<ContentItem | undefined> {
  const raw = await readJson(absolute, location, issues);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = contentFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ location, message: describeSchemaIssue(issue) });
    }
    return undefined;
  }

  const file = parsed.data;
  let consistent = true;
  if (file.languageId !== expected.languageId) {
    issues.push({
      location,
      message: `languageId "${file.languageId}" does not match its folder "${expected.languageId}".`,
    });
    consistent = false;
  }
  if (file.levelId !== expected.levelId) {
    issues.push({
      location,
      message: `levelId "${file.levelId}" does not match its folder "${expected.levelId}".`,
    });
    consistent = false;
  }
  if (expected.fileName !== `${file.id}.json`) {
    issues.push({ location, message: `File must be named "${file.id}.json" (its id).` });
    consistent = false;
  }
  if (!consistent) {
    return undefined;
  }

  return {
    id: file.id,
    languageId: file.languageId,
    levelId: file.levelId,
    type: file.type,
    status: file.status,
    order: file.order,
    instructionLanguage: file.instructionLanguage,
    title: file.title,
    description: file.description,
    blocks: file.blocks,
  };
}

async function loadLevelContent(
  languageDir: string,
  languageId: string,
  levelName: string,
  content: ContentItem[],
  issues: ContentIssue[],
): Promise<void> {
  const levelLocation = `languages/${languageId}/levels/${levelName}`;
  if (!isValidLevelId(levelName)) {
    issues.push({
      location: levelLocation,
      message: `Folder "${levelName}" is not a CEFR level id.`,
    });
    return;
  }

  const contentDir = path.join(languageDir, "levels", levelName, "content");
  const files = (await readDirectory(contentDir)) ?? [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json")) {
      continue;
    }
    const item = await loadContentFile(
      path.join(contentDir, file.name),
      `${levelLocation}/content/${file.name}`,
      { languageId, levelId: levelName, fileName: file.name },
      issues,
    );
    if (item) {
      content.push(item);
    }
  }
}

async function loadLanguage(
  languagesDir: string,
  languageId: string,
  catalog: { languages: Language[]; languageLevels: LanguageLevel[]; content: ContentItem[] },
  issues: ContentIssue[],
): Promise<void> {
  const languageLocation = `languages/${languageId}`;
  if (!isValidLanguageId(languageId)) {
    issues.push({
      location: languageLocation,
      message: `Folder name "${languageId}" is not a valid language id (expected a lowercase ISO 639 code).`,
    });
    return;
  }

  const languageDir = path.join(languagesDir, languageId);
  const fileLocation = `${languageLocation}/language.json`;
  const siblings = (await readDirectory(languageDir)) ?? [];
  if (siblings.some((entry) => entry.isFile() && entry.name === "language.json")) {
    const raw = await readJson(path.join(languageDir, "language.json"), fileLocation, issues);
    const parsed = raw === undefined ? undefined : languageFileSchema.safeParse(raw);
    if (parsed && !parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({ location: fileLocation, message: describeSchemaIssue(issue) });
      }
    } else if (parsed?.success) {
      const file = parsed.data;
      if (file.code !== languageId) {
        issues.push({
          location: fileLocation,
          message: `code "${file.code}" does not match its folder "${languageId}".`,
        });
      } else {
        catalog.languages.push({
          code: file.code,
          name: file.name,
          nativeName: file.nativeName,
          locale: file.locale,
          direction: file.direction,
          isActive: file.isActive,
        });
        for (const level of file.levels) {
          catalog.languageLevels.push({
            languageId: file.code,
            levelId: level.id,
            status: level.status,
          });
        }
      }
    }
  } else {
    issues.push({ location: languageLocation, message: "Missing language.json." });
  }

  const levelFolders = (await readDirectory(path.join(languageDir, "levels"))) ?? [];
  for (const folder of levelFolders) {
    if (folder.isDirectory()) {
      await loadLevelContent(languageDir, languageId, folder.name, catalog.content, issues);
    }
  }
}

/**
 * Reads the whole content tree under `contentRoot` and validates it: every
 * file against its schema, every file against its location, and the catalog as
 * a whole (duplicate ids, ordering, honest availability). Returns *every*
 * problem, not just the first. Nothing here — and no HTTP input — chooses which
 * paths are read: the only paths touched are those found by listing the tree.
 *
 *   content/languages/<languageId>/language.json
 *   content/languages/<languageId>/levels/<levelId>/content/<contentId>.json
 */
export async function loadContentCatalog(contentRoot: string): Promise<LoadContentResult> {
  const languagesDir = path.join(contentRoot, "languages");
  const languageFolders = await readDirectory(languagesDir);
  if (languageFolders === null) {
    return { ok: false, issues: [{ location: "languages", message: "Content folder not found." }] };
  }

  const issues: ContentIssue[] = [];
  const catalog = {
    languages: [] as Language[],
    languageLevels: [] as LanguageLevel[],
    content: [] as ContentItem[],
  };

  for (const folder of languageFolders) {
    if (folder.isDirectory()) {
      await loadLanguage(languagesDir, folder.name, catalog, issues);
    }
  }

  if (issues.length === 0) {
    for (const issue of validateContentCatalog(catalog)) {
      issues.push({ location: "catalog", message: issue.message });
    }
  }

  return issues.length === 0 ? { ok: true, catalog } : { ok: false, issues };
}
