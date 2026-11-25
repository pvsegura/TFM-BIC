import { describe, expect, it } from "vitest";

import { exerciseFileSchema } from "../exercise-file.schema.js";

const common = {
  schemaVersion: 1,
  id: "es-u3-x",
  lessonId: "es-unit-3-where",
  languageId: "es",
  levelId: "a1",
  status: "published",
  order: 1,
  instructionLanguage: "pl",
  prompt: "Ćwiczenie.",
  book: { unit: 3, number: 14, phase: "structure", lines: 3 },
};

const parse = (type: string, configuration: unknown) =>
  exerciseFileSchema.safeParse({ ...common, type, configuration });

describe("workbook exercise files", () => {
  it("accept valid ordering, matching, gap-fill and open-writing files", () => {
    expect(parse("ordering", { items: ["El", "banco", "está", "cerca"] }).success).toBe(true);
    expect(
      parse("matching", {
        pairs: [
          { left: "el banco", right: "bank" },
          { left: "la farmacia", right: "apteka" },
        ],
      }).success,
    ).toBe(true);
    expect(
      parse("gap-fill", {
        text: "El museo ___ en el centro.",
        gaps: [{ accepted: ["está"] }],
      }).success,
    ).toBe(true);
    expect(
      parse("open-writing", {
        modelAnswer: "Vivo en Cracovia y me gusta mucho mi barrio.",
        checklist: ["piszesz o mieście"],
        minWords: 5,
        maxWords: 30,
      }).success,
    ).toBe(true);
  });

  it("refuse broken configurations", () => {
    expect(parse("ordering", { items: ["sí", "sí"] }).success).toBe(false);
    expect(
      parse("matching", {
        pairs: [
          { left: "a", right: "x" },
          { left: "b", right: "x" },
        ],
      }).success,
    ).toBe(false);
    expect(parse("gap-fill", { text: "Sin huecos.", gaps: [{ accepted: ["x"] }] }).success).toBe(
      false,
    );
    expect(
      parse("open-writing", {
        modelAnswer: "Demasiado corto.",
        checklist: ["x"],
        minWords: 10,
        maxWords: 20,
      }).success,
    ).toBe(false);
  });

  it("refuse an invalid workbook placement", () => {
    const bad = exerciseFileSchema.safeParse({
      ...common,
      book: { unit: 3, number: 0, phase: "structure" },
      type: "ordering",
      configuration: { items: ["a", "b"] },
    });
    expect(bad.success).toBe(false);
  });
});
