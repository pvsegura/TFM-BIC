import { Button } from "@tfm-bic/ui";
import { useSearchParams } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { formatNumber } from "../components/reward-labels.js";
import { RosterFilters } from "../components/roster-filters.js";
import { StatCard } from "../components/stat-card.js";
import { StudentRoster } from "../components/student-roster.js";
import { FORBIDDEN_MESSAGE, isForbidden, plural } from "../components/teacher-labels.js";
import { useTeacherOverview, useTeacherStudents } from "../hooks/use-teacher-dashboard.js";
import { studentListSearch } from "../services/teacher-dashboard-api.js";

function Forbidden() {
  return (
    <p role="alert" className="mt-4 text-sm">
      {FORBIDDEN_MESSAGE}
    </p>
  );
}

function OverviewSection() {
  const query = useTeacherOverview();

  if (query.isPending) {
    return <p role="status">Loading overview…</p>;
  }
  if (query.isError) {
    return isForbidden(query.error) ? (
      <Forbidden />
    ) : (
      <LoadError
        message="We couldn't load the overview. Please try again."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const o = query.data;
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={formatNumber(o.totalStudents)} />
        <StatCard
          label="Active"
          value={formatNumber(o.activeStudents)}
          hint={`${formatNumber(o.inactiveStudents)} inactive`}
        />
        <StatCard label="Lessons completed" value={formatNumber(o.lessonsCompleted)} />
        <StatCard label="Exercise attempts" value={formatNumber(o.exerciseAttempts)} />
        <StatCard
          label="Accuracy"
          value={o.accuracyPercent === null ? "No attempts yet" : `${String(o.accuracyPercent)}%`}
        />
        <StatCard label="Points earned" value={formatNumber(o.points)} />
      </dl>
      <p className="mt-3 text-xs text-primary/70 dark:text-surface/70">
        Active means at least one lesson or exercise in the last {o.activeWindowDays} days. Accuracy
        is correct answers out of all exercise attempts, retries included.
      </p>
    </>
  );
}

function StudentsSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = studentListSearch(searchParams);
  const query = useTeacherStudents(params);

  /** A filter change starts again from page 1; an empty value removes the parameter. */
  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete("page");
    setSearchParams(next);
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }
    setSearchParams(next);
  }

  const { page: _page, ...filters } = params;
  const filtered = Object.keys(filters).some((key) => key !== "sort" && key !== "direction");

  let body;
  if (query.isPending) {
    body = <p role="status">Loading students…</p>;
  } else if (query.isError) {
    body = isForbidden(query.error) ? (
      <Forbidden />
    ) : (
      <LoadError
        message="We couldn't load your students. Please try again."
        onRetry={() => void query.refetch()}
      />
    );
  } else if (query.data.total === 0) {
    body = (
      <p className="mt-4 text-primary/80 dark:text-surface/80">
        {filtered
          ? "No students match these filters."
          : "No students are linked to you yet. An administrator links students to your account."}
      </p>
    );
  } else {
    const { page, totalPages, total } = query.data;
    body = (
      <>
        <div className="mt-4">
          <StudentRoster students={query.data.students} />
        </div>
        <nav aria-label="Student pages" className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Previous page
          </Button>
          <p className="text-sm" aria-live="polite">
            Page {page} of {Math.max(totalPages, 1)} · {plural(total, "student")}
          </p>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next page
          </Button>
        </nav>
      </>
    );
  }

  return (
    <>
      <RosterFilters key={params.q ?? ""} params={params} onChange={update} />
      {body}
    </>
  );
}

/**
 * The teacher dashboard (`/teacher`): an overview of the teacher's own students and a paged,
 * searchable list of them. Every number comes from the API, which decides which students this
 * teacher may see; the page computes nothing. Filters, sort and page live in the URL, so a view
 * can be reloaded or shared with the same teacher. The two sections load independently.
 */
export function TeacherDashboardPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold">Teacher dashboard</h1>
      <section aria-labelledby="teacher-overview-heading" className="mt-6">
        <h2 id="teacher-overview-heading" className="mb-3 text-lg font-semibold">
          Overview
        </h2>
        <OverviewSection />
      </section>
      <section aria-labelledby="teacher-students-heading" className="mt-10">
        <h2 id="teacher-students-heading" className="mb-3 text-lg font-semibold">
          Students
        </h2>
        <StudentsSection />
      </section>
    </div>
  );
}
