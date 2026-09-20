import type { Language } from "../language/language.js";
import type { LanguageLevel } from "../language/language-level.js";
import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";
import { contentIdBelongsToLanguage } from "./content-id.js";
import type { ContentItem } from "./content-item.js";
import { isPublished } from "./content-status.js";

/** Everything the platform knows about languages and their content. */
export interface ContentCatalog {
  languages: readonly Language[];
  languageLevels: readonly LanguageLevel[];
  content: readonly ContentItem[];
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

  return issues.map((message) => ({ message }));
}
