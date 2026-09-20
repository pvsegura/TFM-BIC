import {
  createLanguageId,
  createLevelId,
  LanguageNotFoundError,
  LevelNotAvailableError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository, makeLanguage, makeSampleCatalog } from "../test-support/fakes.js";
import { ListContentUseCase } from "./list-content.use-case.js";

function build() {
  return new ListContentUseCase(new FakeContentRepository(makeSampleCatalog()));
}

const query = (language: string, level: string) => ({
  languageId: createLanguageId(language),
  levelId: createLevelId(level),
});

describe("ListContentUseCase", () => {
  it("lists the published content of an available language and level, in explicit order", async () => {
    const items = await build().execute(query("pl", "a1"));

    // The repository holds pl-second (order 20) before pl-first (order 10).
    expect(items.map((item) => item.id)).toEqual(["pl-first", "pl-second"]);
  });

  it("excludes draft and archived content", async () => {
    const ids = (await build().execute(query("pl", "a1"))).map((item) => item.id);

    expect(ids).not.toContain("pl-draft");
    expect(ids).not.toContain("pl-archived");
  });

  it("returns summaries only: no bodies and no status", async () => {
    const [item] = await build().execute(query("pl", "a1"));

    expect(Object.keys(item ?? {}).sort()).toEqual([
      "description",
      "id",
      "instructionLanguage",
      "languageId",
      "levelId",
      "order",
      "title",
      "type",
    ]);
  });

  it("only returns content of the requested language and level", async () => {
    const items = await build().execute(query("xx", "a1"));

    expect(items.map((item) => item.id)).toEqual(["xx-only"]);
  });

  it("rejects an unknown language", async () => {
    await expect(build().execute(query("zz", "a1"))).rejects.toBeInstanceOf(LanguageNotFoundError);
  });

  it("rejects an inactive language", async () => {
    const catalog = makeSampleCatalog();
    const repository = new FakeContentRepository({
      ...catalog,
      languages: catalog.languages.map((l) =>
        l.code === "xx" ? makeLanguage("xx", { isActive: false }) : l,
      ),
    });

    await expect(
      new ListContentUseCase(repository).execute(query("xx", "a1")),
    ).rejects.toBeInstanceOf(LanguageNotFoundError);
  });

  it("rejects a planned level: not available means not selectable, even if a draft exists", async () => {
    await expect(build().execute(query("pl", "a2"))).rejects.toBeInstanceOf(LevelNotAvailableError);
  });

  it("rejects a level the language does not declare at all", async () => {
    await expect(build().execute(query("pl", "c2"))).rejects.toBeInstanceOf(LevelNotAvailableError);
  });
});
