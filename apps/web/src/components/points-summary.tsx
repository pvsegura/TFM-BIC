import type { GamificationSummaryResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

import { AchievementProgress } from "./achievement-list.js";
import { AchievementIcon } from "./achievement-icon.js";
import { PointHistoryList } from "./point-history-list.js";
import { formatNumber } from "./reward-labels.js";

/**
 * The dashboard's gamification card: total points, how many achievements are unlocked, the ones
 * the student is closest to and their most recent rewards. Every number is the API's — nothing is
 * counted or added up here — and a student with nothing yet is told how to earn their first
 * points rather than shown an empty box.
 */
export function PointsSummary({ summary }: { summary: GamificationSummaryResponse }) {
  const { achievements, inProgressAchievements, recentTransactions } = summary;

  return (
    <section
      aria-labelledby="points-summary-heading"
      className="rounded-lg border border-primary/20 px-4 py-5 dark:border-surface/20"
    >
      <h2 id="points-summary-heading" className="text-lg font-semibold">
        Your points
      </h2>

      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
        <p>
          <span className="block text-4xl font-bold tabular-nums">
            {formatNumber(summary.totalPoints)}
          </span>
          <span className="text-sm text-primary/70 dark:text-surface/70">Total points</span>
        </p>
        <p>
          <span className="block text-2xl font-semibold tabular-nums">
            {formatNumber(achievements.unlockedCount)} / {formatNumber(achievements.totalCount)}
          </span>
          <span className="text-sm text-primary/70 dark:text-surface/70">
            Achievements unlocked
          </span>
        </p>
      </div>

      <p className="mt-3">
        <Link to="/achievements" className="text-sm underline underline-offset-2">
          View all achievements
        </Link>
      </p>

      {inProgressAchievements.length === 0 ? null : (
        <div className="mt-5">
          <h3 className="font-semibold">Closest achievements</h3>
          <ul className="mt-2 space-y-3">
            {inProgressAchievements.map((achievement) => (
              <li key={achievement.key} className="flex items-start gap-3">
                <AchievementIcon iconId={achievement.iconId} unlocked={false} />
                <div>
                  <p className="font-medium">{achievement.title}</p>
                  <AchievementProgress
                    title={achievement.title}
                    current={achievement.progress.current}
                    target={achievement.progress.target}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h3 className="font-semibold">Recent rewards</h3>
        {recentTransactions.length === 0 ? (
          <p className="mt-2 text-primary/80 dark:text-surface/80">
            No points yet. Complete an exercise or a lesson to earn your first points.
          </p>
        ) : (
          <div className="mt-2">
            <PointHistoryList transactions={recentTransactions} />
          </div>
        )}
      </div>
    </section>
  );
}
