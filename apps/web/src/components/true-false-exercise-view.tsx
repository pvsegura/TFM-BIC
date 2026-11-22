import type { ExerciseResponse } from "@verbysia/contracts";
import { Button } from "@verbysia/ui";
import { useState, type FormEvent } from "react";

import { ExerciseChoiceGroup } from "./exercise-choice-group.js";
import type { ExerciseViewProps } from "./exercise-view-types.js";
import { m } from "../i18n/index.js";

type TrueFalse = Extract<ExerciseResponse, { type: "true-false" }>;

const CHOICES = [
  { id: "true", label: m.learn.exercises.trueLabel },
  { id: "false", label: m.learn.exercises.falseLabel },
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
      setError(m.learn.exercises.chooseAnswer);
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
        {m.learn.exercises.check}
      </Button>
    </form>
  );
}
