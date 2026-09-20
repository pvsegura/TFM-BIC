import { createLanguageId, LanguageNotFoundError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository, makeLanguage, makeSampleCatalog } from "../test-support/fakes.js";
import { ListLanguageLevelsUseCase } from "./list-language-levels.use-case.js";

function build() {
  return new ListLanguageLevelsUseCase(new FakeContentRepository(makeSampleCatalog()));
}

describe("ListLanguageLevelsUseCase", () => {
  it("returns the language with the levels it declares and their availability", async () => {
    const result = await build().execute({ languageId: createLanguageId("pl") });

    expect(result.language.code).toBe("pl");
    expect(result.levels).toEqual([
      { id: "a1", label: "A1", status: "available" },
      { id: "a2", label: "A2", status: "planned" },
    ]);
  });

  it("orders levels by CEFR rank, not by the order they were declared in", async () => {
    // The sample catalog declares pl/a2 before pl/a1.
    const result = await build().execute({ languageId: createLanguageId("pl") });

    expect(result.levels.map((level) => level.id)).toEqual(["a1", "a2"]);
  });

  it("only returns levels the language declares — it does not invent the rest of A1-C2", async () => {
    const result = await build().execute({ languageId: createLanguageId("xx") });

    expect(result.levels.map((level) => level.id)).toEqual(["a1"]);
  });

  it("rejects an unknown language", async () => {
    await expect(build().execute({ languageId: createLanguageId("zz") })).rejects.toBeInstanceOf(
      LanguageNotFoundError,
    );
  });

  it("rejects an inactive language exactly like an unknown one", async () => {
    const catalog = makeSampleCatalog();
    const repository = new FakeContentRepository({
      ...catalog,
      languages: [...catalog.languages, makeLanguage("de", { isActive: false })],
      languageLevels: [
        ...catalog.languageLevels,
        { languageId: createLanguageId("de"), levelId: "a1", status: "available" },
      ],
    });

    await expect(
      new ListLanguageLevelsUseCase(repository).execute({ languageId: createLanguageId("de") }),
    ).rejects.toBeInstanceOf(LanguageNotFoundError);
  });
});
