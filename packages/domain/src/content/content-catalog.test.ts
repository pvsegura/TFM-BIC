import { describe, expect, it } from "vitest";

import type { Language } from "../language/language.js";
import type { LanguageLevel } from "../language/language-level.js";
import { createLanguageId } from "../language/language-id.js";
import { createLevelId } from "../language/level-id.js";
import { validateContentCatalog, type ContentCatalog } from "./content-catalog.js";
import { createContentId } from "./content-id.js";
import type { ContentItem } from "./content-item.js";

const PL = createLanguageId("pl");
const A1 = createLevelId("a1");
const A2 = createLevelId("a2");

const polish: Language = {
  code: PL,
  name: "Polish",
  nativeName: "polski",
  locale: "pl-PL",
  direction: "ltr",
  isActive: true,
};
const a1Available: LanguageLevel = { languageId: PL, levelId: A1, status: "available" };
const a2Planned: LanguageLevel = { languageId: PL, levelId: A2, status: "planned" };

function item(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: createContentId("pl-greetings"),
    languageId: PL,
    levelId: A1,
    type: "lesson",
    status: "published",
    order: 10,
    instructionLanguage: createLanguageId("en"),
    title: "Greetings",
    description: "Say hello.",
    blocks: [{ type: "explanation", text: "Hello." }],
    ...overrides,
  };
}

function catalog(overrides: Partial<ContentCatalog> = {}): ContentCatalog {
  return {
    languages: [polish],
    languageLevels: [a1Available, a2Planned],
    content: [item()],
    exercises: [],
    ...overrides,
  };
}

const messages = (c: ContentCatalog) => validateContentCatalog(c).map((issue) => issue.message);

describe("validateContentCatalog", () => {
  it("accepts a consistent catalog", () => {
    expect(validateContentCatalog(catalog())).toEqual([]);
  });

  it("rejects two languages with the same code", () => {
    expect(messages(catalog({ languages: [polish, polish] }))).toContain(
      'Duplicate language "pl".',
    );
  });

  it("rejects a level declared twice for one language", () => {
    const issues = messages(
      catalog({ languageLevels: [a1Available, a2Planned, { ...a1Available, status: "planned" }] }),
    );
    expect(issues).toContain('Language "pl" declares level "a1" more than once.');
  });

  it("rejects a level entry for a language that does not exist", () => {
    const ghost: LanguageLevel = {
      languageId: createLanguageId("xx"),
      levelId: A1,
      status: "planned",
    };
    expect(messages(catalog({ languageLevels: [a1Available, ghost] }))).toContain(
      'Level "a1" is declared for unknown language "xx".',
    );
  });

  it("rejects duplicate content ids across the whole catalog", () => {
    expect(messages(catalog({ content: [item(), item({ order: 20 })] }))).toContain(
      'Duplicate content id "pl-greetings".',
    );
  });

  it("rejects content that references an unknown language", () => {
    const stray = item({ id: createContentId("xx-hello"), languageId: createLanguageId("xx") });
    expect(messages(catalog({ content: [item(), stray] }))).toContain(
      'Content "xx-hello" references unknown language "xx".',
    );
  });

  it("rejects content in a level the language does not declare", () => {
    const stray = item({
      id: createContentId("pl-stray"),
      levelId: createLevelId("c1"),
      order: 5,
      status: "draft",
    });
    expect(messages(catalog({ content: [item(), stray] }))).toContain(
      'Content "pl-stray" is in level "c1", which language "pl" does not declare.',
    );
  });

  it("rejects a content id that is not namespaced by its language", () => {
    const wrong = item({ id: createContentId("en-greetings") });
    expect(messages(catalog({ content: [wrong] }))).toContain(
      'Content id "en-greetings" must start with its language id "pl-".',
    );
  });

  it("rejects two items with the same order in one language and level, whatever their status", () => {
    const clash = item({ id: createContentId("pl-other"), status: "draft" });
    expect(messages(catalog({ content: [item(), clash] }))).toContain(
      'Content "pl-other" reuses order 10 in pl/a1.',
    );
  });

  it("allows the same order in different levels", () => {
    const other = item({ id: createContentId("pl-later"), levelId: A2, status: "draft" });
    expect(validateContentCatalog(catalog({ content: [item(), other] }))).toEqual([]);
  });

  it("rejects published content in a level that is not available yet", () => {
    const early = item({ id: createContentId("pl-early"), levelId: A2, order: 1 });
    expect(messages(catalog({ content: [item(), early] }))).toContain(
      'Published content "pl-early" is in pl/a2, which is not available.',
    );
  });

  it("allows draft content in a planned level (content in preparation)", () => {
    const draft = item({ id: createContentId("pl-prep"), levelId: A2, status: "draft" });
    expect(validateContentCatalog(catalog({ content: [item(), draft] }))).toEqual([]);
  });

  it("rejects an available level with no published content — it would advertise content that does not exist", () => {
    expect(messages(catalog({ content: [item({ status: "draft" })] }))).toContain(
      "Level pl/a1 is available but has no published content.",
    );
  });

  it("reports every problem, not just the first", () => {
    const issues = validateContentCatalog(
      catalog({ content: [item(), item(), item({ id: createContentId("en-x"), order: 99 })] }),
    );
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
