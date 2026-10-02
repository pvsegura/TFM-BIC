import type { TeacherStudentDetailResponse } from "@tfm-bic/contracts";
import { Avatar } from "@tfm-bic/ui";
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
  plural,
  studentName,
} from "../components/teacher-labels.js";
import { WeeklyProgressChart } from "../components/weekly-progress-chart.js";
import { useTeacherStudent } from "../hooks/use-teacher-dashboard.js";
import { isNotFoundError } from "../services/api-error.js";

type Detail = TeacherStudentDetailResponse;

const BACK_LINK = (
  <Link to="/teacher" className="text-sm underline underline-offset-2">
    Back to your students
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
    <Section id="student-lessons" title="Lessons">
      {lessons.byLevel.length === 0 ? (
        <p className="text-primary/80 dark:text-surface/80">No lessons started yet.</p>
      ) : (
        <ul className="space-y-3">
          {lessons.byLevel.map((level) => {
            const label = levelLabel(level.languageId, level.levelId);
            return (
              <li key={label}>
                <p className="font-medium">{label}</p>
                {level.publishedLessons === null ? (
                  <p className="text-sm">
                    {formatNumber(level.completed)} completed · {formatNumber(level.inProgress)} in
                    progress (this level is no longer available)
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <progress
                      value={level.completed}
                      max={Math.max(level.publishedLessons, 1)}
                      aria-label={`${label} lessons completed`}
                      className="h-2 w-40 accent-accent"
                    />
                    <span className="text-sm">
                      {formatNumber(level.completed)} of {formatNumber(level.publishedLessons)}{" "}
                      published lessons completed · {formatNumber(level.inProgress)} in progress
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
          {plural(lessons.unmatched, "lesson record is", "lesson records are")} for a lesson no
          longer in the catalog; they still count in the totals.
        </p>
      )}

      {lessons.recent.length === 0 ? null : (
        <>
          <h3 className="mt-5 font-semibold">Recent lessons</h3>
          <ul className="mt-2 divide-y divide-primary/10 dark:divide-surface/10">
            {lessons.recent.map((lesson) => (
              <li
                key={lesson.lessonId}
                className="flex flex-wrap justify-between gap-x-4 py-2 text-sm"
              >
                <span>{lesson.title ?? "Lesson no longer available"}</span>{" "}
                <MediaBadge contentType="lesson" contentId={lesson.lessonId} />
                <span className="text-primary/80 dark:text-surface/80">
                  <span>{lesson.status === "completed" ? "Completed" : "In progress"}</span> ·{" "}
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
    <Section id="student-exercises" title="Exercises">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Accuracy"
          value={
            exercises.accuracyPercent === null
              ? "No attempts yet"
              : formatPercent(exercises.accuracyPercent)
          }
          hint={`${formatNumber(exercises.correctAttempts)} correct · ${formatNumber(exercises.incorrectAttempts)} incorrect`}
        />
        <StatCard
          label="Attempts"
          value={formatNumber(exercises.attempts)}
          hint="Every answer counts, retries included"
        />
        <StatCard
          label="Correct on the latest try"
          value={`${formatNumber(exercises.exercisesLatestCorrect)} of ${formatNumber(exercises.exercisesAttempted)}`}
          hint="Exercises whose most recent answer was correct"
        />
      </dl>

      {exercises.recent.length === 0 ? null : (
        <>
          <h3 className="mt-5 font-semibold">Recent answers</h3>
          <ul className="mt-2 divide-y divide-primary/10 dark:divide-surface/10">
            {exercises.recent.map((attempt, index) => (
              <li
                key={`${attempt.exerciseId}-${attempt.answeredAt}-${String(index)}`}
                className="flex flex-wrap justify-between gap-x-4 py-2 text-sm"
              >
                <span>{attempt.lessonTitle ?? "Exercise no longer available"}</span>
                <span className="text-primary/80 dark:text-surface/80">
                  <span>{attempt.correct ? "Correct" : "Incorrect"}</span> ·{" "}
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
    <Section id="student-points" title="Points and achievements">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total points" value={formatNumber(gamification.totalPoints)} />
        <StatCard
          label="Achievements unlocked"
          value={`${formatNumber(achievements.unlockedCount)} of ${formatNumber(achievements.totalCount)}`}
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
              <>Nickname: {student.nickname} · </>
            ) : null}
            <span>{student.active ? "Active" : "Inactive"}</span> · Last activity:{" "}
            {formatLastActivity(student.lastActivityAt)}
          </p>
        </div>
      </div>

      <LessonsSection lessons={detail.lessons} />
      <ExercisesSection exercises={detail.exercises} />
      <PointsSection gamification={detail.gamification} />
      <Section id="student-progress" title="Progress over time">
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
    body = <p role="status">Loading student…</p>;
  } else if (query.isError) {
    if (isNotFoundError(query.error)) {
      body = (
        <NotFoundNotice
          title="Student not found"
          message="This student is not in your list, or the link is out of date."
          backTo="/teacher"
          backLabel="Back to your students"
        />
      );
    } else if (isForbidden(query.error)) {
      body = (
        <p role="alert" className="mt-4 text-sm">
          {FORBIDDEN_MESSAGE}
        </p>
      );
    } else {
      body = (
        <LoadError
          message="We couldn't load this student. Please try again."
          onRetry={() => void query.refetch()}
        />
      );
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
