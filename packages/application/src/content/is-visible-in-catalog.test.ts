import { createLanguageId, createLevelId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { isVisibleInCatalog } from "./is-visible-in-catalog.js";
import { FakeContentRepository, makeSampleCatalog } from "./test-support/fakes.js";

const pl = createLanguageId("pl");

function repository(options: { polishActive?: boolean } = {}) {
  const catalog = makeSampleCatalog();
  catalog.languages = catalog.languages.map((language) =>
    language.code === pl ? { ...language, isActive: options.polishActive ?? true } : language,
  );
  return new FakeContentRepository(catalog);
}

describe("isVisibleInCatalog", () => {
  it("is visible in an active language at an available level", async () => {
    expect(
      await isVisibleInCatalog(repository(), { languageId: pl, levelId: createLevelId("a1") }),
    ).toBe(true);
  });

  it("is visible in an active language when no level is declared", async () => {
    expect(await isVisibleInCatalog(repository(), { languageId: pl })).toBe(true);
  });

  it("is hidden in an inactive language, whatever the level", async () => {
    const repo = repository({ polishActive: false });

    expect(await isVisibleInCatalog(repo, { languageId: pl })).toBe(false);
    expect(await isVisibleInCatalog(repo, { languageId: pl, levelId: createLevelId("a1") })).toBe(
      false,
    );
  });

  it("is hidden in an unknown language", async () => {
    expect(await isVisibleInCatalog(repository(), { languageId: createLanguageId("qq") })).toBe(
      false,
    );
  });

  it("is hidden at a planned or undeclared level", async () => {
    const repo = repository();

    expect(await isVisibleInCatalog(repo, { languageId: pl, levelId: createLevelId("a2") })).toBe(
      false,
    );
    expect(await isVisibleInCatalog(repo, { languageId: pl, levelId: createLevelId("c2") })).toBe(
      false,
    );
  });
});
