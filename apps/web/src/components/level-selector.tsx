import type { LevelResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

export interface LevelSelectorProps {
  /** The levels one language declares, with their availability, from the API. */
  levels: readonly LevelResponse[];
  selectedId?: string | undefined;
  getHref: (levelId: string) => string;
}

const BASE = "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium";

/**
 * Reusable CEFR level chooser for any language. An `available` level is a link;
 * a `planned` level is deliberately *not* interactive — plain text with a
 * visible "Coming soon" label (not colour alone, and not a disabled control
 * that assistive technology might skip), so it can never be selected or reached
 * by keyboard. The current choice carries `aria-current` and a check mark.
 */
export function LevelSelector({ levels, selectedId, getHref }: LevelSelectorProps) {
  return (
    <nav aria-label="Levels">
      <ul className="flex flex-wrap gap-3">
        {levels.map((level) => {
          if (level.status !== "available") {
            return (
              <li
                key={level.id}
                className={`${BASE} border-dashed border-primary/30 text-primary/60 dark:border-surface/30 dark:text-surface/60`}
              >
                <span>{level.label}</span>
                <span className="text-xs font-normal">Coming soon</span>
              </li>
            );
          }

          const selected = level.id === selectedId;
          const classes = [
            BASE,
            "transition-colors hover:bg-primary/5 dark:hover:bg-surface/10",
            selected
              ? "border-primary bg-primary/5 dark:border-surface dark:bg-surface/10"
              : "border-primary/40 dark:border-surface/40",
          ].join(" ");

          return (
            <li key={level.id}>
              <Link
                to={getHref(level.id)}
                aria-current={selected ? "true" : undefined}
                className={classes}
              >
                {level.label}
                {selected ? (
                  <span
                    aria-hidden="true"
                    data-testid="selected-indicator"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-surface dark:bg-surface dark:text-primary"
                  >
                    ✓
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
