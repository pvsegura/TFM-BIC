import type { ExerciseResponse } from "@verbysia/contracts";
import { Button } from "@verbysia/ui";
import { useId, useState, type FormEvent } from "react";

import type { ExerciseViewProps } from "./exercise-view-types.js";
import { m } from "../i18n/index.js";

/**
 * Views for the exercise types shared with the printed workbooks: ordering, matching, gap-fill and
 * open writing. Every control is a native button, select, input or textarea with a visible or
 * accessible label, so they work with a keyboard and a screen reader; nothing relies on dragging.
 */

type Of<T extends ExerciseResponse["type"]> = Extract<ExerciseResponse, { type: T }>;

const t = m.learn.exercises;
const FIELD =
  "rounded-md border border-primary/30 bg-surface px-2 py-1.5 dark:border-surface/30 dark:bg-night-paper";

function Prompt({ exercise }: { exercise: ExerciseResponse }) {
  return (
    <p lang={exercise.instructionLanguage} className="font-medium">
      {exercise.prompt}
    </p>
  );
}

function ErrorText({ message }: { message: string | undefined }) {
  return message ? (
    <p role="alert" className="mt-2 text-sm text-danger">
      {message}
    </p>
  ) : null;
}

export function OrderingExerciseView({
  exercise,
  language,
  disabled,
  onSubmit,
}: ExerciseViewProps<Of<"ordering">>) {
  const [items, setItems] = useState<string[]>([...exercise.items]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target] ?? "", next[index] ?? ""];
    setItems(next);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(items);
      }}
    >
      <Prompt exercise={exercise} />
      <p lang={exercise.instructionLanguage} className="mt-1 text-sm opacity-80">
        {t.ordering.hint}
      </p>
      <ol className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <li
            key={item}
            className="flex items-center gap-2 rounded-md border border-primary/20 px-3 py-2 dark:border-surface/20"
          >
            <span className="w-6 text-sm tabular-nums opacity-70">{index + 1}.</span>
            <span className="flex-1" lang={language?.locale} dir={language?.direction ?? "auto"}>
              {item}
            </span>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-md border border-primary/30 disabled:opacity-40 dark:border-surface/30"
              aria-label={t.ordering.moveUp(item)}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-md border border-primary/30 disabled:opacity-40 dark:border-surface/30"
              aria-label={t.ordering.moveDown(item)}
              disabled={disabled || index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <Button type="submit" className="mt-4" disabled={disabled}>
        {t.check}
      </Button>
    </form>
  );
}

export function MatchingExerciseView({
  exercise,
  language,
  disabled,
  onSubmit,
}: ExerciseViewProps<Of<"matching">>) {
  const [choices, setChoices] = useState<string[]>(exercise.left.map(() => ""));
  const [error, setError] = useState<string | undefined>(undefined);
  const id = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (choices.some((choice) => choice === "")) {
      setError(t.matching.completeAll);
      return;
    }
    onSubmit(choices);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Prompt exercise={exercise} />
      <ul className="mt-3 grid gap-2">
        {exercise.left.map((left, index) => (
          <li key={left} className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`${id}-${String(index)}`}
              className="min-w-32 font-medium"
              lang={language?.locale}
            >
              {left}
            </label>
            <select
              id={`${id}-${String(index)}`}
              className={FIELD}
              value={choices[index]}
              disabled={disabled}
              onChange={(event) => {
                const next = [...choices];
                next[index] = event.target.value;
                setChoices(next);
                setError(undefined);
              }}
            >
              <option value="">{t.matching.choose}</option>
              {exercise.right.map((right) => (
                <option key={right} value={right}>
                  {right}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <ErrorText message={error} />
      <Button type="submit" className="mt-4" disabled={disabled}>
        {t.check}
      </Button>
    </form>
  );
}

export function GapFillExerciseView({
  exercise,
  language,
  disabled,
  onSubmit,
}: ExerciseViewProps<Of<"gap-fill">>) {
  const gaps = Math.max(exercise.segments.length - 1, 0);
  const [values, setValues] = useState<string[]>(Array.from({ length: gaps }, () => ""));
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (values.some((value) => value.trim() === "")) {
      setError(t.gapFill.fillAll);
      return;
    }
    onSubmit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Prompt exercise={exercise} />
      <p className="mt-3 leading-loose" lang={language?.locale} dir={language?.direction ?? "auto"}>
        {exercise.segments.map((segment, index) => (
          <span key={String(index)}>
            {segment}
            {index < gaps ? (
              <input
                type="text"
                aria-label={t.gapFill.gap(String(index + 1))}
                className={`${FIELD} mx-1 w-32`}
                value={values[index]}
                disabled={disabled}
                maxLength={100}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.target.value;
                  setValues(next);
                  setError(undefined);
                }}
              />
            ) : null}
          </span>
        ))}
      </p>
      <ErrorText message={error} />
      <Button type="submit" className="mt-4" disabled={disabled}>
        {t.check}
      </Button>
    </form>
  );
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function OpenWritingExerciseView({
  exercise,
  language,
  disabled,
  onSubmit,
}: ExerciseViewProps<Of<"open-writing">>) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const id = useId();
  const words = wordCount(value);
  const { minWords, maxWords } = exercise;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (words < minWords || words > maxWords) {
      setError(t.openWriting.tooShort(String(minWords), String(maxWords)));
      return;
    }
    onSubmit(value);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Prompt exercise={exercise} />
      <p lang={exercise.instructionLanguage} className="mt-3 text-sm font-semibold">
        {t.openWriting.checklist}
      </p>
      <ul lang={exercise.instructionLanguage} className="mt-1 list-disc pl-6 text-sm">
        {exercise.checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <label htmlFor={id} className="mt-3 block text-sm font-semibold">
        {t.openWriting.label}
      </label>
      <textarea
        id={id}
        rows={6}
        className={`${FIELD} mt-1 w-full`}
        value={value}
        disabled={disabled}
        maxLength={1500}
        lang={language?.locale}
        dir={language?.direction ?? "auto"}
        aria-describedby={`${id}-count`}
        onChange={(event) => {
          setValue(event.target.value);
          setError(undefined);
        }}
      />
      <p id={`${id}-count`} className="mt-1 text-xs opacity-70">
        {t.openWriting.words(String(words), String(minWords), String(maxWords))}
      </p>
      <ErrorText message={error} />
      <Button type="submit" className="mt-4" disabled={disabled}>
        {t.check}
      </Button>
    </form>
  );
}
