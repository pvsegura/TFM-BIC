import { m } from "../i18n/index.js";
import { useBookIndex } from "../hooks/use-book-index.js";

/**
 * "In the textbook: p. 24 · In the workbook: p. 21" under a lesson title — the web pointing to the
 * printed books (PLAN-LIBROS.md §2). Shows nothing when the course has no books yet.
 */
export function BookPagesNote({
  languageId,
  levelId,
  lessonId,
}: {
  languageId: string;
  levelId: string;
  lessonId: string;
}) {
  const { data } = useBookIndex(languageId, levelId);
  const textbook = data?.podrecznik?.index[`lesson:${lessonId}`];
  const workbook = data?.zeszyt?.index[`lesson:${lessonId}`];
  if (textbook === undefined && workbook === undefined) return null;
  const parts = [
    textbook === undefined ? null : m.learn.books.textbookPage(String(textbook)),
    workbook === undefined ? null : m.learn.books.workbookPage(String(workbook)),
  ].filter(Boolean);
  return (
    <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
      <span aria-hidden="true">📖 </span>
      {parts.join(" · ")}
    </p>
  );
}
