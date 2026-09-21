import type { ExerciseResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";
import { useState, type FormEvent } from "react";

import { ExerciseChoiceGroup } from "./exercise-choice-group.js";
import type { ExerciseViewProps } from "./exercise-view-types.js";

type MultipleChoice = Extract<ExerciseResponse, { type: "multiple-choice" }>;

/**
 * Multiple choice: the student picks one option and submits. What is submitted is
 * the option's *id*, so the wording of an option can change without breaking
 * anything. The view never learns which option is right — the API does not send
 * it before an answer — so there is nothing here to reveal, and correctness is the
 * server's verdict alone.
 */
export function MultipleChoiceExerciseView({
  exercise,
  disabled,
  autoFocus,
  onSubmit,
}: ExerciseViewProps<MultipleChoice>) {
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (choice === null) {
      setError("Choose an answer.");
      return;
    }
    onSubmit(choice);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <ExerciseChoiceGroup
        legend={exercise.prompt}
        legendLang={exercise.instructionLanguage}
        options={exercise.options.map((option) => ({ id: option.id, label: option.text }))}
        value={choice}
        onChange={(id) => {
          setChoice(id);
          setError(undefined);
        }}
        disabled={disabled}
        autoFocus={autoFocus}
        error={error}
      />
      <Button type="submit" className="mt-4" disabled={disabled}>
        Check answer
      </Button>
    </form>
  );
}
