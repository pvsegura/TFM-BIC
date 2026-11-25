import { skipToken, useQuery } from "@tanstack/react-query";

import { fetchBookIndex } from "../services/books-api.js";

/** Page numbers change only when the books are regenerated (with a deploy). */
const STALE_MS = 60 * 60 * 1000;

/**
 * The printed-book page index of a course. The course code always carries the instruction language
 * ({language}-{instruction}-{level}); the server falls back to {language}-{level} for a language
 * with a single course, so nothing here needs to know which languages have several.
 */
export function useBookIndex(
  languageId: string | undefined,
  levelId: string | undefined,
  instructionLanguage: string | undefined,
) {
  const course =
    languageId && levelId && instructionLanguage
      ? `${languageId}-${instructionLanguage}-${levelId}`
      : undefined;
  return useQuery({
    queryKey: ["books", course],
    queryFn: course === undefined ? skipToken : () => fetchBookIndex(course),
    staleTime: STALE_MS,
    retry: false,
  });
}

/** The workbook page of an exercise that has a workbook number, or `undefined`. */
export function useWorkbookPage(exercise: {
  languageId: string;
  levelId: string;
  instructionLanguage: string;
  book?: { unit: number; number: number } | undefined;
}): number | undefined {
  const { data } = useBookIndex(
    exercise.book ? exercise.languageId : undefined,
    exercise.levelId,
    exercise.instructionLanguage,
  );
  if (!exercise.book) return undefined;
  return data?.zeszyt?.index[
    `exercise:${String(exercise.book.unit)}.${String(exercise.book.number)}`
  ];
}
