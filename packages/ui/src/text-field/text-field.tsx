import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation error message — also announced via `role="alert"`. Typed
   * as `string | undefined` (not just an optional `string`) so callers
   * passing React Hook Form's `errors.field?.message` directly — which is
   * `string | undefined`, not an omittable property — type-check under
   * `exactOptionalPropertyTypes`. */
  error?: string | undefined;
}

/**
 * Reusable, presentation-only labeled input primitive (used by every M3
 * auth form) — no business logic, no validation rules of its own. See
 * .claude/skills/project-architecture for the "packages/ui is primitives
 * only" rule.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const inputClasses = [
    "rounded-md border px-3 py-2 text-sm bg-surface text-primary dark:bg-surface-dark dark:text-surface",
    error ? "border-red-500 dark:border-red-400" : "border-primary/20 dark:border-surface/20",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-primary dark:text-surface">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClasses}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
});
