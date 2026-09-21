import type { RewardsResponse } from "@tfm-bic/contracts";

import { AchievementIcon } from "./achievement-icon.js";
import { formatPointsEarned } from "./reward-labels.js";

/**
 * What an action just earned, exactly as the server reported it: the points, and each
 * achievement unlocked. It shows a decision, it makes none — nothing here computes points or
 * decides an unlock — and it renders nothing at all for an action that earned nothing (a repeat,
 * or a wrong answer).
 *
 * It has no role of its own and no animation: it is placed inside a live region the page already
 * has (the exercise verdict, the lesson completion), so it is announced with it, and it reads the
 * same with animations off. Every string, including the achievement's title and description, is
 * rendered as text.
 */
export function RewardNotice({ rewards }: { rewards: RewardsResponse }) {
  if (rewards.pointsAwarded === 0 && rewards.achievementsUnlocked.length === 0) {
    return null;
  }

  return (
    <div data-testid="reward-notice" className="mt-3 rounded-lg border-2 border-accent px-4 py-3">
      <p className="font-semibold">{formatPointsEarned(rewards.pointsAwarded)}</p>
      {rewards.achievementsUnlocked.length === 0 ? null : (
        <ul aria-label="Achievements unlocked" className="mt-2 space-y-2">
          {rewards.achievementsUnlocked.map((achievement) => (
            <li key={achievement.key} className="flex items-start gap-3">
              <AchievementIcon iconId={achievement.iconId} />
              <p>
                Achievement unlocked: <strong>{achievement.title}</strong>
                <span className="block text-sm text-primary/80 dark:text-surface/80">
                  {achievement.description}
                </span>
                <span className="block text-sm">
                  {formatPointsEarned(achievement.rewardPoints)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
