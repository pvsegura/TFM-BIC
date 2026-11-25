import { describe, expect, it } from "vitest";

import { InvalidExerciseAnswerError } from "../errors/invalid-exercise-answer.error.js";
import { createDefaultExerciseTypeRegistry } from "../exercise-registry.js";
import type { Exercise } from "../exercise.js";
import type { ExerciseId } from "../exercise-id.js";
import type { LanguageId } from "../../language/language-id.js";
import type { LevelId } from "../../language/level-id.js";
import type { LessonId } from "../../lesson/lesson.js";
import { seededShuffle } from "./seeded-shuffle.js";

const base = {
  id: "es-u3-ordering-1" as ExerciseId,
  lessonId: "es-unit-3-where" as LessonId,
  languageId: "es" as LanguageId,
  levelId: "a1" as LevelId,
  status: "published" as const,
  order: 1,
  instructionLanguage: "pl" as LanguageId,
  prompt: "Ułóż zdanie.",
  explanation: "Szyk: podmiot, czasownik, miejsce.",
  book: { unit: 3, number: 14, phase: "structure" as const },
};

const registry = createDefaultExerciseTypeRegistry();

const ordering: Exercise = {
  ...base,
  type: "ordering",
  configuration: { items: ["El", "banco", "está", "cerca"], joiner: " " },
};
const matching: Exercise = {
  ...base,
  id: "es-u3-matching-1" as ExerciseId,
  type: "matching",
  configuration: {
    pairs: [
      { left: "la farmacia", right: "apteka" },
      { left: "el banco", right: "bank" },
      { left: "la estación", right: "dworzec" },
    ],
  },
};
const gapFill: Exercise = {
  ...base,
  id: "es-u3-gap-1" as ExerciseId,
  type: "gap-fill",
  configuration: {
    text: "El museo ___ en el centro y ___ muy grande.",
    gaps: [{ accepted: ["está"] }, { accepted: ["es"] }],
    caseSensitive: false,
  },
};
const openWriting: Exercise = {
  ...base,
  id: "es-u3-writing-1" as ExerciseId,
  type: "open-writing",
  configuration: {
    modelAnswer: "Vivo en Cracovia. Cerca de mi casa hay un parque y una farmacia.",
    checklist: ["używasz hay", "używasz está"],
    minWords: 8,
    maxWords: 40,
  },
};

describe("seededShuffle", () => {
  it("is deterministic and never returns the original order", () => {
    const items = ["a", "b", "c", "d"];
    expect(seededShuffle(items, "x")).toEqual(seededShuffle(items, "x"));
    for (const seed of ["a", "b", "c", "es-u1-x", "es-u2-y", "es-u3-z"]) {
      expect(seededShuffle(items, seed)).not.toEqual(items);
      expect([...seededShuffle(items, seed)].sort()).toEqual(items);
    }
  });
});

describe("ordering", () => {
  it("shows the items shuffled, the same way every time, and with the workbook number", () => {
    const presented = registry.present(ordering);
    expect(presented).toMatchObject({ type: "ordering", book: { unit: 3, number: 14 } });
    if (presented.type !== "ordering") throw new Error("type");
    expect(presented.items).not.toEqual(["El", "banco", "está", "cerca"]);
    expect(registry.present(ordering)).toEqual(presented);
  });

  it("judges the order and shows the sentence as the correct answer", () => {
    expect(registry.evaluate(ordering, ["El", "banco", "está", "cerca"]).evaluation).toMatchObject({
      correct: true,
      correctAnswer: "El banco está cerca",
    });
    expect(registry.evaluate(ordering, ["banco", "El", "está", "cerca"]).evaluation.correct).toBe(
      false,
    );
  });

  it("refuses anything that is not a permutation of the items", () => {
    expect(() => registry.evaluate(ordering, ["El", "banco", "está"])).toThrow(
      InvalidExerciseAnswerError,
    );
    expect(() => registry.evaluate(ordering, ["El", "banco", "está", "lejos"])).toThrow(
      InvalidExerciseAnswerError,
    );
    expect(() => registry.evaluate(ordering, "El banco está cerca")).toThrow(
      InvalidExerciseAnswerError,
    );
  });
});

describe("matching", () => {
  it("keeps the left column and shuffles the right one", () => {
    const presented = registry.present(matching);
    if (presented.type !== "matching") throw new Error("type");
    expect(presented.left).toEqual(["la farmacia", "el banco", "la estación"]);
    expect([...presented.right].sort()).toEqual(["apteka", "bank", "dworzec"]);
    expect(presented.right).not.toEqual(["apteka", "bank", "dworzec"]);
  });

  it("is right only when every pair is right, and refuses unknown items", () => {
    expect(registry.evaluate(matching, ["apteka", "bank", "dworzec"]).evaluation.correct).toBe(
      true,
    );
    expect(registry.evaluate(matching, ["bank", "apteka", "dworzec"]).evaluation.correct).toBe(
      false,
    );
    expect(() => registry.evaluate(matching, ["apteka", "bank", "kino"])).toThrow(
      InvalidExerciseAnswerError,
    );
  });
});

describe("gap-fill", () => {
  it("shows the text around the gaps and never the answers", () => {
    const presented = registry.present(gapFill);
    expect(presented).toMatchObject({
      segments: ["El museo ", " en el centro y ", " muy grande."],
    });
    expect(JSON.stringify(presented)).not.toContain("está");
  });

  it("accepts each gap case-insensitively and shows the filled sentence", () => {
    expect(registry.evaluate(gapFill, ["Está", " es "]).evaluation).toEqual({
      correct: true,
      feedback: base.explanation,
      correctAnswer: "El museo está en el centro y es muy grande.",
    });
    expect(registry.evaluate(gapFill, ["es", "está"]).evaluation.correct).toBe(false);
    expect(() => registry.evaluate(gapFill, ["está"])).toThrow(InvalidExerciseAnswerError);
    expect(() => registry.evaluate(gapFill, ["está", ""])).toThrow(InvalidExerciseAnswerError);
  });
});

describe("open-writing", () => {
  it("counts the task as done when the length is right and offers the model answer", () => {
    const done = registry.evaluate(
      openWriting,
      "Mi barrio es tranquilo y hay una panadería muy buena cerca.",
    ).evaluation;
    expect(done.correct).toBe(true);
    expect(done.correctAnswer).toBe(
      "Vivo en Cracovia. Cerca de mi casa hay un parque y una farmacia.",
    );
    expect(registry.evaluate(openWriting, "Hola.").evaluation.correct).toBe(false);
  });

  it("never shows the model answer before the learner writes", () => {
    expect(JSON.stringify(registry.present(openWriting))).not.toContain("Cracovia");
  });
});
