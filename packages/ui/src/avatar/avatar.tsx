import { getAvatarGlyph } from "./avatar-glyphs.js";

export interface AvatarProps {
  /** The catalog id, or `null` for "no avatar chosen yet". */
  avatarId: string | null;
  /** Accessible name, e.g. the avatar's catalog label. */
  label?: string;
  size?: "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  md: "h-12 w-12 text-2xl",
  lg: "h-20 w-20 text-5xl",
};

/**
 * Display-only avatar: a circle showing the glyph for a catalog id. The glyph
 * is decorative text rendered by React (escaped, never HTML); the accessible
 * name comes from `label`.
 */
export function Avatar({ avatarId, label, size = "md", className }: AvatarProps) {
  const classes = [
    "inline-flex shrink-0 select-none items-center justify-center rounded-full",
    "bg-primary/10 dark:bg-surface/10",
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span role="img" aria-label={label ?? "No avatar selected"} className={classes}>
      <span aria-hidden="true">{getAvatarGlyph(avatarId)}</span>
    </span>
  );
}
