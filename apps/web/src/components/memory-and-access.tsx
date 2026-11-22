import { useUserScopedQuery } from "../hooks/use-user-scoped-query.js";
import { m } from "../i18n/index.js";
import { fetchMyAccess } from "../services/commerce-api.js";
import { fetchMemoryStats } from "../services/memory-api.js";
import { Link } from "./app-link.js";

const t = m.learn.dashboard;

/** Dashboard cards: words due / consolidated / streak from the memory trainer, and own access. */
export function MemoryAndAccess() {
  const stats = useUserScopedQuery(["memory", "stats"], fetchMemoryStats);
  const access = useUserScopedQuery(["me", "access"], fetchMyAccess);
  const courses = (access.data?.licences ?? [])
    .filter((l) => l.active && l.kind.startsWith("COURSE_"))
    .map((l) => l.kind.replace("COURSE_", ""));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section
        aria-labelledby="dash-memory"
        className="rounded-xl border border-primary/15 p-5 dark:border-surface/15"
      >
        <h2 id="dash-memory" className="text-lg font-semibold">
          {t.memoryTitle}
        </h2>
        {stats.data ? (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <dd className="font-display text-2xl font-bold">{stats.data.dueNow}</dd>
              <dt className="text-xs">{t.memoryDue}</dt>
            </div>
            <div>
              <dd className="font-display text-2xl font-bold">{stats.data.mature}</dd>
              <dt className="text-xs">{t.memoryLearned}</dt>
            </div>
            <div>
              <dd className="font-display text-2xl font-bold">{stats.data.streakDays}</dd>
              <dt className="text-xs">{t.memoryStreak}</dt>
            </div>
          </dl>
        ) : null}
        <Link
          to="/learn/memory"
          className="mt-4 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-primary"
        >
          {t.memoryCta}
        </Link>
      </section>
      <section
        aria-labelledby="dash-access"
        className="rounded-xl border border-primary/15 p-5 dark:border-surface/15"
      >
        <h2 id="dash-access" className="text-lg font-semibold">
          {t.accessTitle}
        </h2>
        {access.data ? (
          <p className="mt-2 text-sm">
            {access.data.premium
              ? t.accessPremium
              : courses.length > 0
                ? t.accessCourses(courses.join(", "))
                : t.accessFree}
          </p>
        ) : null}
        {access.data && !access.data.premium ? (
          <Link to="/cennik" className="mt-3 inline-block text-sm underline underline-offset-2">
            {t.seePricing}
          </Link>
        ) : null}
      </section>
    </div>
  );
}
