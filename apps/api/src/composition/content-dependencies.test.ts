import { createLanguageId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { createContentDependencies } from "./content-dependencies.js";

describe("createContentDependencies", () => {
  it("loads and validates the shipped content tree by default", async () => {
    const { contentRepository } = await createContentDependencies();

    const polish = await contentRepository.findLanguage(createLanguageId("pl"));
    expect(polish?.nativeName).toBe("polski");
  });

  it("fails fast, instead of starting, when the content directory is invalid", async () => {
    await expect(createContentDependencies("/no/such/content/dir")).rejects.toThrow(
      /Content is invalid/,
    );
  });
});
