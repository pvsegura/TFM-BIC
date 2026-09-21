import { Button } from "@tfm-bic/ui";

import { AchievementList } from "../components/achievement-list.js";
import { LoadError } from "../components/catalog-notices.js";
import { PointHistoryList } from "../components/point-history-list.js";
import { useAchievements, usePointHistory } from "../hooks/use-gamification.js";

function AchievementsSection() {
  const query = useAchievements();

  if (query.isPending) {
    return <p role="status">Loading achievements…</p>;
  }
  if (query.isError) {
    return (
      <LoadError
        message="We couldn't load your achievements. Please try again."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { achievements, unlockedCount, totalCount } = query.data;
  return (
    <>
      <p className="text-primary/80 dark:text-surface/80">
        {unlockedCount} of {totalCount} unlocked
      </p>
      <div className="mt-4">
        <AchievementList achievements={achievements} />
      </div>
    </>
  );
}

function HistorySection() {
  const query = usePointHistory();

  if (query.isPending) {
    return <p role="status">Loading points history…</p>;
  }
  if (query.isError) {
    return (
      <LoadError
        message="We couldn't load your points history. Please try again."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const transactions = query.data.pages.flatMap((page) => page.transactions);
  if (transactions.length === 0) {
    return (
      <p className="text-primary/80 dark:text-surface/80">
        No points yet. Complete an exercise or a lesson to earn your first points.
      </p>
    );
  }

  return (
    <>
      <PointHistoryList transactions={transactions} />
      {query.hasNextPage ? (
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </>
  );
}

/**
 * The student's achievements — locked and unlocked, with progress and unlock dates — and the
 * history of how their points were earned. Everything shown comes from the gamification API;
 * nothing is counted, unlocked or awarded here. The two sections load independently, so a failure
 * of one leaves the other usable. The page is behind the login route, but the API is the real
 * boundary: it answers only for the session's student.
 */
export function AchievementsPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold">Achievements</h1>
      <section aria-labelledby="achievements-heading" className="mt-4">
        <h2 id="achievements-heading" className="sr-only">
          Your achievements
        </h2>
        <AchievementsSection />
      </section>
      <section aria-labelledby="history-heading" className="mt-10">
        <h2 id="history-heading" className="text-lg font-semibold">
          Points history
        </h2>
        <div className="mt-3">
          <HistorySection />
        </div>
      </section>
    </div>
  );
}
