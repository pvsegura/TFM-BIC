import {
  createContentId,
  createLanguageId,
  createLevelId,
  type ContentCatalog,
  type ContentId,
  type ContentItem,
  type Language,
  type LanguageId,
  type LanguageLevel,
  type LevelId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../ports/content-repository.js";

/** An in-memory `ContentRepository` over a plain catalog — the fake behind
 * application and HTTP-layer tests. Like the real adapters it returns items of
 * every status, in the order they were given (deliberately unsorted), so tests
 * prove the use cases do the filtering and ordering. */
export class FakeContentRepository implements ContentRepository {
  constructor(public catalog: ContentCatalog) {}

  listLanguages(): Promise<readonly Language[]> {
    return Promise.resolve(this.catalog.languages);
  }

  findLanguage(languageId: LanguageId): Promise<Language | null> {
    return Promise.resolve(this.catalog.languages.find((l) => l.code === languageId) ?? null);
  }

  listLanguageLevels(languageId: LanguageId): Promise<readonly LanguageLevel[]> {
    return Promise.resolve(this.catalog.languageLevels.filter((l) => l.languageId === languageId));
  }

  listContent(languageId: LanguageId, levelId: LevelId): Promise<readonly ContentItem[]> {
    return Promise.resolve(
      this.catalog.content.filter((c) => c.languageId === languageId && c.levelId === levelId),
    );
  }

  findContent(contentId: ContentId): Promise<ContentItem | null> {
    return Promise.resolve(this.catalog.content.find((c) => c.id === contentId) ?? null);
  }
}

export function makeLanguage(code: string, overrides: Partial<Language> = {}): Language {
  return {
    code: createLanguageId(code),
    name: code.toUpperCase(),
    nativeName: code,
    locale: code,
    direction: "ltr",
    isActive: true,
    ...overrides,
  };
}

export function makeLanguageLevel(
  languageId: string,
  levelId: string,
  status: LanguageLevel["status"],
): LanguageLevel {
  return { languageId: createLanguageId(languageId), levelId: createLevelId(levelId), status };
}

export function makeContentItem(
  id: string,
  languageId: string,
  levelId: string,
  overrides: Partial<ContentItem> = {},
): ContentItem {
  return {
    id: createContentId(id),
    languageId: createLanguageId(languageId),
    levelId: createLevelId(levelId),
    type: "lesson",
    status: "published",
    order: 10,
    instructionLanguage: createLanguageId("en"),
    title: `Title of ${id}`,
    description: `Description of ${id}`,
    blocks: [{ type: "explanation", text: `Body of ${id}` }],
    ...overrides,
  };
}

/**
 * A small realistic catalog: Polish (a1 available, a2 planned) plus a purely
 * fictional second language `xx` used to prove the application is data-driven.
 * Nothing in the use cases knows about either code.
 */
export function makeSampleCatalog(): ContentCatalog {
  return {
    languages: [
      makeLanguage("pl", { name: "Polish", nativeName: "polski", locale: "pl-PL" }),
      makeLanguage("xx", { name: "Testlandic", nativeName: "Testlandisch", locale: "xx" }),
    ],
    languageLevels: [
      makeLanguageLevel("pl", "a2", "planned"),
      makeLanguageLevel("pl", "a1", "available"),
      makeLanguageLevel("xx", "a1", "available"),
    ],
    content: [
      makeContentItem("pl-second", "pl", "a1", { order: 20 }),
      makeContentItem("pl-first", "pl", "a1", { order: 10 }),
      makeContentItem("pl-draft", "pl", "a1", { order: 30, status: "draft" }),
      makeContentItem("pl-archived", "pl", "a1", { order: 40, status: "archived" }),
      makeContentItem("pl-later", "pl", "a2", { order: 10, status: "draft" }),
      makeContentItem("xx-only", "xx", "a1", { order: 10 }),
    ],
    exercises: [],
  };
}
