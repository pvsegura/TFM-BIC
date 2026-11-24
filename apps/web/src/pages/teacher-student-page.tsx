import type { TeacherStudentDetailResponse } from "@verbysia/contracts";
import { Avatar } from "@verbysia/ui";
import { useParams } from "react-router";
import { Link } from "../components/app-link.js";

import { AchievementIcon } from "../components/achievement-icon.js";
import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { MediaBadge } from "../components/media-badge.js";
import { formatDate, formatNumber } from "../components/reward-labels.js";
import { StatCard } from "../components/stat-card.js";
import {
  FORBIDDEN_MESSAGE,
  formatLastActivity,
  formatPercent,
  isForbidden,
  levelLabel,
  studentName,
} from "../components/teacher-labels.js";
import { WeeklyProgressChart } from "../components/weekly-progress-chart.js";
import { useTeacherStudent } from "../hooks/use-teacher-dashboard.js";
import { isNotFoundError } from "../services/api-error.js";
import { m } from "../i18n/index.js";
const t = m.study.teacher;

type Detail = TeacherStudentDetailResponse;

const BACK_LINK = (
  <Link to="/teacher" className="text-sm underline underline-offset-2">
    {t.back}
  </Link>
);

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LessonsSection({ lessons }: { lessons: Detail["lessons"] }) {
  return (
    <Section id="student-lessons" title={t.lessons}>
      {lessons.byLevel.length === 0 ? (
        <p className="text-primary/80 dark:text-surface/80">{t.noLessons}</p>
      ) : (
        <ul className="space-y-3">
          {lessons.byLevel.map((level) => {
            const label = levelLabel(level.languageId, level.levelId);
            return (
              <li key={label}>
                <p className="font-medium">{label}</p>
                {level.publishedLessons === null ? (
                  <p className="text-sm">
                    {t.levelGone(formatNumber(level.completed), formatNumber(level.inProgress))}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <progress
                      value={level.completed}
                      max={Math.max(level.publishedLessons, 1)}
                      aria-label={t.levelProgressLabel(label)}
                      className="h-2 w-40 accent-accent"
                    />
                    <span className="text-sm">
                      {t.levelProgress(
                        formatNumber(level.completed),
                        formatNumber(level.publishedLessons),
                        formatNumber(level.inProgress),
                      )}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {lessons.unmatched === 0 ? null : (
        <p className="mt-2 text-xs text-primary/70 dark:text-surface/70">
          {t.unmatched(formatNumber(lessons.unmatched))}
        </p>
      )}

      {lessons.recent.length === 0 ? null : (
        <>
          <h3 className="mt-5 font-semibold">{t.recentLessons}</h3>
          <ul className="mt-2 divide-y divide-primary/10 dark:divide-surface/10">
            {lessons.recent.map((lesson) => (
              <li
                key={lesson.lessonId}
                className="flex flex-wrap justify-between gap-x-4 py-2 text-sm"
              >
                <span>{lesson.title ?? t.lessonGone}</span>{" "}
                <MediaBadge contentType="lesson" contentId={lesson.lessonId} />
                <span className="text-primary/80 dark:text-surface/80">
                  <span>{lesson.status === "completed" ? t.completed : t.inProgress}</span> ·{" "}
                  <time dateTime={lesson.updatedAt}>{formatDate(lesson.updatedAt)}</time>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function ExercisesSection({ exercises }: { exercises: Detail["exercises"] }) {
  return (
    <Section id="student-exercises" title={t.exercises}>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t.statAccuracy}
          value={
            exercises.accuracyPercent === null
              ? t.noAttempts
              : formatPercent(exercises.accuracyPercent)
          }
          hint={t.correctIncorrect(
            formatNumber(exercises.correctAttempts),
            formatNumber(exercises.incorrectAttempts),
          )}
        />
        <StatCard
          label={t.attempts}
          value={formatNumber(exercises.attempts)}
          hint={t.attemptsHint}
        />
        <StatCard
          label={t.latestCorrect}
          value={t.ofTotal(
            formatNumber(exercises.exercisesLatestCorrect),
            formatNumber(exercises.exercisesAttempted),
          )}
          hint={t.latestCorrectHint}
        />
      </dl>

      {exercises.recent.length === 0 ? null : (
        <>
          <h3 className="mt-5 font-semibold">{t.recentAnswers}</h3>
          <ul className="mt-2 divide-y divide-primary/10 dark:divide-surface/10">
            {exercises.recent.map((attempt, index) => (
              <li
                key={`${attempt.exerciseId}-${attempt.answeredAt}-${String(index)}`}
                className="flex flex-wrap justify-between gap-x-4 py-2 text-sm"
              >
                <span>{attempt.lessonTitle ?? t.exerciseGone}</span>
                <span className="text-primary/80 dark:text-surface/80">
                  <span>{attempt.correct ? t.correct : t.incorrect}</span> ·{" "}
                  <time dateTime={attempt.answeredAt}>{formatDate(attempt.answeredAt)}</time>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function PointsSection({ gamification }: { gamification: Detail["gamification"] }) {
  const { achievements } = gamification;
  return (
    <Section id="student-points" title={t.pointsTitle}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label={t.totalPoints} value={formatNumber(gamification.totalPoints)} />
        <StatCard
          label={t.achievementsUnlocked}
          value={t.ofTotal(
            formatNumber(achievements.unlockedCount),
            formatNumber(achievements.totalCount),
          )}
        />
      </dl>
      {gamification.unlocked.length === 0 ? null : (
        <ul className="mt-3 space-y-2">
          {gamification.unlocked.map((achievement) => (
            <li key={achievement.key} className="flex items-center gap-3 text-sm">
              <AchievementIcon iconId={achievement.iconId} unlocked />
              <span className="font-medium">{achievement.title}</span>
              <time
                dateTime={achievement.unlockedAt}
                className="text-primary/70 dark:text-surface/70"
              >
                {formatDate(achievement.unlockedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function StudentDetail({ detail }: { detail: Detail }) {
  const { student } = detail;
  const name = studentName(student.displayName);
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <span aria-hidden="true">
          <Avatar avatarId={student.avatarId} size="lg" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-primary/80 dark:text-surface/80">
            {student.nickname !== null && student.nickname !== student.displayName ? (
              <>{t.nickname(student.nickname)}</>
            ) : null}
            <span>{student.active ? t.active : t.inactive}</span> · {t.lastActivity}
            {formatLastActivity(student.lastActivityAt)}
          </p>
        </div>
      </div>

      <LessonsSection lessons={detail.lessons} />
      <ExercisesSection exercises={detail.exercises} />
      <PointsSection gamification={detail.gamification} />
      <Section id="student-progress" title={t.progressOverTime}>
        <WeeklyProgressChart weeks={detail.weekly} />
      </Section>
    </>
  );
}

/**
 * One student's learning picture for their teacher (`/teacher/students/:studentId`). The API
 * decides whether this teacher may see the student at all — another teacher's student is the same
 * "not found" as a student that does not exist, so this page can never tell them apart either.
 * Every number, percentage and week bucket is the API's.
 */
export function TeacherStudentPage() {
  const { studentId = "" } = useParams();
  const query = useTeacherStudent(studentId);

  let body;
  if (query.isPending) {
    body = <p role="status">{t.loadingStudent}</p>;
  } else if (query.isError) {
    if (isNotFoundError(query.error)) {
      body = (
        <NotFoundNotice
          title={t.studentNotFound}
          message={t.studentNotFoundMessage}
          backTo="/teacher"
          backLabel={t.back}
        />
      );
    } else if (isForbidden(query.error)) {
      body = (
        <p role="alert" className="mt-4 text-sm">
          {FORBIDDEN_MESSAGE}
        </p>
      );
    } else {
      body = <LoadError message={t.studentError} onRetry={() => void query.refetch()} />;
    }
  } else {
    body = <StudentDetail detail={query.data} />;
  }

  return (
    <div className="py-8">
      <p className="mb-4">{BACK_LINK}</p>
      {body}
    </div>
  );
}
