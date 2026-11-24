import type { RosterStudentResponse } from "@verbysia/contracts";
import { Avatar } from "@verbysia/ui";
import { Link } from "./app-link.js";

import { formatNumber } from "./reward-labels.js";
import { formatLastActivity, formatPercent, plural, studentName } from "./teacher-labels.js";
import { m } from "../i18n/index.js";
const t = m.study.teacher;

/** Columns that give way on small screens; their facts move into a summary line under the name. */
const WIDE_ONLY = "hidden md:table-cell";

function mobileSummary(student: RosterStudentResponse): string {
  const accuracy =
    student.accuracyPercent === null
      ? t.noAttemptsYet
      : t.accuracySummary(String(student.accuracyPercent));
  return `${plural(student.lessonsCompleted, "lesson")} · ${plural(student.points, "point")} · ${accuracy}`;
}

function ActivityStatus({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${active ? "bg-green-600" : "bg-primary/30 dark:bg-surface/30"}`}
      />
      {active ? t.active : t.inactive}
    </span>
  );
}

/**
 * The teacher's students as a table with a caption and real column headers. On small screens the
 * lower-priority columns collapse and a one-line summary under each name keeps their facts, so the
 * table never needs sideways scrolling to be useful. Status is a word, not a colour.
 */
export function StudentRoster({ students }: { students: readonly RosterStudentResponse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{t.rosterCaption}</caption>
        <thead>
          <tr className="border-b border-primary/20 dark:border-surface/20">
            <th scope="col" className="py-2 pr-3 font-semibold">
              {t.colStudent}
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              {t.colStatus}
            </th>
            <th scope="col" className={`${WIDE_ONLY} py-2 pr-3 font-semibold`}>
              {t.colLessons}
            </th>
            <th scope="col" className={`${WIDE_ONLY} py-2 pr-3 font-semibold`}>
              {t.colAccuracy}
            </th>
            <th scope="col" className={`${WIDE_ONLY} py-2 pr-3 font-semibold`}>
              {t.colPoints}
            </th>
            <th scope="col" className="hidden py-2 font-semibold sm:table-cell">
              {t.colLastActivity}
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.studentId}
              className="border-b border-primary/10 align-top dark:border-surface/10"
            >
              <td className="py-3 pr-3">
                <div className="flex items-start gap-3">
                  {/* Decorative here: the student's name is the link right next to it. */}
                  <span aria-hidden="true">
                    <Avatar avatarId={student.avatarId} />
                  </span>
                  <div>
                    <Link
                      to={`/teacher/students/${student.studentId}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {studentName(student.displayName)}
                    </Link>
                    <p className="mt-0.5 text-xs text-primary/70 md:hidden dark:text-surface/70">
                      {mobileSummary(student)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-3">
                <ActivityStatus active={student.active} />
              </td>
              <td className={`${WIDE_ONLY} py-3 pr-3 tabular-nums`}>
                {formatNumber(student.lessonsCompleted)}
              </td>
              <td className={`${WIDE_ONLY} py-3 pr-3 tabular-nums`}>
                {formatPercent(student.accuracyPercent)}
              </td>
              <td className={`${WIDE_ONLY} py-3 pr-3 tabular-nums`}>
                {formatNumber(student.points)}
              </td>
              <td className="hidden py-3 sm:table-cell">
                {formatLastActivity(student.lastActivityAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
