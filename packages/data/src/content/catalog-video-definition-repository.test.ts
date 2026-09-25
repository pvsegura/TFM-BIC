import {
  createLanguageId,
  createVideoDefinitionId,
  type ContentCatalog,
  type VideoDefinition,
} from "@tfm-bic/domain";
import { makeVideoDefinition } from "@tfm-bic/domain/testing";
import { describe, expect, it } from "vitest";

import { CatalogVideoDefinitionRepository } from "./catalog-video-definition-repository.js";

const PL = createLanguageId("pl");
const XX = createLanguageId("xx");

const definitions: VideoDefinition[] = [
  makeVideoDefinition({ id: createVideoDefinitionId("pl-a1-nasal-vowels-demo"), languageId: PL }),
  makeVideoDefinition({
    id: createVideoDefinitionId("pl-a1-draft-demo"),
    languageId: PL,
    status: "draft",
  }),
  makeVideoDefinition({ id: createVideoDefinitionId("xx-a1-demo"), languageId: XX }),
];

const catalog: ContentCatalog = {
  languages: [],
  languageLevels: [],
  content: [],
  exercises: [],
  vocabularyCategories: [],
  vocabulary: [],
  phoneticTopics: [],
  phonetics: [],
  videoDefinitions: definitions,
};
const repository = new CatalogVideoDefinitionRepository(catalog);

describe("CatalogVideoDefinitionRepository", () => {
  it("finds a definition by id, of any status (visibility is the use cases' job)", async () => {
    const draft = await repository.findById(createVideoDefinitionId("pl-a1-draft-demo"));
    expect(draft?.status).toBe("draft");
  });

  it("returns null for an unknown id", async () => {
    expect(await repository.findById(createVideoDefinitionId("pl-does-not-exist"))).toBeNull();
  });

  it("does not resolve an inherited property name to a definition", async () => {
    expect(await repository.findById("__proto__" as never)).toBeNull();
    expect(await repository.findById("constructor" as never)).toBeNull();
  });

  it("offers no way to create or change a definition", () => {
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(repository) as object).sort()).toEqual([
      "constructor",
      "findById",
    ]);
  });
});
