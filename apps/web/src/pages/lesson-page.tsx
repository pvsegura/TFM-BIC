import type { ReactNode } from "react";
import { useParams } from "react-router";

import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import type { LearningLanguage } from "../components/content-blocks.js";
import { LessonExercises } from "../components/lesson-exercises.js";
import { LessonViewer } from "../components/lesson-viewer.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { useCompleteLesson, useLesson, useStartLessonOnOpen } from "../hooks/use-lessons.js";
import { isNotFoundError } from "../services/api-error.js";

const enc = encodeURIComponent;
const LESSONS_HREF = "/learn/lessons";

/**
 * One lesson for the signed-in student: it loads the lesson (with the student's
 * own progress), records that it was opened, shows it through the generic
 * viewer and offers the explicit completion action. All state that matters is
 * on the server — the page only asks and shows what it was told — so a refresh
 * shows the persisted status. Nothing here names a language.
 *
 * The API is the authority on whether the lesson exists and is visible: a
 * missing, unpublished or malformed id is the same "not found" here, and the
 * requested id is never echoed.
 */
export function LessonPage() {
  const { lessonId } = useParams();
  const lessonQuery = useLesson(lessonId);
  const languagesQuery = useLanguages();
  const completeMutation = useCompleteLesson();

  useStartLessonOnOpen(lessonQuery.data);

  let body: ReactNode;
  if (lessonQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading lesson…
      </p>
    );
  } else if (lessonQuery.isError) {
    body = isNotFoundError(lessonQuery.error) ? (
      <NotFoundNotice
        title="Lesson not found"
        message="That lesson is not available."
        backTo={LESSONS_HREF}
        backLabel="Back to lessons"
      />
    ) : (
      <LoadError
        message="We couldn't load this lesson. Please try again."
        onRetry={() => void lessonQuery.refetch()}
      />
    );
  } else {
    const lesson = lessonQuery.data;
    // Direction comes from the catalog metadata. If that could not be loaded the
    // browser decides; it is never assumed to be left-to-right.
    const catalogLanguage = languagesQuery.data?.languages.find(
      (l) => l.code === lesson.languageId,
    );
    const language: LearningLanguage = catalogLanguage
      ? { locale: catalogLanguage.locale, direction: catalogLanguage.direction }
      : { locale: lesson.languageId };

    return (
      <div className="mx-auto max-w-3xl py-8">
        <LessonViewer
          lesson={lesson}
          language={language}
          isCompleting={completeMutation.isPending}
          completionFailed={completeMutation.isError}
          onComplete={() => {
            completeMutation.mutate(lesson.id);
          }}
          practice={<LessonExercises lessonId={lesson.id} />}
          backHref={`${LESSONS_HREF}?language=${enc(lesson.languageId)}&level=${enc(lesson.levelId)}`}
        />
      </div>
    );
  }

  // No lesson to show: still a page with a level-one heading.
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold">Lesson</h1>
      {body}
    </div>
  );
}
