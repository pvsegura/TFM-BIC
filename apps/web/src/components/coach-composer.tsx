import { useId, useRef, useState } from "react";

import type { CoachMode } from "../services/coach-api.js";

/**
 * The mode picker and the message box (M23, ADR-034).
 *
 * Modes are a small explicit set rather than a hidden prompt: a learner can see that "Practice" and
 * "Conversation" are different kinds of help, and the backend gives each mode its own instructions
 * and its own tools. The labels are the product's words; the values are the domain's.
 */
const MODE_LABELS: { value: CoachMode; label: string; hint: string }[] = [
  { value: "explain", label: "Explain", hint: "Ask about a mistake, a word or a rule" },
  { value: "practice", label: "Practise", hint: "Get a short activity from your own weak points" },
  { value: "conversation", label: "Conversation", hint: "Talk in the language you are learning" },
  { value: "pronunciation", label: "Pronunciation", hint: "How a sound or word is said" },
];

export function CoachComposer({
  mode,
  onModeChange,
  onSend,
  isSending,
  maxLength,
  disabled,
}: {
  mode: CoachMode;
  onModeChange: (mode: CoachMode) => void;
  onSend: (message: string) => void;
  isSending: boolean;
  maxLength: number;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const inputId = useId();
  const counterId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed === "" || isSending || disabled) return;
    setText("");
    onSend(trimmed);
    // Focus stays in the box so a conversation can be typed without reaching for the mouse.
    textareaRef.current?.focus();
  };

  const remaining = maxLength - [...text].length;

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset className="mb-3" disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold">What kind of help?</legend>
        <div className="flex flex-wrap gap-2">
          {MODE_LABELS.map((option) => (
            <label
              key={option.value}
              // A 44px minimum touch target: these are tapped on a phone.
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                mode === option.value
                  ? "border-accent bg-accent text-primary"
                  : "border-primary/30 hover:bg-primary/5 dark:border-surface/30 dark:hover:bg-surface/10"
              }`}
              title={option.hint}
            >
              <input
                type="radio"
                name="coach-mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => onModeChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={inputId} className="block text-sm font-semibold">
        Your message
      </label>
      <textarea
        id={inputId}
        ref={textareaRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter makes a new line — the convention a chat box is expected to
          // follow. On a phone the on-screen keyboard's return key inserts a newline instead,
          // which is why the Send button is always visible.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={3}
        maxLength={maxLength}
        disabled={disabled || isSending}
        aria-describedby={counterId}
        placeholder="e.g. Why was my answer wrong?"
        className="mt-1 w-full rounded-lg border border-primary/30 bg-surface p-3 dark:border-surface/30 dark:bg-surface-dark"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p id={counterId} className="text-xs opacity-70">
          {remaining < 100
            ? `${String(remaining)} characters left`
            : "Enter sends, Shift+Enter adds a line"}
        </p>
        <button
          type="submit"
          // One request in flight at a time: the handler also refuses, because a disabled button
          // alone is not enough (M6/M7 convention).
          disabled={disabled || isSending || text.trim() === ""}
          className="min-h-11 rounded-lg bg-accent px-5 py-2 font-medium text-primary hover:opacity-90 disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
