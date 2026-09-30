import { Link } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { ContinueLearning } from "../components/continue-learning.js";
import { PointsSummary } from "../components/points-summary.js";
import { useGamificationSummary } from "../hooks/use-gamification.js";

/**
 * The student's dashboard. For now it carries one thing — their points and achievements, from
 * `GET /gamification/summary` (one request for the whole card) — plus the way back to their
 * lessons; other dashboard content arrives with the features that produce it. The page is behind
 * the login route, but the API is the real boundary: it answers only for the session's student.
 */
export function DashboardPage() {
  const summaryQuery = useGamificationSummary();

  return (
    <section aria-labelledby="dashboard-heading" className="mx-auto max-w-3xl py-8">
      <h1 id="dashboard-heading" className="text-2xl font-semibold">
        Dashboard
      </h1>

      {/* M21: the dashboard leads into the learning flow first; points follow. */}
      <div className="mt-6">
        <ContinueLearning />
      </div>

      <div className="mt-6">
        {summaryQuery.isPending ? (
          <p role="status">Loading your progress…</p>
        ) : summaryQuery.isError ? (
          <LoadError
            message="We couldn't load your progress. Please try again."
            onRetry={() => void summaryQuery.refetch()}
          />
        ) : (
          <PointsSummary summary={summaryQuery.data} />
        )}
      </div>

      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
        <Link to="/learn/lessons" className="underline underline-offset-2">
          Go to lessons
        </Link>
        <Link to="/learn/videos" className="underline underline-offset-2">
          Browse the videos
        </Link>
        <Link to="/learn/vocabulary" className="underline underline-offset-2">
          Vocabulary
        </Link>
      </p>
    </section>
  );
}
