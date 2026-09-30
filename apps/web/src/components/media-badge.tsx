import { useMediaIndex } from "../hooks/use-media.js";
import { formatDuration } from "./format-duration.js";

/**
 * Says whether a lesson or word has its explainer video (and pronunciation audio) yet (M21). One
 * cached `/media` request serves every card on a page. While that loads, or if it fails, nothing
 * is shown rather than a guess.
 */
export function MediaBadge({
  contentType,
  contentId,
}: {
  contentType: "lesson" | "vocabulary-item";
  contentId: string;
}) {
  const index = useMediaIndex();
  if (!index.isSuccess) return null;
  const entry = index.data.get(`${contentType}:${contentId}`);

  if (!entry?.hasVideo) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-primary/30 px-2 py-0.5 text-xs text-primary/70 dark:border-surface/30 dark:text-surface/70">
        Video coming soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-ink dark:text-accent">
      <svg viewBox="0 0 12 12" aria-hidden="true" className="h-2.5 w-2.5 fill-current">
        <path d="M2 1.5v9l8-4.5z" />
      </svg>
      Video{entry.durationSeconds ? ` ${formatDuration(entry.durationSeconds)}` : ""}
      {entry.hasAudio ? <span className="font-normal">· audio</span> : null}
    </span>
  );
}
