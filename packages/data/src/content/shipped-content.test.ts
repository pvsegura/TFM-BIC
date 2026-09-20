import {
  GetContentUseCase,
  ListContentUseCase,
  ListLanguageLevelsUseCase,
  ListLanguagesUseCase,
} from "@tfm-bic/application";
import {
  CEFR_LEVELS,
  type ContentCatalog,
  createLanguageId,
  createLevelId,
  isPublished,
  sortContentItems,
  validateContentCatalog,
} from "@tfm-bic/domain";
import { beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { FileSystemContentRepository } from "./file-system-content-repository.js";
import { loadContentCatalog } from "./load-content-catalog.js";

/**
 * The shipped content, tested as data. These run over the real `content/`
 * folder, so a malformed or inconsistent edit to any content file fails CI
 * here (and in `pnpm content:validate`) before it can reach a student.
 */
const PL = createLanguageId("pl");
const A1 = createLevelId("a1");

let catalog: ContentCatalog;

beforeAll(async () => {
  const result = await loadContentCatalog(DEFAULT_CONTENT_ROOT);
  if (!result.ok) {
    throw new Error(result.issues.map((i) => `${i.location}: ${i.message}`).join("\n"));
  }
  catalog = result.catalog;
});

describe("the shipped content catalog", () => {
  it("loads and validates without any issue", () => {
    expect(validateContentCatalog(catalog)).toEqual([]);
  });

  it("registers Polish with valid metadata", () => {
    const polish = catalog.languages.find((l) => l.code === PL);

    expect(polish).toEqual({
      code: "pl",
      name: "Polish",
      nativeName: "polski",
      locale: "pl-PL",
      direction: "ltr",
      isActive: true,
    });
  });

  it("declares Polish A1 as available and the later CEFR levels as planned, not pretended", () => {
    const status = Object.fromEntries(
      catalog.languageLevels.filter((l) => l.languageId === PL).map((l) => [l.levelId, l.status]),
    );

    expect(status).toEqual({
      a1: "available",
      a2: "planned",
      b1: "planned",
      b2: "planned",
      c1: "planned",
      c2: "planned",
    });
    expect(Object.keys(status).sort()).toEqual(CEFR_LEVELS.map((l) => l.id));
  });

  it("gives every content item a unique, language-namespaced id", () => {
    const ids = catalog.content.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("pl-")).toBe(true);
    }
  });

  it("references only a declared language and level from every item", () => {
    const declared = new Set(catalog.languageLevels.map((l) => `${l.languageId}/${l.levelId}`));

    for (const item of catalog.content) {
      expect(declared.has(`${item.languageId}/${item.levelId}`)).toBe(true);
    }
  });

  it("holds a representative set of Polish A1 content: several items, both types, all block kinds", () => {
    const a1 = catalog.content.filter((c) => c.languageId === PL && c.levelId === A1);

    expect(a1.length).toBeGreaterThanOrEqual(4);
    expect(new Set(a1.map((c) => c.type))).toEqual(new Set(["lesson", "explanation"]));
    const blockTypes = new Set(a1.flatMap((c) => c.blocks.map((b) => b.type)));
    expect(blockTypes).toEqual(new Set(["explanation", "example", "dialogue"]));
  });

  it("has explicit, unique, ascending order for Polish A1", () => {
    const a1 = catalog.content.filter((c) => c.languageId === PL && c.levelId === A1);
    const orders = a1.map((c) => c.order);

    expect(new Set(orders).size).toBe(orders.length);
    expect(sortContentItems(a1).map((c) => c.order)).toEqual([...orders].sort((a, b) => a - b));
  });

  it("gives every item the required text: title, description and at least one block", () => {
    for (const item of catalog.content) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.blocks.length).toBeGreaterThan(0);
      expect(item.instructionLanguage).toBe("en");
    }
  });

  it("marks the seed content honestly: nothing claims to be a complete A1 course", () => {
    const text = JSON.stringify(catalog.content).toLowerCase();

    expect(text).not.toMatch(/complete a1|full a1|entire a1|cefr[- ]certified/);
  });
});

describe("the shipped content through the real use cases", () => {
  let repository: FileSystemContentRepository;

  beforeAll(async () => {
    repository = await FileSystemContentRepository.load(DEFAULT_CONTENT_ROOT);
  });

  it("offers Polish as a language", async () => {
    const languages = await new ListLanguagesUseCase(repository).execute();

    expect(languages.map((l) => l.code)).toContain("pl");
  });

  it("offers exactly one selectable Polish level today: A1", async () => {
    const { levels } = await new ListLanguageLevelsUseCase(repository).execute({ languageId: PL });

    expect(levels.filter((l) => l.status === "available").map((l) => l.id)).toEqual(["a1"]);
    expect(levels.filter((l) => l.status === "planned")).toHaveLength(5);
  });

  it("lists published Polish A1 content in order, and every item can be read in full", async () => {
    const items = await new ListContentUseCase(repository).execute({ languageId: PL, levelId: A1 });
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.map((i) => i.order)).toEqual([...items.map((i) => i.order)].sort((a, b) => a - b));

    const get = new GetContentUseCase(repository);
    for (const summary of items) {
      const full = await get.execute({ contentId: summary.id });
      expect(isPublished(full)).toBe(true);
      expect(full.blocks.length).toBeGreaterThan(0);
    }
  });
});
