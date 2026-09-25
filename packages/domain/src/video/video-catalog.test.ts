import { describe, expect, it } from "vitest";

import { createLanguageId } from "../language/language-id.js";
import type { LanguageLevel } from "../language/language-level.js";
import { createLevelId } from "../language/level-id.js";
import { makeVideoDefinition } from "./test-support/video-fixtures.js";
import { validateVideoDefinitions, type VideoCatalogContext } from "./video-catalog.js";

const PL = createLanguageId("pl");
const A1 = createLevelId("a1");
const A2 = createLevelId("a2");

const levels = new Map<string, LanguageLevel["status"]>([
  [`${PL}/${A1}`, "available"],
  [`${PL}/${A2}`, "planned"],
]);

const context: VideoCatalogContext = {
  languageIds: new Set([PL]),
  levelStatusOf: (languageId, levelId) => levels.get(`${languageId}/${levelId}`),
};

function validate(definitions = [makeVideoDefinition()], ctx: VideoCatalogContext = context) {
  const issues: string[] = [];
  validateVideoDefinitions(definitions, ctx, issues);
  return issues;
}

describe("validateVideoDefinitions", () => {
  it("accepts a well-formed, published definition in an available level", () => {
    expect(validate()).toEqual([]);
  });

  it("rejects a duplicate id", () => {
    const definition = makeVideoDefinition();
    expect(validate([definition, definition])).toContain(
      `Duplicate video definition id "${definition.id}".`,
    );
  });

  it("rejects a definition referencing an unknown language", () => {
    const definition = makeVideoDefinition({ languageId: createLanguageId("de") });
    expect(validate([definition])).toContain(
      `Video definition "${definition.id}" references unknown language "de".`,
    );
  });

  it("rejects an id that does not start with its own language", () => {
    const definition = makeVideoDefinition({ languageId: createLanguageId("pl") });
    // Force a mismatched id the way a misfiled content file would.
    const misfiled = { ...definition, id: "en-a1-demo" as typeof definition.id };
    expect(validate([misfiled])).toContain(
      `Video definition id "en-a1-demo" must start with its language id "pl-".`,
    );
  });

  it("rejects a definition in a level its language never declared", () => {
    const definition = makeVideoDefinition({ levelId: createLevelId("b2") });
    expect(validate([definition])).toContain(
      `Video definition "${definition.id}" is in level "b2", which language "pl" does not declare.`,
    );
  });

  it("rejects reusing an order within the same language and level", () => {
    const first = makeVideoDefinition({ order: 10 });
    const second = makeVideoDefinition({ order: 10 });
    expect(validate([first, second])).toContain(
      `Video definition "${second.id}" reuses order 10 in pl/a1.`,
    );
  });

  it("rejects a published definition in a level that is not available", () => {
    const definition = makeVideoDefinition({ levelId: createLevelId("a2"), status: "published" });
    expect(validate([definition])).toContain(
      `Published video definition "${definition.id}" is in pl/a2, which is not available.`,
    );
  });

  it("exempts a draft definition from the availability rule", () => {
    const definition = makeVideoDefinition({ levelId: createLevelId("a2"), status: "draft" });
    expect(validate([definition])).toEqual([]);
  });
});
