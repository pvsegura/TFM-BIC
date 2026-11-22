import { m } from "../../i18n/index.js";
import { Card } from "./public-parts.js";

/** P-U-E-N-T-E: the six phases, spelling the method's name down the first column. */
export function PhasesGrid() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {m.marketing.phases.map((phase) => (
        <li key={phase.name}>
          <Card className="h-full">
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden="true"
                className="font-display text-4xl font-bold text-accent-ink dark:text-accent"
              >
                {phase.letter}
              </span>
              <h3 className="font-display text-lg font-bold">
                <span lang="es">{phase.name}</span>
                <span className="font-normal text-primary/70 dark:text-surface/70">
                  {" "}
                  · {phase.pl}
                </span>
              </h3>
            </div>
            <p className="mt-2 text-primary/80 dark:text-surface/80">{phase.body}</p>
          </Card>
        </li>
      ))}
    </ol>
  );
}
