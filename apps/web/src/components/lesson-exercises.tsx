import { useLessonExercises } from "../hooks/use-exercises.js";
import { LoadError } from "./catalog-notices.js";
import { ExerciseList } from "./exercise-list.js";

const enc = encodeURIComponent;

/**
 * The "Practice" part of a lesson page: the lesson's exercises, in order, with
 * the student's own results. It asks for *this lesson's* exercises only (nothing
 * is loaded globally) and knows nothing about how an exercise works — each row
 * links to its own page. A lesson with no exercises shows nothing at all, and a
 * failure to load them shows an error here without touching the lesson above,
 * which stays readable and completable. Practising never completes the lesson:
 * that stays its own explicit action.
 */
export function LessonExercises({ lessonId }: { lessonId: string }) {
  const query = useLessonExercises(lessonId);

  if (query.isPending) {
    return <p role="status">Loading exercises…</p>;
  }
  if (query.isError) {
    return (
      <LoadError
        message="We couldn't load the exercises. Please try again."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { exercises, progress } = query.data;
  if (exercises.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="lesson-practice-heading" className="mt-8">
      <h2 id="lesson-practice-heading" className="text-lg font-semibold">
        Practice
      </h2>
      <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">
        {progress.answered} of {progress.total} exercises answered
      </p>
      {progress.total > 0 && progress.answered === progress.total ? (
        <p className="mt-1 text-sm font-medium">You have answered every exercise.</p>
      ) : null}
      <div className="mt-3">
        <ExerciseList
          exercises={exercises}
          getHref={(exercise) => `/learn/exercises/${enc(exercise.id)}`}
        />
      </div>
    </section>
  );
}
