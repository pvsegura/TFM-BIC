import { MAX_TEXT_ANSWER_LENGTH, type ExerciseResponse } from "@tfm-bic/contracts";
import { Button, TextField } from "@tfm-bic/ui";
import { useState, type FormEvent } from "react";

import type { ExerciseViewProps } from "./exercise-view-types.js";

type TextAnswer = Extract<ExerciseResponse, { type: "text-answer" }>;

/**
 * Text answer: a labelled text box. The prompt is the label (written in the
 * instruction language) and the box itself is tagged with the language being
 * learned, so the right keyboard, hyphenation and reading direction apply.
 *
 * Autocorrect, autocapitalisation and spellcheck are switched off on purpose: on
 * a phone they would rewrite a word the student is trying to spell in a language
 * their device does not know, and the answer judged would no longer be theirs.
 * The text is submitted exactly as typed — diacritics intact, nothing trimmed or
 * lower-cased here; how it is compared is the server's rule and is the same for
 * everyone. Only an empty answer is stopped, with a message, since it would not be
 * an answer at all.
 */
export function TextAnswerExerciseView({
  exercise,
  language,
  disabled,
  autoFocus,
  onSubmit,
}: ExerciseViewProps<TextAnswer>) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim().length === 0) {
      setError("Enter an answer.");
      return;
    }
    onSubmit(value);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div lang={exercise.instructionLanguage}>
        <TextField
          label={exercise.prompt}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(undefined);
          }}
          error={error}
          disabled={disabled}
          autoFocus={autoFocus}
          lang={language?.locale}
          dir={language?.direction ?? "auto"}
          maxLength={MAX_TEXT_ANSWER_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
      <Button type="submit" className="mt-4" disabled={disabled}>
        Check answer
      </Button>
    </form>
  );
}
