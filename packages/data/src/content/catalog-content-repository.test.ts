import {
  createContentId,
  createLanguageId,
  createLevelId,
  type ContentCatalog,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { CatalogContentRepository } from "./catalog-content-repository.js";

const PL = createLanguageId("pl");
const XX = createLanguageId("xx");

const item = (
  id: string,
  languageId: typeof PL,
  levelId: string,
  status: "published" | "draft",
) => ({
  id: createContentId(id),
  languageId,
  levelId: createLevelId(levelId),
  type: "lesson" as const,
  status,
  order: 1,
  instructionLanguage: createLanguageId("en"),
  title: id,
  description: id,
  blocks: [{ type: "explanation" as const, text: id }],
});

const catalog: ContentCatalog = {
  languages: [
    {
      code: PL,
      name: "Polish",
      nativeName: "polski",
      locale: "pl-PL",
      direction: "ltr",
      isActive: true,
    },
    { code: XX, name: "Xx", nativeName: "Xx", locale: "xx", direction: "ltr", isActive: false },
  ],
  languageLevels: [
    { languageId: PL, levelId: createLevelId("a1"), status: "available" },
    { languageId: PL, levelId: createLevelId("a2"), status: "planned" },
    { languageId: XX, levelId: createLevelId("a1"), status: "available" },
  ],
  content: [
    item("pl-a", PL, "a1", "published"),
    item("pl-b", PL, "a1", "draft"),
    item("pl-c", PL, "a2", "draft"),
    item("xx-a", XX, "a1", "published"),
  ],
  exercises: [],
  vocabularyCategories: [],
  vocabulary: [],
};

const repository = new CatalogContentRepository(catalog);

describe("CatalogContentRepository", () => {
  it("returns every language, active or not (visibility is the use cases' job)", async () => {
    expect((await repository.listLanguages()).map((l) => l.code)).toEqual(["pl", "xx"]);
  });

  it("finds a language by code, or null", async () => {
    expect((await repository.findLanguage(PL))?.name).toBe("Polish");
    expect(await repository.findLanguage(createLanguageId("zz"))).toBeNull();
  });

  it("lists only the levels one language declares", async () => {
    const levels = await repository.listLanguageLevels(PL);

    expect(levels.map((l) => `${l.levelId}:${l.status}`)).toEqual(["a1:available", "a2:planned"]);
  });

  it("returns no levels for an unknown language", async () => {
    expect(await repository.listLanguageLevels(createLanguageId("zz"))).toEqual([]);
  });

  it("filters content by language and level and returns every status", async () => {
    const items = await repository.listContent(PL, createLevelId("a1"));

    expect(items.map((i) => i.id)).toEqual(["pl-a", "pl-b"]);
  });

  it("finds an item by id, whatever its status, or null", async () => {
    expect((await repository.findContent(createContentId("pl-b")))?.status).toBe("draft");
    expect(await repository.findContent(createContentId("pl-zzz"))).toBeNull();
  });
});
