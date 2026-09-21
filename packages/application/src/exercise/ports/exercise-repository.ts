import type { Exercise, ExerciseId, LessonId } from "@tfm-bic/domain";

/**
 * Where exercises come from. Owned by this layer, implemented in `packages/data`
 * (today: the validated files under `content/`, like lessons; later possibly a
 * database or CMS — nothing above this interface changes).
 *
 * Storage only: it returns exercises of every status, in no guaranteed order.
 * Which of them a student may see, and in what order, is a business rule of the
 * use cases, so a new adapter cannot accidentally widen visibility. Exercises
 * are read-only here: there is no way to create or change one through this port.
 */
export interface ExerciseRepository {
  /** Every exercise attached to a lesson, of every status, in no guaranteed order. */
  listByLesson(lessonId: LessonId): Promise<readonly Exercise[]>;
  findById(exerciseId: ExerciseId): Promise<Exercise | null>;
}
