import type { AchievementResponse } from "@tfm-bic/contracts";

/**
 * How each icon id is drawn. The API sends a symbolic id, never a path or markup, so the browser
 * can only ever show one of these glyphs; the record is keyed by the contract's own type, so a
 * new icon id cannot be added without one.
 */
const GLYPHS: Record<AchievementResponse["iconId"], string> = {
  spark: "✨",
  book: "📖",
  target: "🎯",
  star: "⭐",
};

/**
 * The picture beside an achievement. It is decoration only — the title says everything — so it
 * is hidden from assistive technology; a locked achievement is dimmed and grey, but the word
 * "Locked" next to it is what carries the state.
 */
export function AchievementIcon({
  iconId,
  unlocked = true,
}: {
  iconId: AchievementResponse["iconId"];
  unlocked?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      data-testid="achievement-icon"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl dark:bg-surface/10 ${
        unlocked ? "" : "opacity-50 grayscale"
      }`}
    >
      {GLYPHS[iconId]}
    </span>
  );
}
