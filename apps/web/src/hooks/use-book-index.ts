import { skipToken, useQuery } from "@tanstack/react-query";

import { fetchBookIndex } from "../services/books-api.js";

/** Page numbers change only when the books are regenerated (with a deploy). */
const STALE_MS = 60 * 60 * 1000;

export function useBookIndex(languageId: string | undefined, levelId: string | undefined) {
  const course = languageId && levelId ? `${languageId}-${levelId}` : undefined;
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
  book?: { unit: number; number: number } | undefined;
}): number | undefined {
  const { data } = useBookIndex(exercise.book ? exercise.languageId : undefined, exercise.levelId);
  if (!exercise.book) return undefined;
  return data?.zeszyt?.index[
    `exercise:${String(exercise.book.unit)}.${String(exercise.book.number)}`
  ];
}
