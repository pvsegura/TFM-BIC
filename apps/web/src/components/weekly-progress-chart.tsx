import type { TeacherStudentDetailResponse } from "@tfm-bic/contracts";

import { formatNumber } from "./reward-labels.js";
import { formatPercent, formatWeek } from "./teacher-labels.js";

type Week = TeacherStudentDetailResponse["weekly"][number];

/**
 * Exercise attempts per week as simple CSS bars (correct / incorrect stacked), followed by the
 * same data as a table. The bars are **decorative** (`aria-hidden`): the table is the accessible —
 * and exact — version, and the legend names both parts, so nothing depends on colour. The only
 * arithmetic here is drawing: bar heights relative to the busiest week. No library needed.
 */
export function WeeklyProgressChart({ weeks }: { weeks: readonly Week[] }) {
  const busiest = Math.max(1, ...weeks.map((w) => w.exerciseAttempts));

  return (
    <>
      <div data-chart aria-hidden="true" className="mt-2">
        <div className="flex h-32 items-end gap-1.5 border-b border-primary/20 dark:border-surface/20">
          {weeks.map((w) => {
            const incorrect = w.exerciseAttempts - w.correctAttempts;
            return (
              <div key={w.weekStart} className="flex flex-1 flex-col justify-end">
                <div
                  className="bg-primary/25 dark:bg-surface/30"
                  style={{ height: `${String((incorrect / busiest) * 100)}%` }}
                />
                <div
                  className="bg-accent"
                  style={{ height: `${String((w.correctAttempts / busiest) * 100)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1.5 text-[10px] text-primary/70 dark:text-surface/70">
          {weeks.map((w) => (
            <span key={w.weekStart} className="flex-1 truncate text-center">
              {formatWeek(w.weekStart)}
            </span>
          ))}
        </div>
        <p className="mt-2 flex gap-4 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-accent" /> Correct attempts
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-primary/25 dark:bg-surface/30" /> Incorrect
            attempts
          </span>
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="mb-1 text-left text-xs text-primary/70 dark:text-surface/70">
            Weekly activity (weeks start on Monday, UTC)
          </caption>
          <thead>
            <tr className="border-b border-primary/20 dark:border-surface/20">
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Week of
              </th>
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Lessons completed
              </th>
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Exercise attempts
              </th>
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Accuracy
              </th>
              <th scope="col" className="py-1.5 font-semibold">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekStart} className="border-b border-primary/10 dark:border-surface/10">
                <th scope="row" className="py-1.5 pr-3 font-normal">
                  {formatWeek(w.weekStart)}
                </th>
                <td className="py-1.5 pr-3 tabular-nums">{formatNumber(w.lessonsCompleted)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{formatNumber(w.exerciseAttempts)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{formatPercent(w.accuracyPercent)}</td>
                <td className="py-1.5 tabular-nums">{formatNumber(w.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
