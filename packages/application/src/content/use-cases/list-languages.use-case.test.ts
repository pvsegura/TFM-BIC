import { describe, expect, it } from "vitest";

import { FakeContentRepository, makeLanguage, makeSampleCatalog } from "../test-support/fakes.js";
import { ListLanguagesUseCase } from "./list-languages.use-case.js";

describe("ListLanguagesUseCase", () => {
  it("lists the active languages", async () => {
    const useCase = new ListLanguagesUseCase(new FakeContentRepository(makeSampleCatalog()));

    const languages = await useCase.execute();

    expect(languages.map((language) => language.code)).toEqual(["pl", "xx"]);
  });

  it("never lists an inactive language", async () => {
    const catalog = makeSampleCatalog();
    const repository = new FakeContentRepository({
      ...catalog,
      languages: [...catalog.languages, makeLanguage("de", { isActive: false })],
    });

    const languages = await new ListLanguagesUseCase(repository).execute();

    expect(languages.map((language) => language.code)).not.toContain("de");
  });

  it("orders languages by name regardless of the repository's order", async () => {
    const repository = new FakeContentRepository({
      languages: [
        makeLanguage("pl", { name: "Polish" }),
        makeLanguage("es", { name: "Spanish" }),
        makeLanguage("de", { name: "German" }),
      ],
      languageLevels: [],
      content: [],
      exercises: [],
    });

    const languages = await new ListLanguagesUseCase(repository).execute();

    expect(languages.map((language) => language.name)).toEqual(["German", "Polish", "Spanish"]);
  });

  it("returns an empty list, not an error, when no language is active", async () => {
    const repository = new FakeContentRepository({
      languages: [],
      languageLevels: [],
      content: [],
      exercises: [],
    });

    expect(await new ListLanguagesUseCase(repository).execute()).toEqual([]);
  });
});
