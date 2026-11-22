import { Link } from "../components/app-link.js";

import { LoadError } from "../components/catalog-notices.js";
import { ContinueLearning } from "../components/continue-learning.js";
import { MemoryAndAccess } from "../components/memory-and-access.js";
import { PointsSummary } from "../components/points-summary.js";
import { useGamificationSummary } from "../hooks/use-gamification.js";
import { m } from "../i18n/index.js";

const t = m.learn.dashboard;

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
        {t.title}
      </h1>

      {/* M21: the dashboard leads into the learning flow first; points follow. */}
      <div className="mt-6">
        <ContinueLearning />
      </div>

      <div className="mt-6">
        {summaryQuery.isPending ? (
          <p role="status">{t.loadingProgress}</p>
        ) : summaryQuery.isError ? (
          <LoadError message={t.loadError} onRetry={() => void summaryQuery.refetch()} />
        ) : (
          <PointsSummary summary={summaryQuery.data} />
        )}
      </div>

      <div className="mt-6">
        <MemoryAndAccess />
      </div>

      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
        <Link to="/wyzwanie-7-dni" className="underline underline-offset-2">
          {t.goChallenge}
        </Link>
        <Link to="/learn/lessons" className="underline underline-offset-2">
          {t.goLessons}
        </Link>
        <Link to="/learn/memory" className="underline underline-offset-2">
          {t.goMemory}
        </Link>
        <Link to="/learn/vocabulary" className="underline underline-offset-2">
          {t.goVocabulary}
        </Link>
        <Link to="/learn/videos" className="underline underline-offset-2">
          {t.goVideos}
        </Link>
      </p>
    </section>
  );
}
