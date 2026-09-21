import type { ReactNode } from "react";
import { useSearchParams } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { LanguageLevelPicker } from "../components/language-level-picker.js";
import { LessonList } from "../components/lesson-list.js";
import { useLessons } from "../hooks/use-lessons.js";

const enc = encodeURIComponent;

const languageHref = (code: string) => `/learn/lessons?language=${enc(code)}`;
const levelHref = (code: string, id: string) => `${languageHref(code)}&level=${enc(id)}`;

function LessonsSection({ languageCode, levelId }: { languageCode: string; levelId: string }) {
  const lessonsQuery = useLessons(languageCode, levelId);

  let body: ReactNode;
  if (lessonsQuery.isPending) {
    body = <p role="status">Loading lessons…</p>;
  } else if (lessonsQuery.isError) {
    body = (
      <LoadError
        message="We couldn't load the lessons. Please try again."
        onRetry={() => void lessonsQuery.refetch()}
      />
    );
  } else if (lessonsQuery.data.lessons.length === 0) {
    body = <p>No lessons are available for this level yet.</p>;
  } else {
    body = (
      <LessonList
        lessons={lessonsQuery.data.lessons}
        getHref={(lesson) => `/learn/lessons/${enc(lesson.id)}`}
      />
    );
  }

  return (
    <section aria-labelledby="lessons-heading" className="mt-6">
      <h2 id="lessons-heading" className="mb-3 text-lg font-semibold">
        Lessons
      </h2>
      {body}
    </section>
  );
}

/**
 * The student's lessons: language, then level, then the lessons available there
 * with each one's own progress — for *every* language. The choice lives in the
 * URL (`?language=pl&level=a1`), so it is linkable and needs no client state;
 * the student's progress is server state (TanStack Query). Everything shown
 * comes from the catalog and lesson APIs; nothing here names a language. The
 * page is behind the login route, but the API is the real boundary. It sits
 * under `/learn` because `/lessons` is the API path (see ADR-019).
 */
export function LessonsPage() {
  const [searchParams] = useSearchParams();
  const languageCode = searchParams.get("language") ?? undefined;
  const levelId = searchParams.get("level") ?? undefined;

  return (
    <section aria-labelledby="lessons-page-heading" className="mx-auto max-w-3xl py-8">
      <h1 id="lessons-page-heading" className="text-2xl font-semibold">
        Lessons
      </h1>
      <LanguageLevelPicker
        languageCode={languageCode}
        levelId={levelId}
        getLanguageHref={languageHref}
        getLevelHref={levelHref}
        renderAvailableLevel={(code, id) => <LessonsSection languageCode={code} levelId={id} />}
      />
    </section>
  );
}
