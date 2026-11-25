import { z } from "zod";

/**
 * Where things are in the printed books of one course (content/books/{language}-{level}.json),
 * written by the book generator and served as-is to the web, which shows "Podręcznik s. 42".
 * Keys: `unit:3`, `section:3/structure`, `lesson:{lessonId}`, `exercise:3.14`.
 */
const INDEX_KEY =
  /^(unit:\d{1,2}|section:\d{1,2}\/[a-z]+|lesson:[a-z][a-z0-9-]{0,63}|exercise:\d{1,2}\.\d{1,3})$/;

const bookPagesSchema = z.object({
  pages: z.number().int().min(1).max(2000),
  index: z.record(z.string().regex(INDEX_KEY), z.number().int().min(1).max(2000)),
});

export const COURSE_PATTERN = /^[a-z]{2,3}(?:-[a-z]{2,3})?-[a-z][0-9]$/;

export const bookIndexSchema = z.object({
  course: z.string().regex(COURSE_PATTERN),
  podrecznik: bookPagesSchema.optional(),
  zeszyt: bookPagesSchema.optional(),
});
export type BookIndexResponse = z.infer<typeof bookIndexSchema>;

export const bookCourseParamSchema = z.object({ course: z.string().regex(COURSE_PATTERN) });
