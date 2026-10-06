import type { CoachPracticeResponse } from "@tfm-bic/contracts";
import { useState } from "react";

/**
 * A practice activity the coach generated, rendered as plain text in fixed components (M23,
 * ADR-034).
 *
 * Nothing here is markup from the model: every string is a text node, there is no
 * `dangerouslySetInnerHTML` anywhere in this app (`no-raw-html.test.ts` enforces that), and the
 * server has already validated the shape — counts, lengths and that each `answerIndex` names an
 * option that exists.
 *
 * It is **not** an exercise: answering here records nothing, scores nothing and earns no points,
 * and the component says so. The authoritative flow is still M7's exercise page.
 */
export function CoachPractice({ practice }: { practice: CoachPracticeResponse }) {
  // One revealed answer per item, by index. Local to this activity: it is never reported anywhere.
  const [revealed, setRevealed] = useState<readonly number[]>([]);
  const [chosen, setChosen] = useState<Readonly<Record<number, number>>>({});

  return (
    <section
      aria-labelledby="coach-practice-heading"
      className="mt-3 rounded-lg border border-primary/20 bg-surface p-4 dark:border-surface/20 dark:bg-surface-dark"
    >
      <h3 id="coach-practice-heading" className="text-base font-semibold">
        {practice.title}
      </h3>
      <p className="mt-1 text-sm opacity-80">
        Practice from your AI Coach. Nothing here is saved or scored — your lesson results are
        unaffected.
      </p>

      <ol className="mt-4 space-y-5">
        {practice.items.map((item, itemIndex) => {
          const isRevealed = revealed.includes(itemIndex);
          const pick = chosen[itemIndex];
          const groupName = `coach-practice-${String(itemIndex)}`;
          return (
            <li key={itemIndex}>
              <fieldset>
                <legend className="font-medium">{item.prompt}</legend>
                <div className="mt-2 space-y-2">
                  {item.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={groupName}
                        value={String(optionIndex)}
                        checked={pick === optionIndex}
                        disabled={isRevealed}
                        onChange={() =>
                          setChosen((current) => ({ ...current, [itemIndex]: optionIndex }))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {isRevealed ? (
                <p className="mt-2 text-sm" role="status">
                  {/* The verdict is said in words, never by colour alone (M6 convention). */}
                  <strong>
                    {pick === item.answerIndex ? "Correct. " : "Not quite. "}
                    {`The answer is "${item.options[item.answerIndex] ?? ""}". `}
                  </strong>
                  {item.explanation}
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-2 rounded border border-primary px-3 py-1 text-sm font-medium text-primary hover:bg-primary/5 dark:border-surface dark:text-surface dark:hover:bg-surface/10"
                  onClick={() => setRevealed((current) => [...current, itemIndex])}
                >
                  Check answer
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
