import { useId } from "react";

import { getAvatarGlyph } from "../avatar/avatar-glyphs.js";

export interface AvatarOption {
  id: string;
  label: string;
}

export interface AvatarPickerProps {
  legend: string;
  /** The avatars to offer — passed in by the caller (from the shared avatar
   * catalog), never defined in this component. */
  avatars: readonly AvatarOption[];
  /** The selected avatar id, or `null` when none is selected yet. */
  value: string | null;
  onChange: (avatarId: string) => void;
  disabled?: boolean;
  /** Validation message — also announced via `role="alert"`. */
  error?: string | undefined;
}

/**
 * Presentation-only avatar chooser. Built on native radio inputs inside a
 * `<fieldset>`, so keyboard behaviour (Tab into the group, arrow keys to move
 * the selection, Space to select) and screen-reader semantics (a labelled
 * group of radios) come from the platform rather than hand-rolled ARIA. The
 * selected avatar is shown with a thicker border *and* a check mark, so
 * selection is never conveyed by colour alone.
 */
export function AvatarPicker({
  legend,
  avatars,
  value,
  onChange,
  disabled = false,
  error,
}: AvatarPickerProps) {
  const groupName = useId();
  const errorId = `${groupName}-error`;

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      className="min-w-0 border-0 p-0"
    >
      <legend className="text-sm font-medium text-primary dark:text-surface">{legend}</legend>

      <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {avatars.map((avatar) => {
          const selected = avatar.id === value;
          const tileClasses = [
            "relative flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl",
            "bg-primary/5 transition-colors dark:bg-surface/5",
            selected
              ? "border-primary ring-2 ring-primary dark:border-surface dark:ring-surface"
              : "border-primary/20 group-hover:border-primary/50 dark:border-surface/20 dark:group-hover:border-surface/50",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            "peer-disabled:opacity-50",
          ].join(" ");

          return (
            <label
              key={avatar.id}
              className="group flex cursor-pointer flex-col items-center gap-1 text-center text-sm has-[:disabled]:cursor-not-allowed"
            >
              <input
                type="radio"
                name={groupName}
                value={avatar.id}
                checked={selected}
                onChange={() => onChange(avatar.id)}
                className="peer sr-only"
              />
              <span className={tileClasses}>
                <span aria-hidden="true">{getAvatarGlyph(avatar.id)}</span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    data-testid="avatar-selected-indicator"
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface dark:bg-surface dark:text-primary"
                  >
                    ✓
                  </span>
                ) : null}
              </span>
              <span>{avatar.label}</span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
