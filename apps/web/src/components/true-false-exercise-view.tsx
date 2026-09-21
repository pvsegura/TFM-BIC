import type { ExerciseResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";
import { useState, type FormEvent } from "react";

import { ExerciseChoiceGroup } from "./exercise-choice-group.js";
import type { ExerciseViewProps } from "./exercise-view-types.js";

type TrueFalse = Extract<ExerciseResponse, { type: "true-false" }>;

const CHOICES = [
  { id: "true", label: "True" },
  { id: "false", label: "False" },
] as const;

/**
 * True/false: the statement is the prompt, and the student says whether it is
 * true. The choices are labelled in words ("True", "False") and marked with a
 * check when selected — never by colour alone. The submitted answer is a real
 * boolean. Like every view it is never told the answer.
 */
export function TrueFalseExerciseView({
  exercise,
  disabled,
  onSubmit,
}: ExerciseViewProps<TrueFalse>) {
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (choice === null) {
      setError("Choose an answer.");
      return;
    }
    onSubmit(choice === "true");
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <ExerciseChoiceGroup
        legend={exercise.prompt}
        legendLang={exercise.instructionLanguage}
        options={CHOICES}
        value={choice}
        onChange={(id) => {
          setChoice(id);
          setError(undefined);
        }}
        disabled={disabled}
        error={error}
      />
      <Button type="submit" className="mt-4" disabled={disabled}>
        Check answer
      </Button>
    </form>
  );
}
