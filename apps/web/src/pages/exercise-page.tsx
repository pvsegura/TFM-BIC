import type { ReactNode } from "react";
import { useParams } from "react-router";

import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import type { LearningLanguage } from "../components/content-blocks.js";
import { ExercisePlayer } from "../components/exercise-player.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { useExercise, useLessonExercises, useSubmitAnswer } from "../hooks/use-exercises.js";
import { isNotFoundError } from "../services/api-error.js";

const enc = encodeURIComponent;
const LESSONS_HREF = "/learn/lessons";

/**
 * One exercise for the signed-in student. The page loads the exercise (as a
 * student may see it *before* answering — the API sends no answer key), the
 * lesson's list (only for its place in the lesson and the next exercise), and the
 * language's catalog entry (for the text's direction), and hands them to the
 * player. Everything that matters lives on the server: the verdict comes back from
 * the API and is shown as it is, so a refresh shows the persisted result.
 *
 * The API is the authority on whether the exercise exists and is visible: a
 * missing, unpublished or malformed id is the same "not found" here, and the
 * requested id is never echoed. Nothing here names a language or an exercise type.
 */
export function ExercisePage() {
  const { exerciseId } = useParams();
  // Keyed by the id, so moving to the next exercise starts with a clean slate: no verdict,
  // selection or in-flight state from the previous one can carry over.
  return <ExerciseScreen key={exerciseId} exerciseId={exerciseId} />;
}

function ExerciseScreen({ exerciseId }: { exerciseId: string | undefined }) {
  const exerciseQuery = useExercise(exerciseId);
  const exercise = exerciseQuery.data;
  const listQuery = useLessonExercises(exercise?.lessonId);
  const languagesQuery = useLanguages();
  const submission = useSubmitAnswer();

  if (exercise) {
    const catalogLanguage = languagesQuery.data?.languages.find(
      (language) => language.code === exercise.languageId,
    );
    // Direction comes from the catalog metadata. If that could not be loaded the browser decides;
    // it is never assumed to be left-to-right.
    const language: LearningLanguage = catalogLanguage
      ? { locale: catalogLanguage.locale, direction: catalogLanguage.direction }
      : { locale: exercise.languageId };

    // The list only tells the player where it is; if it could not be loaded the exercise still works.
    const listed = listQuery.data;
    const index = listed ? listed.exercises.findIndex((item) => item.id === exercise.id) : -1;
    const next = listed && index >= 0 ? listed.exercises[index + 1] : undefined;

    return (
      <div className="mx-auto max-w-3xl py-8">
        <ExercisePlayer
          exercise={exercise}
          language={language}
          position={listed && index >= 0 ? index + 1 : null}
          total={listed && index >= 0 ? listed.exercises.length : null}
          nextHref={next ? `/learn/exercises/${enc(next.id)}` : null}
          lessonHref={`${LESSONS_HREF}/${enc(exercise.lessonId)}`}
          lessonFinished={
            listed !== undefined &&
            listed.progress.total > 0 &&
            listed.progress.answered === listed.progress.total
          }
          evaluation={submission.data}
          isSubmitting={submission.isPending}
          submitFailed={submission.isError}
          onSubmit={(answer) => {
            submission.mutate({ exerciseId: exercise.id, answer });
          }}
          onRetry={() => {
            submission.reset();
          }}
        />
      </div>
    );
  }

  // No exercise to show: still a page with a level-one heading.
  let body: ReactNode;
  if (exerciseQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading exercise…
      </p>
    );
  } else if (isNotFoundError(exerciseQuery.error)) {
    body = (
      <NotFoundNotice
        title="Exercise not found"
        message="That exercise is not available."
        backTo={LESSONS_HREF}
        backLabel="Back to lessons"
      />
    );
  } else {
    body = (
      <LoadError
        message="We couldn't load this exercise. Please try again."
        onRetry={() => void exerciseQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold">Exercise</h1>
      {body}
    </div>
  );
}
