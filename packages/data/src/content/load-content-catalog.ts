import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  contentFileSchema,
  exerciseFileSchema,
  languageFileSchema,
  phoneticFileSchema,
  videoFileSchema,
  vocabularyFileSchema,
} from "@tfm-bic/contracts";
import {
  isValidLanguageId,
  isValidLevelId,
  validateContentCatalog,
  type ContentCatalog,
  type ContentItem,
  type Exercise,
  type Language,
  type LanguageLevel,
  type PhoneticRepresentation,
  type PhoneticTopic,
  type VideoDefinition,
  type VocabularyCategory,
  type VocabularyItem,
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

interface ExpectedLocation {
  languageId: string;
  levelId: string;
  fileName: string;
}

/** A file must sit where it says it belongs: its folder names its language and
 * level, and its file name is its id. Records every mismatch; true when there is none. */
function isWhereItSaysItIs(
  file: { id: string; languageId: string; levelId: string },
  expected: ExpectedLocation,
  location: string,
  issues: ContentIssue[],
): boolean {
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
  return consistent;
}

async function loadContentFile(
  absolute: string,
  location: string,
  expected: ExpectedLocation,
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
  if (!isWhereItSaysItIs(file, expected, location, issues)) {
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

async function loadExerciseFile(
  absolute: string,
  location: string,
  expected: ExpectedLocation,
  issues: ContentIssue[],
): Promise<Exercise | undefined> {
  const raw = await readJson(absolute, location, issues);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = exerciseFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ location, message: describeSchemaIssue(issue) });
    }
    return undefined;
  }

  // The format's own `schemaVersion` is not part of the exercise; everything else is, and the
  // assignment to `Exercise` is checked by the compiler, so the file format and the domain
  // model cannot drift apart unnoticed.
  const { schemaVersion: _formatVersion, ...exercise } = parsed.data;
  return isWhereItSaysItIs(exercise, expected, location, issues) ? exercise : undefined;
}

interface LoadedVocabulary {
  category: VocabularyCategory;
  items: VocabularyItem[];
}

/**
 * One category file: its category and every entry in it. The file must sit in its language's
 * `vocabulary/` folder and be named after its category id; its entries take the language, the
 * category and the instruction language from the file, so an entry can never disagree with them.
 */
async function loadVocabularyFile(
  absolute: string,
  location: string,
  expected: { languageId: string; fileName: string },
  issues: ContentIssue[],
): Promise<LoadedVocabulary | undefined> {
  const raw = await readJson(absolute, location, issues);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = vocabularyFileSchema.safeParse(raw);
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
  if (expected.fileName !== `${file.id}.json`) {
    issues.push({ location, message: `File must be named "${file.id}.json" (its id).` });
    consistent = false;
  }
  if (!consistent) {
    return undefined;
  }

  const { languageId, instructionLanguage } = file;
  return {
    category: {
      id: file.id,
      languageId,
      status: file.status,
      order: file.order,
      instructionLanguage,
      title: file.title,
      description: file.description,
    },
    items: file.items.map((item) => ({
      ...item,
      languageId,
      categoryId: file.id,
      instructionLanguage,
    })),
  };
}

async function loadVocabulary(
  languageDir: string,
  languageId: string,
  catalog: { vocabularyCategories: VocabularyCategory[]; vocabulary: VocabularyItem[] },
  issues: ContentIssue[],
): Promise<void> {
  const location = `languages/${languageId}/vocabulary`;
  const files = (await readDirectory(path.join(languageDir, "vocabulary"))) ?? [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json")) {
      continue;
    }
    const loaded = await loadVocabularyFile(
      path.join(languageDir, "vocabulary", file.name),
      `${location}/${file.name}`,
      { languageId, fileName: file.name },
      issues,
    );
    if (loaded) {
      catalog.vocabularyCategories.push(loaded.category);
      catalog.vocabulary.push(...loaded.items);
    }
  }
}

interface LoadedPhonetics {
  topic: PhoneticTopic;
  items: PhoneticRepresentation[];
}

/**
 * One topic file: its topic and every representation in it. The file must sit in its language's
 * `phonetics/` folder and be named after its topic id; its representations take the language, the
 * topic and the instruction language from the file, so a representation can never disagree with
 * them.
 */
async function loadPhoneticFile(
  absolute: string,
  location: string,
  expected: { languageId: string; fileName: string },
  issues: ContentIssue[],
): Promise<LoadedPhonetics | undefined> {
  const raw = await readJson(absolute, location, issues);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = phoneticFileSchema.safeParse(raw);
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
  if (expected.fileName !== `${file.id}.json`) {
    issues.push({ location, message: `File must be named "${file.id}.json" (its id).` });
    consistent = false;
  }
  if (!consistent) {
    return undefined;
  }

  const { languageId, instructionLanguage } = file;
  return {
    topic: {
      id: file.id,
      languageId,
      status: file.status,
      order: file.order,
      instructionLanguage,
      title: file.title,
      description: file.description,
    },
    items: file.items.map((item) => ({
      ...item,
      languageId,
      topicId: file.id,
      instructionLanguage,
    })),
  };
}

async function loadPhonetics(
  languageDir: string,
  languageId: string,
  catalog: { phoneticTopics: PhoneticTopic[]; phonetics: PhoneticRepresentation[] },
  issues: ContentIssue[],
): Promise<void> {
  const location = `languages/${languageId}/phonetics`;
  const files = (await readDirectory(path.join(languageDir, "phonetics"))) ?? [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json")) {
      continue;
    }
    const loaded = await loadPhoneticFile(
      path.join(languageDir, "phonetics", file.name),
      `${location}/${file.name}`,
      { languageId, fileName: file.name },
      issues,
    );
    if (loaded) {
      catalog.phoneticTopics.push(loaded.topic);
      catalog.phonetics.push(...loaded.items);
    }
  }
}

/**
 * One video definition file: `content/languages/<languageId>/videos/<videoId>.json` — a single
 * item per file, like a lesson content item, not a topic-with-items file like phonetics or
 * vocabulary (a video has no grouping concept in this milestone). The render project it points to
 * (`scriptPath`, under `content/video-scripts/`) is never read here — only the provider adapter
 * reads it.
 */
async function loadVideoFile(
  absolute: string,
  location: string,
  expected: { languageId: string; fileName: string },
  issues: ContentIssue[],
): Promise<VideoDefinition | undefined> {
  const raw = await readJson(absolute, location, issues);
  if (raw === undefined) {
    return undefined;
  }

  const parsed = videoFileSchema.safeParse(raw);
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
    status: file.status,
    order: file.order,
    instructionLanguage: file.instructionLanguage,
    title: file.title,
    description: file.description,
    relatedContentId: file.relatedContentId,
    scriptPath: file.scriptPath,
  };
}

async function loadVideos(
  languageDir: string,
  languageId: string,
  catalog: { videoDefinitions: VideoDefinition[] },
  issues: ContentIssue[],
): Promise<void> {
  const location = `languages/${languageId}/videos`;
  const files = (await readDirectory(path.join(languageDir, "videos"))) ?? [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json")) {
      continue;
    }
    const loaded = await loadVideoFile(
      path.join(languageDir, "videos", file.name),
      `${location}/${file.name}`,
      { languageId, fileName: file.name },
      issues,
    );
    if (loaded) {
      catalog.videoDefinitions.push(loaded);
    }
  }
}

/** Reads every `.json` file in one folder with `load`, in name order, keeping what is valid. */
async function loadFolder<T>(
  directory: string,
  location: string,
  scope: { languageId: string; levelId: string },
  load: (
    absolute: string,
    location: string,
    expected: ExpectedLocation,
    issues: ContentIssue[],
  ) => Promise<T | undefined>,
  into: T[],
  issues: ContentIssue[],
): Promise<void> {
  const files = (await readDirectory(directory)) ?? [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json")) {
      continue;
    }
    const loaded = await load(
      path.join(directory, file.name),
      `${location}/${file.name}`,
      { ...scope, fileName: file.name },
      issues,
    );
    if (loaded) {
      into.push(loaded);
    }
  }
}

async function loadLevel(
  languageDir: string,
  languageId: string,
  levelName: string,
  catalog: { content: ContentItem[]; exercises: Exercise[] },
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

  const levelDir = path.join(languageDir, "levels", levelName);
  const scope = { languageId, levelId: levelName };
  await loadFolder(
    path.join(levelDir, "content"),
    `${levelLocation}/content`,
    scope,
    loadContentFile,
    catalog.content,
    issues,
  );
  await loadFolder(
    path.join(levelDir, "exercises"),
    `${levelLocation}/exercises`,
    scope,
    loadExerciseFile,
    catalog.exercises,
    issues,
  );
}

async function loadLanguage(
  languagesDir: string,
  languageId: string,
  catalog: {
    languages: Language[];
    languageLevels: LanguageLevel[];
    content: ContentItem[];
    exercises: Exercise[];
    vocabularyCategories: VocabularyCategory[];
    vocabulary: VocabularyItem[];
    phoneticTopics: PhoneticTopic[];
    phonetics: PhoneticRepresentation[];
    videoDefinitions: VideoDefinition[];
  },
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
      await loadLevel(languageDir, languageId, folder.name, catalog, issues);
    }
  }

  await loadVocabulary(languageDir, languageId, catalog, issues);
  await loadPhonetics(languageDir, languageId, catalog, issues);
  await loadVideos(languageDir, languageId, catalog, issues);
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
 *   content/languages/<languageId>/levels/<levelId>/exercises/<exerciseId>.json
 *   content/languages/<languageId>/vocabulary/<categoryId>.json
 *   content/languages/<languageId>/phonetics/<topicId>.json
 *   content/languages/<languageId>/videos/<videoId>.json
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
    exercises: [] as Exercise[],
    vocabularyCategories: [] as VocabularyCategory[],
    vocabulary: [] as VocabularyItem[],
    phoneticTopics: [] as PhoneticTopic[],
    phonetics: [] as PhoneticRepresentation[],
    videoDefinitions: [] as VideoDefinition[],
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
