import { exerciseIdBelongsToLanguage } from "../exercise/exercise-id.js";
import type { Exercise } from "../exercise/exercise.js";
import type { Language } from "../language/language.js";
import type { LanguageLevel } from "../language/language-level.js";
import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";
import { validatePhonetics } from "../phonetics/phonetics-catalog.js";
import type { PhoneticRepresentation } from "../phonetics/phonetic-representation.js";
import type { PhoneticTopic } from "../phonetics/phonetic-topic.js";
import { validateVocabulary } from "../vocabulary/vocabulary-catalog.js";
import type { VocabularyCategory } from "../vocabulary/vocabulary-category.js";
import type { VocabularyItem } from "../vocabulary/vocabulary-item.js";
import { contentIdBelongsToLanguage } from "./content-id.js";
import type { ContentItem } from "./content-item.js";
import { isPublished } from "./content-status.js";

/** Everything the platform knows about languages and their content. */
export interface ContentCatalog {
  languages: readonly Language[];
  languageLevels: readonly LanguageLevel[];
  content: readonly ContentItem[];
  /** Exercises, each tied to a lesson in `content`. */
  exercises: readonly Exercise[];
  /** Vocabulary topics (M9): each belongs to one language and groups its entries. */
  vocabularyCategories: readonly VocabularyCategory[];
  /** Vocabulary entries (M9): each belongs to one category of its own language. */
  vocabulary: readonly VocabularyItem[];
  /** Phonetics topics (M10): each belongs to one language and groups its representations. */
  phoneticTopics: readonly PhoneticTopic[];
  /** Phonetics representations (M10): each belongs to one language, optionally to one of its topics. */
  phonetics: readonly PhoneticRepresentation[];
}

export interface CatalogIssue {
  message: string;
}

function levelKey(languageId: LanguageId, levelId: LevelId): string {
  return `${languageId}/${levelId}`;
}

/**
 * Cross-item consistency rules that no single-file schema can see. Returns
 * every problem found (empty when consistent) so an author fixes them in one
 * pass. These rules are what keep availability honest: an `available` level
 * always has published content, and published content is never hidden behind
 * a level that is not available.
 */
export function validateContentCatalog(catalog: ContentCatalog): CatalogIssue[] {
  const issues: string[] = [];

  const languageIds = new Set<LanguageId>();
  for (const language of catalog.languages) {
    if (languageIds.has(language.code)) {
      issues.push(`Duplicate language "${language.code}".`);
    }
    languageIds.add(language.code);
  }

  const levelStatus = new Map<string, LanguageLevel["status"]>();
  for (const entry of catalog.languageLevels) {
    if (!languageIds.has(entry.languageId)) {
      issues.push(
        `Level "${entry.levelId}" is declared for unknown language "${entry.languageId}".`,
      );
      continue;
    }
    const key = levelKey(entry.languageId, entry.levelId);
    if (levelStatus.has(key)) {
      issues.push(
        `Language "${entry.languageId}" declares level "${entry.levelId}" more than once.`,
      );
      continue;
    }
    levelStatus.set(key, entry.status);
  }

  const contentIds = new Set<string>();
  const orders = new Set<string>();
  const publishedPerLevel = new Set<string>();

  for (const item of catalog.content) {
    if (contentIds.has(item.id)) {
      issues.push(`Duplicate content id "${item.id}".`);
    }
    contentIds.add(item.id);

    if (!languageIds.has(item.languageId)) {
      issues.push(`Content "${item.id}" references unknown language "${item.languageId}".`);
      continue;
    }
    if (!contentIdBelongsToLanguage(item.id, item.languageId)) {
      issues.push(`Content id "${item.id}" must start with its language id "${item.languageId}-".`);
    }

    const key = levelKey(item.languageId, item.levelId);
    const status = levelStatus.get(key);
    if (status === undefined) {
      issues.push(
        `Content "${item.id}" is in level "${item.levelId}", which language "${item.languageId}" does not declare.`,
      );
      continue;
    }

    const orderKey = `${key}#${item.order}`;
    if (orders.has(orderKey)) {
      issues.push(`Content "${item.id}" reuses order ${item.order} in ${key}.`);
    }
    orders.add(orderKey);

    if (isPublished(item)) {
      publishedPerLevel.add(key);
      if (status !== "available") {
        issues.push(`Published content "${item.id}" is in ${key}, which is not available.`);
      }
    }
  }

  for (const [key, status] of levelStatus) {
    if (status === "available" && !publishedPerLevel.has(key)) {
      issues.push(`Level ${key} is available but has no published content.`);
    }
  }

  validateExercises(catalog, { languageIds, levelStatus, contentIds }, issues);
  validateVocabulary(
    catalog.vocabularyCategories,
    catalog.vocabulary,
    {
      languageIds,
      levelStatusOf: (languageId, levelId) => levelStatus.get(levelKey(languageId, levelId)),
    },
    issues,
  );
  validatePhonetics(
    catalog.phoneticTopics,
    catalog.phonetics,
    {
      languageIds,
      levelStatusOf: (languageId, levelId) => levelStatus.get(levelKey(languageId, levelId)),
    },
    issues,
  );

  return issues.map((message) => ({ message }));
}

interface CatalogIndex {
  languageIds: ReadonlySet<LanguageId>;
  levelStatus: ReadonlyMap<string, LanguageLevel["status"]>;
  contentIds: ReadonlySet<string>;
}

/**
 * The exercise rules that no single file can see: identity, the lesson each one
 * belongs to (it must exist, be a lesson, and share the exercise's language and
 * level), and ordering within that lesson. Exercises are held to the same
 * availability standard as content: published ones only in `available` levels,
 * and only on a published lesson, so a student is never offered an exercise
 * whose lesson they cannot open.
 */
function validateExercises(catalog: ContentCatalog, index: CatalogIndex, issues: string[]): void {
  const contentById = new Map(catalog.content.map((item) => [item.id, item]));
  const exerciseIds = new Set<string>();
  const lessonOrders = new Set<string>();

  for (const exercise of catalog.exercises) {
    const { id, languageId, levelId, lessonId } = exercise;

    if (exerciseIds.has(id)) {
      issues.push(`Duplicate exercise id "${id}".`);
    }
    exerciseIds.add(id);
    if (index.contentIds.has(id)) {
      issues.push(`Exercise id "${id}" is also the id of a content item.`);
    }

    if (!index.languageIds.has(languageId)) {
      issues.push(`Exercise "${id}" references unknown language "${languageId}".`);
      continue;
    }
    if (!exerciseIdBelongsToLanguage(id, languageId)) {
      issues.push(`Exercise id "${id}" must start with its language id "${languageId}-".`);
    }

    const key = levelKey(languageId, levelId);
    const status = index.levelStatus.get(key);
    if (status === undefined) {
      issues.push(
        `Exercise "${id}" is in level "${levelId}", which language "${languageId}" does not declare.`,
      );
      continue;
    }

    const lesson = contentById.get(lessonId);
    if (!lesson) {
      issues.push(`Exercise "${id}" references unknown lesson "${lessonId}".`);
    } else if (lesson.type !== "lesson") {
      issues.push(`Exercise "${id}" references "${lessonId}", which is not a lesson.`);
    } else {
      if (lesson.languageId !== languageId || lesson.levelId !== levelId) {
        const lessonKey = levelKey(lesson.languageId, lesson.levelId);
        issues.push(
          `Exercise "${id}" is in ${key} but its lesson "${lessonId}" is in ${lessonKey}.`,
        );
      }
      if (isPublished(exercise) && !isPublished(lesson)) {
        issues.push(
          `Published exercise "${id}" belongs to lesson "${lessonId}", which is not published.`,
        );
      }
    }

    const orderKey = `${lessonId}#${String(exercise.order)}`;
    if (lessonOrders.has(orderKey)) {
      issues.push(
        `Exercise "${id}" reuses order ${String(exercise.order)} in lesson "${lessonId}".`,
      );
    }
    lessonOrders.add(orderKey);

    if (isPublished(exercise) && status !== "available") {
      issues.push(`Published exercise "${id}" is in ${key}, which is not available.`);
    }
  }
}
