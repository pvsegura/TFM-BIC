import { isPublished } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LanguageLevel } from "../language/language-level.js";
import type { LevelId } from "../language/level-id.js";
import type { VocabularyCategory } from "./vocabulary-category.js";
import { vocabularyItemIdBelongsToLanguage } from "./vocabulary-item-id.js";
import type { VocabularyItem } from "./vocabulary-item.js";

/** What the vocabulary rules need to know about the rest of the catalog. */
export interface VocabularyCatalogContext {
  languageIds: ReadonlySet<LanguageId>;
  /** The declared availability of a language's level, or `undefined` when it does not declare it. */
  levelStatusOf: (languageId: LanguageId, levelId: LevelId) => LanguageLevel["status"] | undefined;
}

const categoryKey = (languageId: LanguageId, categoryId: string) => `${languageId}/${categoryId}`;

/**
 * The vocabulary rules that no single file can see: identity (an entry id is unique everywhere
 * and namespaced by its language, a category id is unique within its language), the category each
 * entry belongs to (it must exist in the entry's own language), ordering, and honest availability.
 *
 * Availability is held to the same standard as lessons and exercises: a *published* entry lives
 * only in a level that is `available`, and only in a *published* category, and a published
 * category always has at least one published entry — so a student is never offered a hidden word
 * or an empty topic. Drafts are exempt: they are being prepared. An entry's level is optional; when
 * given it must be one its language declares.
 *
 * Problems are appended to `issues`, so an author fixes them all in one pass.
 */
export function validateVocabulary(
  vocabularyCategories: readonly VocabularyCategory[],
  vocabulary: readonly VocabularyItem[],
  context: VocabularyCatalogContext,
  issues: string[],
): void {
  const categories = validateCategories(vocabularyCategories, context, issues);
  const publishedCategories = validateItems(vocabulary, categories, context, issues);

  for (const [key, category] of categories) {
    if (isPublished(category) && !publishedCategories.has(key)) {
      issues.push(
        `Vocabulary category "${category.id}" of "${category.languageId}" is published but has no published entries.`,
      );
    }
  }
}

/** Checks each category and returns the ones that can be referenced, by `language/category` key. */
function validateCategories(
  vocabularyCategories: readonly VocabularyCategory[],
  context: VocabularyCatalogContext,
  issues: string[],
): Map<string, VocabularyCategory> {
  const byKey = new Map<string, VocabularyCategory>();
  const orders = new Set<string>();

  for (const category of vocabularyCategories) {
    const { id, languageId } = category;

    if (!context.languageIds.has(languageId)) {
      issues.push(`Vocabulary category "${id}" references unknown language "${languageId}".`);
      continue;
    }

    const key = categoryKey(languageId, id);
    if (byKey.has(key)) {
      issues.push(`Duplicate vocabulary category "${id}" in language "${languageId}".`);
      continue;
    }
    byKey.set(key, category);

    const orderKey = `${languageId}#${String(category.order)}`;
    if (orders.has(orderKey)) {
      issues.push(
        `Vocabulary category "${id}" reuses order ${String(category.order)} in language "${languageId}".`,
      );
    }
    orders.add(orderKey);
  }
  return byKey;
}

/** Checks each entry and returns the categories (by key) that hold at least one published entry. */
function validateItems(
  vocabulary: readonly VocabularyItem[],
  categories: ReadonlyMap<string, VocabularyCategory>,
  context: VocabularyCatalogContext,
  issues: string[],
): Set<string> {
  const itemIds = new Set<string>();
  const orders = new Set<string>();
  const categoriesWithPublishedItems = new Set<string>();

  for (const item of vocabulary) {
    const { id, languageId } = item;

    if (itemIds.has(id)) {
      issues.push(`Duplicate vocabulary item id "${id}".`);
    }
    itemIds.add(id);

    if (!context.languageIds.has(languageId)) {
      issues.push(`Vocabulary item "${id}" references unknown language "${languageId}".`);
      continue;
    }
    if (!vocabularyItemIdBelongsToLanguage(id, languageId)) {
      issues.push(`Vocabulary item id "${id}" must start with its language id "${languageId}-".`);
    }

    const key = categoryKey(languageId, item.categoryId);
    const category = categories.get(key);
    if (!category) {
      issues.push(
        `Vocabulary item "${id}" references unknown category "${item.categoryId}" in language "${languageId}".`,
      );
    } else {
      const orderKey = `${key}#${String(item.order)}`;
      if (orders.has(orderKey)) {
        issues.push(
          `Vocabulary item "${id}" reuses order ${String(item.order)} in category "${item.categoryId}" of "${languageId}".`,
        );
      }
      orders.add(orderKey);

      if (isPublished(item)) {
        categoriesWithPublishedItems.add(key);
        if (!isPublished(category)) {
          issues.push(
            `Published vocabulary item "${id}" belongs to category "${item.categoryId}", which is not published.`,
          );
        }
      }
    }

    if (item.levelId !== undefined) {
      const status = context.levelStatusOf(languageId, item.levelId);
      if (status === undefined) {
        issues.push(
          `Vocabulary item "${id}" is in level "${item.levelId}", which language "${languageId}" does not declare.`,
        );
      } else if (isPublished(item) && status !== "available") {
        issues.push(
          `Published vocabulary item "${id}" is in ${languageId}/${item.levelId}, which is not available.`,
        );
      }
    }
  }
  return categoriesWithPublishedItems;
}
