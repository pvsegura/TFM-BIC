import type { ContentStatus } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LevelId } from "../language/level-id.js";
import type { LessonId } from "../lesson/lesson.js";
import type { ExerciseId } from "./exercise-id.js";
import type { ExerciseType } from "./exercise-type.js";

/**
 * What every exercise has, whatever its type. An exercise is content, like a
 * lesson: data in a validated file, identified by a permanent id, tied to the
 * lesson it practises. It carries no language-specific behaviour — `languageId`
 * is just data — and no evaluation logic: what it *expects* is its type's
 * `configuration`; how an answer is *judged* is its type's evaluator.
 *
 * There are no created/updated timestamps: like all content, the file's history
 * is Git's.
 */
export interface ExerciseBase {
  id: ExerciseId;
  /** The lesson this exercise practises: a content item of type `lesson` in the same language and level. */
  lessonId: LessonId;
  languageId: LanguageId;
  levelId: LevelId;
  status: ContentStatus;
  /** Position within its lesson; unique there, gaps allowed. */
  order: number;
  /** The language the prompt and explanation are written in. */
  instructionLanguage: LanguageId;
  prompt: string;
  /** Static feedback shown after an answer, whether right or wrong. Never shown before. */
  explanation?: string | undefined;
}

/** A specific exercise: the common fields, its type and that type's configuration. */
export type ExerciseOfType<TType extends ExerciseType, TConfiguration> = ExerciseBase & {
  type: TType;
  configuration: TConfiguration;
};

/**
 * What a student may see before answering: identity, position and prompt. It is
 * built field by field, so `explanation` and `status` — and anything a type
 * adds to its configuration later — cannot ride along by accident.
 */
export interface PresentedExerciseBase {
  id: ExerciseId;
  lessonId: LessonId;
  languageId: LanguageId;
  levelId: LevelId;
  order: number;
  instructionLanguage: LanguageId;
  prompt: string;
}

export function presentBase(exercise: ExerciseBase): PresentedExerciseBase {
  return {
    id: exercise.id,
    lessonId: exercise.lessonId,
    languageId: exercise.languageId,
    levelId: exercise.levelId,
    order: exercise.order,
    instructionLanguage: exercise.instructionLanguage,
    prompt: exercise.prompt,
  };
}
