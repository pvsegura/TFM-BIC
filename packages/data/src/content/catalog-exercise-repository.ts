import type { ExerciseRepository } from "@tfm-bic/application";
import type { ContentCatalog, Exercise, ExerciseId, LessonId } from "@tfm-bic/domain";

/**
 * An `ExerciseRepository` over an already-validated catalog held in memory — the
 * same catalog the content repository serves, so exercises and lessons can never
 * disagree about which version of the content they are. Storage only: it
 * returns every status, and deciding what a student may see belongs to the use
 * cases. Read-only by construction: there is no method to change an exercise. A
 * database- or CMS-backed adapter would replace this class and nothing above the
 * port would change.
 */
export class CatalogExerciseRepository implements ExerciseRepository {
  private readonly byId: ReadonlyMap<ExerciseId, Exercise>;
  private readonly byLesson: ReadonlyMap<LessonId, readonly Exercise[]>;

  constructor(catalog: ContentCatalog) {
    this.byId = new Map(catalog.exercises.map((exercise) => [exercise.id, exercise]));

    const grouped = new Map<LessonId, Exercise[]>();
    for (const exercise of catalog.exercises) {
      const siblings = grouped.get(exercise.lessonId) ?? [];
      siblings.push(exercise);
      grouped.set(exercise.lessonId, siblings);
    }
    this.byLesson = grouped;
  }

  listByLesson(lessonId: LessonId): Promise<readonly Exercise[]> {
    return Promise.resolve(this.byLesson.get(lessonId) ?? []);
  }

  findById(exerciseId: ExerciseId): Promise<Exercise | null> {
    return Promise.resolve(this.byId.get(exerciseId) ?? null);
  }
}
