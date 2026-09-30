import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import type { LearningLanguage } from "../components/content-blocks.js";
import { EducationalVideo } from "../components/educational-video.js";
import { LessonExercises } from "../components/lesson-exercises.js";
import { LessonViewer } from "../components/lesson-viewer.js";
import { useLanguages } from "../hooks/use-catalog.js";
import {
  useCompleteLesson,
  useLesson,
  useLessons,
  useStartLessonOnOpen,
} from "../hooks/use-lessons.js";
import { useLessonMedia } from "../hooks/use-media.js";
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
  const mediaQuery = useLessonMedia(lessonId);
  // The lesson's siblings, for "Next lesson" — the flow goes on without a trip back to the list.
  const siblingsQuery = useLessons(lessonQuery.data?.languageId, lessonQuery.data?.levelId);

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

    const siblings = [...(siblingsQuery.data?.lessons ?? [])].sort((a, b) => a.order - b.order);
    const next = siblings[siblings.findIndex((l) => l.id === lesson.id) + 1];
    const vocabularyHref = `/learn/vocabulary?language=${enc(lesson.languageId)}`;

    return (
      <div className="mx-auto max-w-3xl py-8">
        <LessonViewer
          hero={
            <EducationalVideo
              video={mediaQuery.isSuccess ? mediaQuery.data.video : undefined}
              isLoading={mediaQuery.isPending}
              loadFailed={mediaQuery.isError}
              onRetryLoad={() => void mediaQuery.refetch()}
              title={lesson.title}
              subject="this lesson"
              afterVideo={
                <p className="flex flex-wrap gap-x-5 gap-y-1">
                  <span className="font-medium">Next:</span>
                  <a href="#lesson-content" className="underline underline-offset-2">
                    Read the examples
                  </a>
                  <a href="#practice" className="underline underline-offset-2">
                    Practise with the exercises
                  </a>
                </p>
              }
            />
          }
          nextSteps={
            <nav
              aria-label="What's next"
              className="mt-8 rounded-lg border border-primary/15 p-4 dark:border-surface/15"
            >
              <h2 className="text-lg font-semibold">What's next</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {next ? (
                  <li>
                    <Link
                      to={`${LESSONS_HREF}/${enc(next.id)}`}
                      className="font-medium underline underline-offset-2"
                    >
                      Next lesson: {next.title} →
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link to={vocabularyHref} className="underline underline-offset-2">
                    Learn the words with their videos
                  </Link>
                </li>
              </ul>
            </nav>
          }
          lesson={lesson}
          language={language}
          isCompleting={completeMutation.isPending}
          completionFailed={completeMutation.isError}
          onComplete={() => {
            completeMutation.mutate(lesson.id);
          }}
          {...(completeMutation.data ? { rewards: completeMutation.data.rewards } : {})}
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
