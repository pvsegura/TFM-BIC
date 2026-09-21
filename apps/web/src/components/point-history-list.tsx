import type { PointTransactionResponse } from "@tfm-bic/contracts";

import { formatDate, formatPointsEarned, rewardReasonLabel } from "./reward-labels.js";

/** The reason in words; an achievement's own title follows it when the server gave one. */
function describe(transaction: PointTransactionResponse): string {
  const label = rewardReasonLabel(transaction.reason);
  return transaction.title === null ? label : `${label}: ${transaction.title}`;
}

/**
 * Why the student has their points: one line per reward, newest first, as the server ordered
 * them — the amount, what it was for and when. It shows the ledger and computes nothing from it.
 * Only the reason and, for an achievement, its title are shown; internal ids (the exercise or
 * lesson that was rewarded) are not, since a student reads words, not slugs.
 */
export function PointHistoryList({
  transactions,
}: {
  transactions: readonly PointTransactionResponse[];
}) {
  return (
    <ol aria-label="Points history" className="divide-y divide-primary/10 dark:divide-surface/10">
      {transactions.map((transaction) => (
        <li
          key={transaction.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
        >
          <span>
            <span className="font-semibold tabular-nums">
              {formatPointsEarned(transaction.amount)}
            </span>{" "}
            <span>{describe(transaction)}</span>
          </span>
          <time
            dateTime={transaction.createdAt}
            className="text-sm text-primary/70 dark:text-surface/70"
          >
            {formatDate(transaction.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
