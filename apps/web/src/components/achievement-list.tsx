import type { AchievementResponse } from "@tfm-bic/contracts";

import { AchievementIcon } from "./achievement-icon.js";
import { formatDate, formatNumber, formatPointsEarned } from "./reward-labels.js";

/** How far along a locked achievement is: a native `<progress>` (announced with its value) and the same numbers in words. */
export function AchievementProgress({
  title,
  current,
  target,
}: {
  title: string;
  current: number;
  target: number;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <progress
        value={current}
        max={target}
        aria-label={`${title} progress`}
        className="h-2 w-full max-w-40 accent-accent"
      />
      <span className="text-sm tabular-nums">
        {formatNumber(current)} / {formatNumber(target)}
      </span>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementResponse }) {
  const { unlocked, unlockedAt } = achievement;
  return (
    <li
      data-unlocked={unlocked}
      className="rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20"
    >
      <div className="flex items-start gap-3">
        <AchievementIcon iconId={achievement.iconId} unlocked={unlocked} />
        <div className="min-w-0">
          <h3 className="font-semibold">{achievement.title}</h3>
          <p className="text-sm text-primary/80 dark:text-surface/80">{achievement.description}</p>
          {unlocked ? (
            <p className="mt-2 text-sm font-medium">
              <span aria-hidden="true">✓ </span>
              Unlocked
              {unlockedAt === null ? null : <> {formatDate(unlockedAt)}</>}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium">
                <span aria-hidden="true">🔒 </span>
                Locked
              </p>
              <AchievementProgress
                title={achievement.title}
                current={achievement.progress.current}
                target={achievement.progress.target}
              />
            </>
          )}
          <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">
            {formatPointsEarned(achievement.rewardPoints)} reward
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * Every achievement, unlocked or not, as the server described it. It shows state and progress and
 * decides neither: whether something is unlocked, and how far along it is, are the API's. State is
 * always said in words ("Unlocked <date>", "Locked" with a progress count) as well as by icon and
 * dimming, so it never rests on colour alone; the list and the progress bars are native elements,
 * so keyboard and screen-reader users get them for free.
 */
export function AchievementList({
  achievements,
}: {
  achievements: readonly AchievementResponse[];
}) {
  return (
    <ul aria-label="Achievements" className="grid gap-3 sm:grid-cols-2">
      {achievements.map((achievement) => (
        <AchievementCard key={achievement.key} achievement={achievement} />
      ))}
    </ul>
  );
}
