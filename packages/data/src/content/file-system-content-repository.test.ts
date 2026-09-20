import {
  GetContentUseCase,
  ListContentUseCase,
  ListLanguageLevelsUseCase,
  ListLanguagesUseCase,
} from "@tfm-bic/application";
import { createContentId, createLanguageId, createLevelId } from "@tfm-bic/domain";
import { afterEach, describe, expect, it } from "vitest";

import { ContentValidationError } from "./content-validation.error.js";
import { FileSystemContentRepository } from "./file-system-content-repository.js";
import {
  contentFile,
  languageFile,
  makeContentRoot,
  validTree,
  type ContentRootHandle,
} from "./test-support/content-fixtures.js";

let handle: ContentRootHandle | undefined;

afterEach(async () => {
  await handle?.cleanup();
  handle = undefined;
});

describe("FileSystemContentRepository", () => {
  it("fails fast, listing every problem, when the content is invalid", async () => {
    handle = await makeContentRoot({ "languages/xx/language.json": "{" });

    const error = await FileSystemContentRepository.load(handle.root).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentValidationError);
    expect((error as ContentValidationError).issues.length).toBeGreaterThan(0);
    expect((error as ContentValidationError).message).toContain("languages/xx/language.json");
  });

  /**
   * The extensibility proof at the storage boundary: a brand-new language and
   * level exist only as files on disk, and the unmodified use cases and
   * repository serve them. No code names "xx", "qq" or any language.
   */
  describe("a language added only as files", () => {
    async function repositoryFor(files: Parameters<typeof makeContentRoot>[0]) {
      handle = await makeContentRoot(files);
      return FileSystemContentRepository.load(handle.root);
    }

    const files = {
      ...validTree("pl"),
      "languages/qq/language.json": languageFile("qq", {
        name: "Quxian",
        nativeName: "Quxian-native",
        direction: "rtl",
        levels: [
          { id: "a1", status: "available" },
          { id: "a2", status: "planned" },
        ],
      }),
      "languages/qq/levels/a1/content/qq-second.json": contentFile("qq-second", "qq", "a1", {
        order: 20,
      }),
      "languages/qq/levels/a1/content/qq-first.json": contentFile("qq-first", "qq", "a1", {
        order: 10,
      }),
      "languages/qq/levels/a1/content/qq-draft.json": contentFile("qq-draft", "qq", "a1", {
        order: 30,
        status: "draft",
      }),
    };

    it("lists the new language and its levels through the existing use cases", async () => {
      const repository = await repositoryFor(files);

      const languages = await new ListLanguagesUseCase(repository).execute();
      expect(languages.map((l) => l.code)).toEqual(["pl", "qq"]);

      const { levels } = await new ListLanguageLevelsUseCase(repository).execute({
        languageId: createLanguageId("qq"),
      });
      expect(levels.map((l) => `${l.id}:${l.status}`)).toEqual(["a1:available", "a2:planned"]);
    });

    it("serves its published content in file-independent, explicit order", async () => {
      const repository = await repositoryFor(files);

      const items = await new ListContentUseCase(repository).execute({
        languageId: createLanguageId("qq"),
        levelId: createLevelId("a1"),
      });

      expect(items.map((i) => i.id)).toEqual(["qq-first", "qq-second"]);
    });

    it("never serves its draft, and reads a published item in full", async () => {
      const repository = await repositoryFor(files);
      const get = new GetContentUseCase(repository);

      await expect(get.execute({ contentId: createContentId("qq-draft") })).rejects.toThrow();
      expect((await get.execute({ contentId: createContentId("qq-first") })).blocks).toHaveLength(
        1,
      );
    });
  });
});
