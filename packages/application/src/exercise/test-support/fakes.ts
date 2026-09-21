import {
  createContentId,
  createExerciseId,
  createLanguageId,
  summarizeAttempts,
  type ContentCatalog,
  type Exercise,
  type ExerciseAttempt,
  type ExerciseAttemptSummary,
  type ExerciseId,
  type LessonId,
  type NewExerciseAttempt,
} from "@tfm-bic/domain";
import {
  makeMultipleChoiceExercise,
  makeTextAnswerExercise,
  makeTrueFalseExercise,
} from "@tfm-bic/domain/testing";

import { makeContentItem } from "../../content/test-support/fakes.js";
import { makeLessonCatalog } from "../../lesson/test-support/fakes.js";
import type { ExerciseAttemptRepository } from "../ports/exercise-attempt-repository.js";
import type { ExerciseRepository } from "../ports/exercise-repository.js";

/** In-memory `ExerciseRepository` for application and HTTP-layer tests. Like the real
 * adapters it returns exercises of every status, in the order given (deliberately
 * unsorted), so tests prove the use cases do the filtering and ordering. Test-only. */
export class FakeExerciseRepository implements ExerciseRepository {
  constructor(public exercises: Exercise[] = []) {}

  listByLesson(lessonId: LessonId): Promise<readonly Exercise[]> {
    return Promise.resolve(this.exercises.filter((exercise) => exercise.lessonId === lessonId));
  }

  findById(exerciseId: ExerciseId): Promise<Exercise | null> {
    return Promise.resolve(this.exercises.find((exercise) => exercise.id === exerciseId) ?? null);
  }
}

/** In-memory `ExerciseAttemptRepository`. Append-only like the real one, and it counts calls
 * so a test can prove a read never wrote, a refused request never reached persistence, and a
 * list needed one lookup rather than one per exercise. Test-only. */
export class FakeExerciseAttemptRepository implements ExerciseAttemptRepository {
  readonly attempts: ExerciseAttempt[] = [];
  writeCalls = 0;
  batchLookups = 0;

  record(attempt: NewExerciseAttempt): Promise<ExerciseAttempt> {
    this.writeCalls += 1;
    const stored: ExerciseAttempt = { ...attempt, id: this.attempts.length + 1 };
    this.attempts.push(stored);
    return Promise.resolve(stored);
  }

  findSummaries(
    userId: string,
    exerciseIds: readonly ExerciseId[],
  ): Promise<readonly ExerciseAttemptSummary[]> {
    this.batchLookups += 1;
    const own = this.attempts.filter((attempt) => attempt.userId === userId);
    return Promise.resolve(
      exerciseIds.flatMap((exerciseId) => summarizeAttempts(exerciseId, own) ?? []),
    );
  }

  /** Puts attempts in place directly, without going through a use case. */
  seed(...attempts: NewExerciseAttempt[]): void {
    for (const attempt of attempts) {
      this.attempts.push({ ...attempt, id: this.attempts.length + 1 });
    }
  }
}

/**
 * `makeLessonCatalog()` plus exercises, including the cases only exercises care
 * about: a draft and an archived exercise on a visible lesson, and published
 * exercises on lessons a student cannot open (a draft lesson, a lesson in a level
 * that is not available, and an explanation that is not a lesson at all — which
 * catalog validation rejects for real content, but a use case must never rely on
 * that to stay safe). Ids are `<lesson>-<slug>`; `pl-first` carries the three
 * types and `pl-empty` is a visible lesson with no exercises.
 */
export function makeExerciseCatalog(): ContentCatalog {
  const catalog = makeLessonCatalog();
  const on = (lesson: string) => ({ lessonId: createContentId(lesson) });
  const id = (value: string) => createExerciseId(value);

  return {
    ...catalog,
    content: [...catalog.content, makeContentItem("pl-empty", "pl", "a1", { order: 60 })],
    exercises: [
      makeTrueFalseExercise({ ...on("pl-first"), id: id("pl-first-tf"), order: 30 }),
      makeMultipleChoiceExercise({ ...on("pl-first"), id: id("pl-first-mc"), order: 10 }),
      makeTextAnswerExercise({ ...on("pl-first"), id: id("pl-first-text"), order: 20 }),
      makeTrueFalseExercise({
        ...on("pl-first"),
        id: id("pl-first-draft"),
        order: 40,
        status: "draft",
      }),
      makeTrueFalseExercise({
        ...on("pl-first"),
        id: id("pl-first-archived"),
        order: 50,
        status: "archived",
      }),
      makeTrueFalseExercise({ ...on("pl-draft"), id: id("pl-draft-tf"), order: 10 }),
      makeTrueFalseExercise({ ...on("pl-planned"), id: id("pl-planned-tf"), order: 10 }),
      makeTrueFalseExercise({ ...on("pl-note"), id: id("pl-note-tf"), order: 10 }),
      makeTrueFalseExercise({
        ...on("xx-only"),
        id: id("xx-only-tf"),
        languageId: createLanguageId("xx"),
        order: 10,
      }),
    ],
  };
}
