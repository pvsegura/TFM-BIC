import type { LessonSummaryResponse } from "@tfm-bic/contracts";

import { LessonCard } from "./lesson-card.js";

export interface LessonListProps {
  /** Already in display order — the API sorts by explicit `order`. */
  lessons: readonly LessonSummaryResponse[];
  getHref: (lesson: LessonSummaryResponse) => string;
}

/**
 * The lessons of one language and level as a named, ordered list. Lessons are
 * numbered by their place in the list, not by the internal `order` value (which
 * has gaps on purpose), so the numbers a student sees are always 1, 2, 3.
 */
export function LessonList({ lessons, getHref }: LessonListProps) {
  return (
    <ol aria-label="Lessons" className="grid gap-3">
      {lessons.map((lesson, index) => (
        <LessonCard key={lesson.id} lesson={lesson} position={index + 1} href={getHref(lesson)} />
      ))}
    </ol>
  );
}
