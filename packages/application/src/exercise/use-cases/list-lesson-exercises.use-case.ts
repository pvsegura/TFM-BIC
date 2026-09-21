import {
  isPublished,
  sortContentItems,
  type ExerciseId,
  type ExerciseType,
  type LanguageId,
  type LessonId,
  type LevelId,
} from "@tfm-bic/domain";

import type { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { findVisibleLesson } from "../../lesson/find-visible-lesson.js";
import type { ExerciseAttemptRepository } from "../ports/exercise-attempt-repository.js";
import type { ExerciseRepository } from "../ports/exercise-repository.js";
import { toResultView, type ExerciseResultView } from "../result-view.js";

export interface ListLessonExercisesInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  lessonId: LessonId;
}

/** What an exercise list row needs: where it is, what kind it is, its prompt and this student's result. Never an option or an answer. */
export interface ExerciseSummary {
  id: ExerciseId;
  lessonId: LessonId;
  languageId: LanguageId;
  levelId: LevelId;
  type: ExerciseType;
  order: number;
  prompt: string;
  instructionLanguage: LanguageId;
  result: ExerciseResultView;
}

export interface LessonExercises {
  exercises: ExerciseSummary[];
  /** How many of the lesson's exercises the student has answered at least once. */
  progress: { total: number; answered: number };
}

/**
 * The exercises of a lesson a student can open, in explicit order (`order`, ties
 * by id — never storage order), each with the student's own result. The lesson
 * must be visible (`findVisibleLesson`, so every "cannot see it" reason is one
 * `LessonNotFoundError`); only `published` exercises are listed. Results come
 * from one batched lookup for the whole list, so the cost does not grow with the
 * number of exercises. Reading never writes.
 */
export class ListLessonExercisesUseCase {
  constructor(
    private readonly getContent: GetContentUseCase,
    private readonly exercises: ExerciseRepository,
    private readonly attempts: ExerciseAttemptRepository,
  ) {}

  async execute(input: ListLessonExercisesInput): Promise<LessonExercises> {
    const lesson = await findVisibleLesson(this.getContent, input.lessonId);

    const stored = await this.exercises.listByLesson(lesson.id);
    const visible = sortContentItems(stored.filter(isPublished));

    const summaries = await this.attempts.findSummaries(
      input.userId,
      visible.map((exercise) => exercise.id),
    );
    const summaryByExercise = new Map(summaries.map((summary) => [summary.exerciseId, summary]));

    const listed = visible.map((exercise): ExerciseSummary => ({
      id: exercise.id,
      lessonId: exercise.lessonId,
      languageId: exercise.languageId,
      levelId: exercise.levelId,
      type: exercise.type,
      order: exercise.order,
      prompt: exercise.prompt,
      instructionLanguage: exercise.instructionLanguage,
      result: toResultView(summaryByExercise.get(exercise.id) ?? null),
    }));

    return {
      exercises: listed,
      progress: {
        total: listed.length,
        answered: listed.filter((exercise) => exercise.result.status !== "unanswered").length,
      },
    };
  }
}
