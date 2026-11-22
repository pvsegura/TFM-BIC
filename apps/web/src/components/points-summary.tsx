import type { GamificationSummaryResponse } from "@verbysia/contracts";
import { Link } from "./app-link.js";

import { AchievementProgress } from "./achievement-list.js";
import { AchievementIcon } from "./achievement-icon.js";
import { PointHistoryList } from "./point-history-list.js";
import { formatNumber } from "./reward-labels.js";
import { m } from "../i18n/index.js";

const t = m.learn.points;

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
        {t.title}
      </h2>

      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
        <p>
          <span className="block text-4xl font-bold tabular-nums">
            {formatNumber(summary.totalPoints)}
          </span>
          <span className="text-sm text-primary/70 dark:text-surface/70">{t.total}</span>
        </p>
        <p>
          <span className="block text-2xl font-semibold tabular-nums">
            {formatNumber(achievements.unlockedCount)} / {formatNumber(achievements.totalCount)}
          </span>
          <span className="text-sm text-primary/70 dark:text-surface/70">
            {t.achievementsUnlocked}
          </span>
        </p>
      </div>

      <p className="mt-3">
        <Link to="/achievements" className="text-sm underline underline-offset-2">
          {t.viewAll}
        </Link>
      </p>

      {inProgressAchievements.length === 0 ? null : (
        <div className="mt-5">
          <h3 className="font-semibold">{t.closest}</h3>
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
        <h3 className="font-semibold">{t.recent}</h3>
        {recentTransactions.length === 0 ? (
          <p className="mt-2 text-primary/80 dark:text-surface/80">{t.none}</p>
        ) : (
          <div className="mt-2">
            <PointHistoryList transactions={recentTransactions} />
          </div>
        )}
      </div>
    </section>
  );
}
