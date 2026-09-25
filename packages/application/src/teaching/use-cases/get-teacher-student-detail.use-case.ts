import {
  accuracyPercent,
  createContentId,
  createExerciseId,
  isLesson,
  LanguageNotFoundError,
  LevelNotAvailableError,
  recentWeekStarts,
  requireRole,
  TeachingStudentNotFoundError,
  type AchievementIconId,
  type AchievementKey,
  type AchievementRegistry,
  type ContentItem,
  type LanguageId,
  type LevelId,
  type StoredLessonProgressStatus,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { ListContentUseCase } from "../../content/use-cases/list-content.use-case.js";
import type { ExerciseRepository } from "../../exercise/ports/exercise-repository.js";
import type { AchievementTexts } from "../../gamification/achievement-texts.js";
import type { GamificationRepository } from "../../gamification/ports/gamification-repository.js";
import { toAchievementViews } from "../../gamification/views.js";
import type { Clock } from "../../ports/clock.js";
import type {
  StudentLessonRecord,
  TeacherDashboardReadModel,
} from "../ports/teacher-dashboard-read-model.js";
import { toRosterStudentView, type RosterStudentView, type TeachingViewer } from "../views.js";

/** How many weeks the progress-over-time series covers, the current week included. */
export const DETAIL_WEEKS = 8;
const RECENT_LESSONS = 10;
const RECENT_ATTEMPTS = 10;

export interface GetTeacherStudentDetailInput {
  viewer: TeachingViewer;
  /** Client-supplied, so never trusted: it is only ever looked up *through the viewer's links*. */
  studentId: string;
  /** For achievement titles; one the texts exist in. */
  locale: string;
}

export interface LevelProgressView {
  languageId: string;
  levelId: string;
  completed: number;
  inProgress: number;
  /** Published lessons in that level today; `null` when the level is no longer available. */
  publishedLessons: number | null;
}

export interface RecentLessonView {
  lessonId: string;
  /** `null` when the lesson is no longer in the catalog. */
  title: string | null;
  languageId: string | null;
  levelId: string | null;
  status: StoredLessonProgressStatus;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface RecentAttemptView {
  exerciseId: string;
  lessonId: string | null;
  lessonTitle: string | null;
  correct: boolean;
  answeredAt: Date;
}

export interface WeeklyProgressView {
  weekStart: Date;
  lessonsCompleted: number;
  exerciseAttempts: number;
  correctAttempts: number;
  accuracyPercent: number | null;
  points: number;
}

export interface UnlockedAchievementSummary {
  key: AchievementKey;
  title: string;
  iconId: AchievementIconId;
  unlockedAt: Date;
}

export interface TeacherStudentDetail {
  student: RosterStudentView;
  lessons: {
    byLevel: LevelProgressView[];
    /** Progress records whose lesson is no longer in the catalog (still counted in totals). */
    unmatched: number;
    recent: RecentLessonView[];
  };
  exercises: {
    attempts: number;
    correctAttempts: number;
    incorrectAttempts: number;
    accuracyPercent: number | null;
    exercisesAttempted: number;
    exercisesLatestCorrect: number;
    recent: RecentAttemptView[];
  };
  gamification: {
    totalPoints: number;
    achievements: { unlockedCount: number; totalCount: number };
    unlocked: UnlockedAchievementSummary[];
  };
  weekly: WeeklyProgressView[];
}

export interface GetTeacherStudentDetailDependencies {
  readModel: TeacherDashboardReadModel;
  listContent: ListContentUseCase;
  contentRepository: ContentRepository;
  exerciseRepository: ExerciseRepository;
  gamificationRepository: GamificationRepository;
  achievementRegistry: AchievementRegistry;
  achievementTexts: AchievementTexts;
  clock: Clock;
}

function lessonIdOrNull(value: string) {
  try {
    return createContentId(value);
  } catch {
    return null;
  }
}

/**
 * One student's learning picture for their teacher. Nothing is recomputed from raw rows here:
 * lesson states are M6's, attempt verdicts and "latest" are M7's, points and achievements come
 * from M8's own repository and views, and "which lessons are published" is M5's
 * `ListContentUseCase`. What this adds is grouping, labels from content, and the week series.
 *
 * Access: the role is checked, then the read model is asked **through the viewer's links** — a
 * student who is not linked, does not exist, or is not a student is the same not-found.
 */
export class GetTeacherStudentDetailUseCase {
  constructor(private readonly deps: GetTeacherStudentDetailDependencies) {}

  async execute(input: GetTeacherStudentDetailInput): Promise<TeacherStudentDetail> {
    requireRole(input.viewer.role, ["TEACHER"]);
    const now = this.deps.clock.now();
    const weeks = recentWeekStarts(now, DETAIL_WEEKS);
    const [firstWeek] = weeks;
    const activity = await this.deps.readModel.studentActivity(input.viewer.id, input.studentId, {
      weeklyFrom: firstWeek ?? now,
      recentAttemptLimit: RECENT_ATTEMPTS,
    });
    if (activity === null) {
      throw new TeachingStudentNotFoundError();
    }

    // Only reached for a linked student, so these reads never touch anyone else's data.
    const studentId = activity.student.studentId;
    const [facts, unlocks, lessons, recentAttempts] = await Promise.all([
      this.deps.gamificationRepository.loadFacts(studentId),
      this.deps.gamificationRepository.listUnlockedAchievements(studentId),
      this.lessonsView(activity.lessons),
      this.recentAttempts(activity.recentAttempts),
    ]);

    const achievements = toAchievementViews(
      this.deps.achievementRegistry,
      this.deps.achievementTexts,
      input.locale,
      facts,
      unlocks,
    );
    const unlocked = achievements.flatMap((a) =>
      a.unlocked && a.unlockedAt !== null
        ? [{ key: a.key, title: a.title, iconId: a.iconId, unlockedAt: a.unlockedAt }]
        : [],
    );

    const { exerciseAttempts: attempts, correctAttempts } = activity.student;
    const weeklyByStart = new Map(activity.weekly.map((w) => [w.weekStart.getTime(), w]));

    return {
      student: toRosterStudentView(activity.student, now),
      lessons,
      exercises: {
        attempts,
        correctAttempts,
        incorrectAttempts: attempts - correctAttempts,
        accuracyPercent: accuracyPercent(correctAttempts, attempts),
        exercisesAttempted: activity.exercisesAttempted,
        exercisesLatestCorrect: activity.exercisesLatestCorrect,
        recent: recentAttempts,
      },
      gamification: {
        totalPoints: facts.totalPoints,
        achievements: { unlockedCount: unlocked.length, totalCount: achievements.length },
        unlocked,
      },
      weekly: weeks.map((weekStart) => {
        const week = weeklyByStart.get(weekStart.getTime());
        const weekAttempts = week?.exerciseAttempts ?? 0;
        const weekCorrect = week?.correctAttempts ?? 0;
        return {
          weekStart,
          lessonsCompleted: week?.lessonsCompleted ?? 0,
          exerciseAttempts: weekAttempts,
          correctAttempts: weekCorrect,
          accuracyPercent: accuracyPercent(weekCorrect, weekAttempts),
          points: week?.points ?? 0,
        };
      }),
    };
  }

  private async findLesson(lessonId: string): Promise<ContentItem | null> {
    const id = lessonIdOrNull(lessonId);
    const item = id === null ? null : await this.deps.contentRepository.findContent(id);
    return item !== null && isLesson(item) ? item : null;
  }

  /** `null` for an id that is malformed or no longer in the catalog. */
  private async findExercise(exerciseId: string) {
    try {
      return await this.deps.exerciseRepository.findById(createExerciseId(exerciseId));
    } catch {
      return null;
    }
  }

  private async publishedLessonCount(languageId: LanguageId, levelId: LevelId) {
    try {
      const items = await this.deps.listContent.execute({ languageId, levelId });
      return items.filter((item) => item.type === "lesson").length;
    } catch (error) {
      if (error instanceof LanguageNotFoundError || error instanceof LevelNotAvailableError) {
        return null;
      }
      throw error;
    }
  }

  private async lessonsView(unordered: readonly StudentLessonRecord[]) {
    // Most recently updated first, ties by id — not left to whatever order an adapter returns.
    const records = [...unordered].sort(
      (a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime() || a.lessonId.localeCompare(b.lessonId),
    );
    const items = await Promise.all(records.map((record) => this.findLesson(record.lessonId)));

    const levels = new Map<
      string,
      { languageId: LanguageId; levelId: LevelId; completed: number; inProgress: number }
    >();
    let unmatched = 0;
    records.forEach((record, index) => {
      const item = items[index];
      if (!item) {
        unmatched += 1;
        return;
      }
      const key = `${item.languageId}/${item.levelId}`;
      const entry = levels.get(key) ?? {
        languageId: item.languageId,
        levelId: item.levelId,
        completed: 0,
        inProgress: 0,
      };
      if (record.status === "completed") {
        entry.completed += 1;
      } else {
        entry.inProgress += 1;
      }
      levels.set(key, entry);
    });

    const byLevel: LevelProgressView[] = await Promise.all(
      [...levels.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(async ([, entry]) => ({
          ...entry,
          publishedLessons: await this.publishedLessonCount(entry.languageId, entry.levelId),
        })),
    );

    const recent = records.slice(0, RECENT_LESSONS).map((record, index) => {
      const item = items[index] ?? null;
      return {
        lessonId: record.lessonId,
        title: item?.title ?? null,
        languageId: item?.languageId ?? null,
        levelId: item?.levelId ?? null,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        updatedAt: record.updatedAt,
      };
    });

    return { byLevel, unmatched, recent };
  }

  private async recentAttempts(
    attempts: readonly { exerciseId: string; correct: boolean; answeredAt: Date }[],
  ): Promise<RecentAttemptView[]> {
    return Promise.all(
      attempts.map(async (attempt) => {
        const exercise = await this.findExercise(attempt.exerciseId);
        const lesson = exercise ? await this.findLesson(exercise.lessonId) : null;
        return {
          exerciseId: attempt.exerciseId,
          lessonId: exercise?.lessonId ?? null,
          lessonTitle: lesson?.title ?? null,
          correct: attempt.correct,
          answeredAt: attempt.answeredAt,
        };
      }),
    );
  }
}
