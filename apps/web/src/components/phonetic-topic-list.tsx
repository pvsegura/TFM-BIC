import type { PhoneticTopicsResponse } from "@tfm-bic/contracts";

export interface PhoneticTopicListProps {
  topics: readonly PhoneticTopicsResponse["topics"][number][];
  selectedId: string;
  onSelect: (topicId: string) => void;
}

/** A language's phonetics topics, each showing how many sounds it has and how many the student
 * has viewed/practiced/completed — a quick sense of progress before picking one to filter by. */
export function PhoneticTopicList({ topics, selectedId, onSelect }: PhoneticTopicListProps) {
  return (
    <nav aria-label="Phonetics topics">
      <ul className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => {
          const selected = topic.id === selectedId;
          const classes = [
            "flex w-full flex-col rounded-lg border-2 px-4 py-3 text-left transition-colors",
            "hover:bg-primary/5 dark:hover:bg-surface/10",
            selected
              ? "border-primary bg-primary/5 dark:border-surface dark:bg-surface/10"
              : "border-primary/20 dark:border-surface/20",
          ].join(" ");

          return (
            <li key={topic.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(selected ? "" : topic.id)}
                className={classes}
              >
                <span className="font-medium">{topic.title}</span>
                <span className="text-sm text-primary/70 dark:text-surface/70">
                  {topic.progress.completed} of {topic.progress.representationCount} completed
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
