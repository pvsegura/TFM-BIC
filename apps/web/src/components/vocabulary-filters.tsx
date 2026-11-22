import { TextField } from "@verbysia/ui";
import type { VocabularyCategoriesResponse } from "@verbysia/contracts";
import { m } from "../i18n/index.js";

export interface VocabularyFiltersValue {
  category: string;
  status: string;
  q: string;
}

export interface VocabularyFiltersProps {
  categories: readonly VocabularyCategoriesResponse["categories"][number][];
  value: VocabularyFiltersValue;
  onChange: (value: VocabularyFiltersValue) => void;
  /** Whether the status filter offers "Not saved" — only browsing does; My Vocabulary never lists untouched words. */
  includeNewStatus?: boolean;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: m.vocabulary.anyStatus },
  { value: "new", label: m.vocabulary.statuses.new },
  { value: "saved", label: m.vocabulary.statuses.saved },
  { value: "learning", label: m.vocabulary.statuses.learning },
  { value: "learned", label: m.vocabulary.statuses.learned },
];

/** Category, status and search — the filters both the browse and My Vocabulary lists share.
 * Presentation only: it is given the current values and reports a whole new set back. */
export function VocabularyFilters({
  categories,
  value,
  onChange,
  includeNewStatus = true,
}: VocabularyFiltersProps) {
  const statusOptions = includeNewStatus
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((option) => option.value !== "new");

  return (
    <form
      role="search"
      aria-label={m.vocabulary.filterLabel}
      className="mt-4 flex flex-wrap items-end gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <TextField
        label={m.vocabulary.search}
        type="search"
        value={value.q}
        onChange={(event) => onChange({ ...value, q: event.target.value })}
        placeholder={m.vocabulary.searchPlaceholder}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="vocabulary-category" className="text-sm font-medium">
          {m.vocabulary.category}
        </label>
        <select
          id="vocabulary-category"
          value={value.category}
          onChange={(event) => onChange({ ...value, category: event.target.value })}
          className="rounded-md border border-primary/20 bg-surface px-3 py-2 text-sm text-primary dark:border-surface/20 dark:bg-surface-dark dark:text-surface"
        >
          <option value="">{m.vocabulary.everyCategory}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="vocabulary-status" className="text-sm font-medium">
          {m.vocabulary.status}
        </label>
        <select
          id="vocabulary-status"
          value={value.status}
          onChange={(event) => onChange({ ...value, status: event.target.value })}
          className="rounded-md border border-primary/20 bg-surface px-3 py-2 text-sm text-primary dark:border-surface/20 dark:bg-surface-dark dark:text-surface"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
