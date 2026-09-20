import { createContentId, createLanguageId, createLevelId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakeContentRepository,
  makeContentItem,
  makeLanguage,
  makeLanguageLevel,
} from "./test-support/fakes.js";
import { GetContentUseCase } from "./use-cases/get-content.use-case.js";
import { ListContentUseCase } from "./use-cases/list-content.use-case.js";
import { ListLanguageLevelsUseCase } from "./use-cases/list-language-levels.use-case.js";
import { ListLanguagesUseCase } from "./use-cases/list-languages.use-case.js";

/**
 * The architecture's central promise: adding a language is adding data. This
 * builds a language the codebase has never heard of and runs the *same*, unmodified
 * use cases over it. If any of this needed a new use case, repository or branch
 * on the language code, the design would be wrong.
 */
describe("adding a language is data, not code", () => {
  const catalog = {
    languages: [
      makeLanguage("pl", { name: "Polish" }),
      // Right-to-left, to show direction is metadata rather than an assumption.
      makeLanguage("qq", { name: "Quxian", nativeName: "Quxian-native", direction: "rtl" }),
    ],
    languageLevels: [
      makeLanguageLevel("pl", "a1", "available"),
      makeLanguageLevel("qq", "a1", "available"),
      makeLanguageLevel("qq", "a2", "available"),
      makeLanguageLevel("qq", "b1", "planned"),
    ],
    content: [
      makeContentItem("pl-one", "pl", "a1"),
      makeContentItem("qq-one", "qq", "a1", { order: 2 }),
      makeContentItem("qq-zero", "qq", "a1", { order: 1 }),
      makeContentItem("qq-two", "qq", "a2"),
    ],
  };
  const repository = new FakeContentRepository(catalog);
  const qq = createLanguageId("qq");

  it("lists the new language alongside the existing one", async () => {
    const languages = await new ListLanguagesUseCase(repository).execute();

    expect(languages.map((l) => l.code)).toEqual(["pl", "qq"]);
    expect(languages.find((l) => l.code === "qq")?.direction).toBe("rtl");
  });

  it("offers the levels the new language declares, with its own availability", async () => {
    const { levels } = await new ListLanguageLevelsUseCase(repository).execute({ languageId: qq });

    expect(levels.map((l) => `${l.id}:${l.status}`)).toEqual([
      "a1:available",
      "a2:available",
      "b1:planned",
    ]);
  });

  it("lists and reads its content through the same use cases", async () => {
    const list = await new ListContentUseCase(repository).execute({
      languageId: qq,
      levelId: createLevelId("a1"),
    });
    expect(list.map((item) => item.id)).toEqual(["qq-zero", "qq-one"]);

    const item = await new GetContentUseCase(repository).execute({
      contentId: createContentId("qq-two"),
    });
    expect(item.levelId).toBe("a2");
  });
});
