import { ContentNotFoundError, createContentId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository, makeLanguage, makeSampleCatalog } from "../test-support/fakes.js";
import { GetContentUseCase } from "./get-content.use-case.js";

function build(catalog = makeSampleCatalog()) {
  return new GetContentUseCase(new FakeContentRepository(catalog));
}

const id = (value: string) => ({ contentId: createContentId(value) });

describe("GetContentUseCase", () => {
  it("returns a published item with its blocks", async () => {
    const item = await build().execute(id("pl-first"));

    expect(item.id).toBe("pl-first");
    expect(item.blocks).toEqual([{ type: "explanation", text: "Body of pl-first" }]);
  });

  it("does not find an id that does not exist", async () => {
    await expect(build().execute(id("pl-nothing"))).rejects.toBeInstanceOf(ContentNotFoundError);
  });

  it.each(["pl-draft", "pl-archived"])(
    "does not reveal unpublished content (%s)",
    async (unpublished) => {
      await expect(build().execute(id(unpublished))).rejects.toBeInstanceOf(ContentNotFoundError);
    },
  );

  it("does not serve content whose level is not available", async () => {
    const catalog = makeSampleCatalog();
    // A published item filed under the planned pl/a2 level (an inconsistent
    // catalog the loader would reject) must still never be served.
    const early = {
      ...catalog.content[0]!,
      id: createContentId("pl-early"),
      levelId: "a2" as const,
    };

    await expect(
      build({ ...catalog, content: [...catalog.content, early] }).execute(id("pl-early")),
    ).rejects.toBeInstanceOf(ContentNotFoundError);
  });

  it("does not serve content of an inactive language", async () => {
    const catalog = makeSampleCatalog();
    const inactive = {
      ...catalog,
      languages: catalog.languages.map((l) =>
        l.code === "xx" ? makeLanguage("xx", { isActive: false }) : l,
      ),
    };

    await expect(build(inactive).execute(id("xx-only"))).rejects.toBeInstanceOf(
      ContentNotFoundError,
    );
  });

  it("does not serve content whose language is missing from the catalog", async () => {
    const catalog = makeSampleCatalog();
    const orphaned = { ...catalog, languages: catalog.languages.filter((l) => l.code !== "xx") };

    await expect(build(orphaned).execute(id("xx-only"))).rejects.toBeInstanceOf(
      ContentNotFoundError,
    );
  });
});
