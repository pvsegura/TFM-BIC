import { useId } from "react";

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface ExerciseChoiceGroupProps {
  /** The question or statement: it names the group, so a screen reader announces it with the options. */
  legend: string;
  legendLang: string;
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (id: string) => void;
  disabled: boolean;
  error: string | undefined;
}

/**
 * A group of mutually exclusive choices, shared by multiple choice and
 * true/false. It is native radio inputs in a fieldset, so keyboard use (Tab into
 * the group, arrow keys to choose) and screen-reader behaviour come from the
 * platform rather than from ARIA written here. The selected option is shown by
 * the radio itself, a heavier border and a check mark, never by colour alone.
 * Option text is rendered as text. It holds no state of its own and knows no
 * answer: it shows what it is given and reports what was chosen.
 */
export function ExerciseChoiceGroup({
  legend,
  legendLang,
  options,
  value,
  onChange,
  disabled,
  error,
}: ExerciseChoiceGroupProps) {
  const name = useId();
  const errorId = `${name}-error`;

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      className="m-0 min-w-0 border-0 p-0"
    >
      <legend lang={legendLang} className="mb-3 text-lg font-medium">
        {legend}
      </legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-primary/30 px-4 py-3 has-[:checked]:border-2 has-[:checked]:border-accent has-[:checked]:bg-accent/15 has-[:checked]:font-medium has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent dark:border-surface/30"
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={selected}
                onChange={() => {
                  onChange(option.id);
                }}
                className="h-5 w-5 shrink-0 accent-accent"
              />
              <span className="min-w-0 break-words">{option.label}</span>
              {selected ? (
                <span aria-hidden="true" data-testid="selected-indicator" className="ml-auto">
                  ✓
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
