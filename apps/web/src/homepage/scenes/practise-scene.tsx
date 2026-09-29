import { useId, useState, type FormEvent } from "react";

import { fillTemplate, type HomepageContent } from "../content/homepage-content.js";
import { ScrollScene } from "../motion/scroll-scene.js";
import { SceneIntro } from "./scene-parts.js";

type Verdict = { correct: true } | { correct: false; chosenText: string; chosenMeaning: string };

/**
 * Scene 05: a real A1 exercise to try in place — a representation of the product, not the exercise
 * system. The answer is checked locally against the example's key; nothing is sent, stored or
 * rewarded. As in the real exercise page, the verdict is given in words (never colour alone) in a
 * polite live region, with the explanation.
 */
export function PractiseScene({ content }: { content: HomepageContent }) {
  const { practise, chapters, exampleLanguage } = content;
  const name = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  function check(event: FormEvent) {
    event.preventDefault();
    const option = practise.options.find((candidate) => candidate.id === chosen);
    if (option === undefined) return;
    setVerdict(
      option.id === practise.correctOptionId
        ? { correct: true }
        : { correct: false, chosenText: option.text, chosenMeaning: option.meaning },
    );
  }

  return (
    <ScrollScene scene="practise" labelledBy="scene-practise-title">
      <div className="scene__frame scene__frame--split">
        <SceneIntro
          id="scene-practise-title"
          chapter={5}
          chapterName={chapters.practise}
          title={practise.title}
          lead={practise.lead}
        />
        <form className="exercise" onSubmit={check} noValidate>
          <p className="exercise__note">{practise.note}</p>
          <fieldset className="exercise__fieldset">
            <legend className="exercise__prompt">{practise.prompt}</legend>
            <div className="exercise__options">
              {practise.options.map((option, index) => (
                <label
                  key={option.id}
                  className="option"
                  data-verdict={
                    verdict !== null && chosen === option.id
                      ? verdict.correct
                        ? "correct"
                        : "incorrect"
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name={name}
                    value={option.id}
                    checked={chosen === option.id}
                    onChange={() => {
                      setChosen(option.id);
                      setVerdict(null);
                    }}
                    className="option__input"
                  />
                  <span className="option__letter" aria-hidden="true">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="option__text" lang={exampleLanguage}>
                    {option.text}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="cta cta--primary exercise__check"
            disabled={chosen === null}
          >
            {practise.check}
          </button>
          <div
            role="status"
            aria-label={practise.feedbackLabel}
            className="exercise__feedback"
            data-verdict={verdict === null ? undefined : verdict.correct ? "correct" : "incorrect"}
          >
            {verdict === null ? null : (
              <>
                <p className="exercise__verdict">
                  <span aria-hidden="true" className="exercise__mark">
                    {verdict.correct ? "✓" : "✗"}
                  </span>
                  {verdict.correct
                    ? practise.correct
                    : fillTemplate(practise.incorrect, {
                        text: verdict.chosenText,
                        meaning: verdict.chosenMeaning,
                      })}
                </p>
                <p className="exercise__explanation">{practise.explanation}</p>
              </>
            )}
          </div>
        </form>
      </div>
    </ScrollScene>
  );
}
