import type { VocabularyCategoriesResponse } from "@tfm-bic/contracts";

export interface VocabularyCategoryListProps {
  categories: readonly VocabularyCategoriesResponse["categories"][number][];
  selectedId: string;
  onSelect: (categoryId: string) => void;
}

/** A language's vocabulary topics, each showing how many words it has and how many the student
 * has saved/learning/learned — a quick sense of progress before picking one to filter by. */
export function VocabularyCategoryList({
  categories,
  selectedId,
  onSelect,
}: VocabularyCategoryListProps) {
  return (
    <nav aria-label="Vocabulary categories">
      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const selected = category.id === selectedId;
          const classes = [
            "flex w-full flex-col rounded-lg border-2 px-4 py-3 text-left transition-colors",
            "hover:bg-primary/5 dark:hover:bg-surface/10",
            selected
              ? "border-primary bg-primary/5 dark:border-surface dark:bg-surface/10"
              : "border-primary/20 dark:border-surface/20",
          ].join(" ");

          return (
            <li key={category.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(selected ? "" : category.id)}
                className={classes}
              >
                <span className="font-medium">{category.title}</span>
                <span className="text-sm text-primary/70 dark:text-surface/70">
                  {category.progress.learned} of {category.progress.itemCount} learned
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
