import { Button } from "@verbysia/ui";
import { useState, type FormEvent } from "react";

import type { StudentListParams } from "../services/teacher-dashboard-api.js";
import { m } from "../i18n/index.js";
const t = m.study.teacher;

const SORT_LABELS: Record<NonNullable<StudentListParams["sort"]>, string> = t.sort;

type FilterKey = "q" | "activity" | "sort" | "direction";

const SELECT_CLASSES =
  "mt-1 block rounded-md border border-primary/30 bg-surface px-2 py-1.5 text-sm dark:border-surface/30 dark:bg-surface-dark";

/**
 * Search, activity filter and sort for the roster. It only *chooses* parameters — the API
 * validates, filters and sorts — and every control is a labelled native element, so it works with
 * the keyboard and a screen reader as is.
 */
export function RosterFilters({
  params,
  onChange,
}: {
  params: StudentListParams;
  onChange: (key: FilterKey, value: string) => void;
}) {
  const [search, setSearch] = useState(params.q ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    onChange("q", search.trim());
  }

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <form role="search" onSubmit={submit} className="flex items-end gap-2">
        <div>
          <label htmlFor="roster-search" className="text-sm font-medium">
            {t.searchLabel}
          </label>
          <input
            id="roster-search"
            type="search"
            maxLength={50}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${SELECT_CLASSES} w-48`}
          />
        </div>
        <Button type="submit" variant="secondary">
          {t.searchButton}
        </Button>
      </form>

      <div>
        <label htmlFor="roster-activity" className="text-sm font-medium">
          {t.activity}
        </label>
        <select
          id="roster-activity"
          value={params.activity ?? ""}
          onChange={(event) => onChange("activity", event.target.value)}
          className={SELECT_CLASSES}
        >
          <option value="">{t.allStudents}</option>
          <option value="active">{t.active}</option>
          <option value="inactive">{t.inactive}</option>
        </select>
      </div>

      <div>
        <label htmlFor="roster-sort" className="text-sm font-medium">
          {t.sortBy}
        </label>
        <select
          id="roster-sort"
          value={params.sort ?? "name"}
          onChange={(event) => onChange("sort", event.target.value)}
          className={SELECT_CLASSES}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="roster-direction" className="text-sm font-medium">
          {t.order}
        </label>
        <select
          id="roster-direction"
          value={params.direction ?? ""}
          onChange={(event) => onChange("direction", event.target.value)}
          className={SELECT_CLASSES}
        >
          <option value="">{t.orderDefault}</option>
          <option value="asc">{t.orderAsc}</option>
          <option value="desc">{t.orderDesc}</option>
        </select>
      </div>
    </div>
  );
}
