import { describe, expect, it } from "vitest";

import { createExerciseId } from "../exercise/exercise-id.js";
import type { Exercise } from "../exercise/exercise.js";
import {
  makeMultipleChoiceExercise,
  makeTextAnswerExercise,
  makeTrueFalseExercise,
} from "../exercise/test-support/exercise-fixtures.js";
import { createLanguageId } from "../language/language-id.js";
import { createLevelId } from "../language/level-id.js";
import type { Language } from "../language/language.js";
import type { LanguageLevel } from "../language/language-level.js";
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
const levels: LanguageLevel[] = [
  { languageId: PL, levelId: A1, status: "available" },
  { languageId: PL, levelId: A2, status: "planned" },
];

function lesson(id: string, overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: createContentId(id),
    languageId: PL,
    levelId: A1,
    type: "lesson",
    status: "published",
    order: 10,
    instructionLanguage: createLanguageId("en"),
    title: id,
    description: "A lesson.",
    blocks: [{ type: "explanation", text: "Text." }],
    ...overrides,
  };
}

function catalog(exercises: Exercise[], content: ContentItem[] = [lesson("pl-greetings")]) {
  const result: ContentCatalog = {
    languages: [polish],
    languageLevels: levels,
    content,
    exercises,
    vocabularyCategories: [],
    vocabulary: [],
  };
  return result;
}

const messages = (c: ContentCatalog) => validateContentCatalog(c).map((issue) => issue.message);

describe("validateContentCatalog — exercises", () => {
  it("accepts a catalog whose exercises all belong to a published lesson of their language and level", () => {
    const exercises = [
      makeMultipleChoiceExercise(),
      makeTextAnswerExercise(),
      makeTrueFalseExercise(),
    ];

    expect(validateContentCatalog(catalog(exercises))).toEqual([]);
  });

  it("accepts a catalog with no exercises at all", () => {
    expect(validateContentCatalog(catalog([]))).toEqual([]);
  });

  it("rejects duplicate exercise ids across the whole catalog", () => {
    const first = makeTrueFalseExercise();
    const second = makeTrueFalseExercise({ order: 40 });

    expect(messages(catalog([first, second]))).toContain(
      'Duplicate exercise id "pl-greetings-informal-hi".',
    );
  });

  it("rejects an exercise id that is also a content id (the two id spaces must not overlap)", () => {
    const clash = makeTrueFalseExercise({ id: createExerciseId("pl-greetings") });

    expect(messages(catalog([clash]))).toContain(
      'Exercise id "pl-greetings" is also the id of a content item.',
    );
  });

  it("rejects an exercise that references an unknown language", () => {
    const stray = makeTrueFalseExercise({
      id: createExerciseId("xx-hello"),
      languageId: createLanguageId("xx"),
    });

    expect(messages(catalog([stray]))).toContain(
      'Exercise "xx-hello" references unknown language "xx".',
    );
  });

  it("rejects an exercise id that is not namespaced by its language", () => {
    const wrong = makeTrueFalseExercise({ id: createExerciseId("en-informal-hi") });

    expect(messages(catalog([wrong]))).toContain(
      'Exercise id "en-informal-hi" must start with its language id "pl-".',
    );
  });

  it("rejects an exercise in a level the language does not declare", () => {
    const stray = makeTrueFalseExercise({ levelId: createLevelId("c1"), status: "draft" });

    expect(messages(catalog([stray]))).toContain(
      'Exercise "pl-greetings-informal-hi" is in level "c1", which language "pl" does not declare.',
    );
  });

  it("rejects an exercise whose lesson does not exist", () => {
    const orphan = makeTrueFalseExercise({ lessonId: createContentId("pl-no-such-lesson") });

    expect(messages(catalog([orphan]))).toContain(
      'Exercise "pl-greetings-informal-hi" references unknown lesson "pl-no-such-lesson".',
    );
  });

  it("rejects an exercise attached to content that is not a lesson", () => {
    const note = lesson("pl-greetings", { type: "explanation" });
    const exercise = makeTrueFalseExercise();

    expect(messages(catalog([exercise], [note, lesson("pl-other", { order: 20 })]))).toContain(
      'Exercise "pl-greetings-informal-hi" references "pl-greetings", which is not a lesson.',
    );
  });

  it("rejects an exercise in a different level than its lesson", () => {
    const exercise = makeTrueFalseExercise({ levelId: A2, status: "draft" });

    expect(messages(catalog([exercise]))).toContain(
      'Exercise "pl-greetings-informal-hi" is in pl/a2 but its lesson "pl-greetings" is in pl/a1.',
    );
  });

  it("rejects a published exercise whose lesson is not published", () => {
    const draftLesson = lesson("pl-greetings", { status: "draft" });
    const other = lesson("pl-other", { order: 20 });
    const exercise = makeTrueFalseExercise();

    expect(messages(catalog([exercise], [draftLesson, other]))).toContain(
      'Published exercise "pl-greetings-informal-hi" belongs to lesson "pl-greetings", which is not published.',
    );
  });

  it("allows a draft exercise on a draft lesson (content in preparation)", () => {
    const draftLesson = lesson("pl-greetings", { status: "draft" });
    const other = lesson("pl-other", { order: 20 });
    const exercise = makeTrueFalseExercise({ status: "draft" });

    expect(validateContentCatalog(catalog([exercise], [draftLesson, other]))).toEqual([]);
  });

  it("rejects two exercises with the same order in one lesson, whatever their status", () => {
    const first = makeTrueFalseExercise();
    const clash = makeTextAnswerExercise({ order: first.order, status: "draft" });

    expect(messages(catalog([first, clash]))).toContain(
      'Exercise "pl-greetings-goodnight" reuses order 30 in lesson "pl-greetings".',
    );
  });

  it("allows the same order in different lessons", () => {
    const secondLesson = lesson("pl-other", { order: 20 });
    const first = makeTrueFalseExercise();
    const other = makeTextAnswerExercise({
      lessonId: createContentId("pl-other"),
      order: first.order,
    });

    expect(
      validateContentCatalog(catalog([first, other], [lesson("pl-greetings"), secondLesson])),
    ).toEqual([]);
  });

  it("reports every problem, not just the first", () => {
    const bad = [
      makeTrueFalseExercise({ lessonId: createContentId("pl-missing") }),
      makeTrueFalseExercise({ id: createExerciseId("en-x"), order: 99 }),
      makeTextAnswerExercise({ order: 99 }),
    ];

    expect(validateContentCatalog(catalog(bad)).length).toBeGreaterThanOrEqual(3);
  });
});
