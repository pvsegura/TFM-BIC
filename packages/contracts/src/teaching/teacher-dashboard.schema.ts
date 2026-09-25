import {
  ACHIEVEMENT_ICON_IDS,
  DEFAULT_ROSTER_PAGE_SIZE,
  isValidAchievementKey,
  LESSON_PROGRESS_STATUSES,
  MAX_ROSTER_PAGE,
  MAX_ROSTER_PAGE_SIZE,
  MAX_ROSTER_SEARCH_LENGTH,
  ROSTER_ACTIVITY_FILTERS,
  ROSTER_SORT_DIRECTIONS,
  ROSTER_SORT_FIELDS,
} from "@tfm-bic/domain";
import { z } from "zod";

import { wholeNumberText } from "../common/whole-number-text.js";
import { avatarIdSchema } from "../profile/avatar-catalog.schema.js";

/**
 * Teacher dashboard shapes (M13). Requests carry no identity at all — the teacher is the session's
 * user — and every query is `.strict()`, so a `teacherId` (or any other undocumented key) is a
 * `400`, never silently ignored. Responses are allowlists: Zod drops any key not named here, so an
 * email, a role, a password hash or a submitted answer can never be serialised to a teacher.
 */

const isoTimestamp = z.iso.datetime();
const count = z.number().int().min(0);
const percent = z.number().int().min(0).max(100).nullable();

/** Trimmed, 1–50 characters, no control characters. Only ever compared as plain text. */
const searchTerm = z
  .string()
  .trim()
  .min(1)
  .max(MAX_ROSTER_SEARCH_LENGTH)
  .refine((value) => !/\p{Cc}/u.test(value), { error: "Must not contain control characters." });

/** `GET /teacher-dashboard/students?q=&activity=&sort=&direction=&page=&pageSize=` */
export const teacherStudentListQuerySchema = z.strictObject({
  q: searchTerm.optional(),
  activity: z.enum(ROSTER_ACTIVITY_FILTERS).optional(),
  sort: z.enum(ROSTER_SORT_FIELDS).optional(),
  direction: z.enum(ROSTER_SORT_DIRECTIONS).optional(),
  page: wholeNumberText.transform(Number).pipe(z.number().max(MAX_ROSTER_PAGE)).default(1),
  pageSize: wholeNumberText
    .transform(Number)
    .pipe(z.number().max(MAX_ROSTER_PAGE_SIZE))
    .default(DEFAULT_ROSTER_PAGE_SIZE),
});
export type TeacherStudentListQuery = z.infer<typeof teacherStudentListQuerySchema>;

/** The overview and the student detail take no query parameters at all. */
export const teacherDashboardEmptyQuerySchema = z.strictObject({});

/** `:studentId` is a UUID. Anything else is refused before any lookup. */
export const teacherStudentIdParamSchema = z.strictObject({ studentId: z.uuid() });

export const teacherOverviewResponseSchema = z.object({
  totalStudents: count,
  activeStudents: count,
  inactiveStudents: count,
  activeWindowDays: z.number().int().min(1),
  lessonsCompleted: count,
  exerciseAttempts: count,
  accuracyPercent: percent,
  points: count,
});
export type TeacherOverviewResponse = z.infer<typeof teacherOverviewResponseSchema>;

export const rosterStudentResponseSchema = z.object({
  studentId: z.uuid(),
  displayName: z.string().nullable(),
  nickname: z.string().nullable(),
  avatarId: avatarIdSchema.nullable(),
  lessonsCompleted: count,
  lessonsInProgress: count,
  exerciseAttempts: count,
  accuracyPercent: percent,
  points: count,
  lastActivityAt: isoTimestamp.nullable(),
  active: z.boolean(),
});
export type RosterStudentResponse = z.infer<typeof rosterStudentResponseSchema>;

export const teacherStudentsResponseSchema = z.object({
  students: z.array(rosterStudentResponseSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: count,
  totalPages: count,
  sort: z.object({
    field: z.enum(ROSTER_SORT_FIELDS),
    direction: z.enum(ROSTER_SORT_DIRECTIONS),
  }),
});
export type TeacherStudentsResponse = z.infer<typeof teacherStudentsResponseSchema>;

const levelProgressSchema = z.object({
  languageId: z.string(),
  levelId: z.string(),
  completed: count,
  inProgress: count,
  publishedLessons: count.nullable(),
});

const recentLessonSchema = z.object({
  lessonId: z.string(),
  title: z.string().nullable(),
  languageId: z.string().nullable(),
  levelId: z.string().nullable(),
  status: z.enum(LESSON_PROGRESS_STATUSES),
  startedAt: isoTimestamp,
  completedAt: isoTimestamp.nullable(),
  updatedAt: isoTimestamp,
});

const recentAttemptSchema = z.object({
  exerciseId: z.string(),
  lessonId: z.string().nullable(),
  lessonTitle: z.string().nullable(),
  correct: z.boolean(),
  answeredAt: isoTimestamp,
});

const weeklyProgressSchema = z.object({
  weekStart: isoTimestamp,
  lessonsCompleted: count,
  exerciseAttempts: count,
  correctAttempts: count,
  accuracyPercent: percent,
  points: count,
});

export const teacherStudentDetailResponseSchema = z.object({
  student: rosterStudentResponseSchema,
  lessons: z.object({
    byLevel: z.array(levelProgressSchema),
    unmatched: count,
    recent: z.array(recentLessonSchema),
  }),
  exercises: z.object({
    attempts: count,
    correctAttempts: count,
    incorrectAttempts: count,
    accuracyPercent: percent,
    exercisesAttempted: count,
    exercisesLatestCorrect: count,
    recent: z.array(recentAttemptSchema),
  }),
  gamification: z.object({
    totalPoints: count,
    achievements: z.object({ unlockedCount: count, totalCount: count }),
    unlocked: z.array(
      z.object({
        key: z.string().refine(isValidAchievementKey),
        title: z.string(),
        iconId: z.enum(ACHIEVEMENT_ICON_IDS),
        unlockedAt: isoTimestamp,
      }),
    ),
  }),
  weekly: z.array(weeklyProgressSchema),
});
export type TeacherStudentDetailResponse = z.infer<typeof teacherStudentDetailResponseSchema>;
