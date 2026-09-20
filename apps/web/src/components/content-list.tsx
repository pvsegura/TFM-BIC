import type { ContentSummaryResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

export interface ContentListProps {
  /** Already in display order — the API sorts by explicit `order`. */
  items: readonly ContentSummaryResponse[];
  getHref: (item: ContentSummaryResponse) => string;
  /** Accessible name of the list. */
  label?: string;
}

const TYPE_LABELS: Record<ContentSummaryResponse["type"], string> = {
  lesson: "Lesson",
  explanation: "Explanation",
};

/**
 * Discovery list for any language and level: an ordered list of content items,
 * each a link with its kind in words. Titles and descriptions are plain text
 * (React escapes them), so nothing in the data can become markup.
 */
export function ContentList({ items, getHref, label = "Content" }: ContentListProps) {
  return (
    <ol aria-label={label} className="grid gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-primary/20 px-4 py-3 dark:border-surface/20"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Link to={getHref(item)} className="font-medium underline-offset-2 hover:underline">
              {item.title}
            </Link>
            <span className="rounded-full border border-primary/30 px-2 py-0.5 text-xs dark:border-surface/30">
              {TYPE_LABELS[item.type]}
            </span>
          </div>
          <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">{item.description}</p>
        </li>
      ))}
    </ol>
  );
}
