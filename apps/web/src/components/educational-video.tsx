import type { VideoAssetResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";
import { useId, useState, type ReactNode } from "react";

import { formatDuration } from "./format-duration.js";

export interface EducationalVideoProps {
  /** `null` once loaded means no video is published yet; `undefined` while loading. */
  video: VideoAssetResponse | null | undefined;
  isLoading: boolean;
  loadFailed: boolean;
  onRetryLoad: () => void;
  /** What the video explains, for its accessible name ("Video: Introducing yourself"). */
  title: string;
  /** What "coming soon" is about, e.g. "this lesson" / "this word". */
  subject: string;
  /** Shown once the video has ended — the next step in the learning flow. */
  afterVideo?: ReactNode;
}

const FRAME =
  "relative w-full overflow-hidden rounded-xl border border-primary/15 bg-paper-shade dark:border-surface/15 dark:bg-night-paper";

/**
 * The educational video of a lesson or a word (M21, ADR-031): the browser's own `<video>` controls
 * (play/pause, seek, volume, fullscreen — keyboard operable and familiar), captions on by default
 * (the narration *is* the captions, useful to a learner who wants to see the words), and the full
 * transcript below. Nothing plays until the learner presses play, and only metadata is preloaded.
 *
 * States are honest: loading says so and ends when the request settles; a failed request or a
 * failed file offers a retry; content without a published video says "Video coming soon" instead
 * of showing an empty player.
 */
export function EducationalVideo({
  video,
  isLoading,
  loadFailed,
  onRetryLoad,
  title,
  subject,
  afterVideo,
}: EducationalVideoProps) {
  const [attempt, setAttempt] = useState(0);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const transcriptId = useId();

  if (isLoading) {
    return (
      <div className={`${FRAME} aspect-video`} aria-busy="true">
        <p className="absolute inset-0 grid place-items-center text-sm opacity-70">
          Loading video…
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className={`${FRAME} grid aspect-video place-items-center p-6 text-center`}>
        <div>
          <p role="alert">We couldn't load the video information.</p>
          <Button variant="secondary" className="mt-3" onClick={onRetryLoad}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div
        className={`${FRAME} grid aspect-video place-items-center border-dashed p-6 text-center`}
        data-testid="video-coming-soon"
      >
        <div className="max-w-md">
          <p className="font-display text-xl font-semibold">Video coming soon</p>
          <p className="mt-2 text-sm text-primary/75 dark:text-surface/75">
            The explainer video for {subject} is not published yet. Everything you need is on this
            page below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <figure className="m-0">
      <div
        className={FRAME}
        style={{ aspectRatio: `${String(video.width)} / ${String(video.height)}` }}
      >
        {playbackFailed ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p role="alert">The video could not be played.</p>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  setPlaybackFailed(false);
                  setAttempt((a) => a + 1);
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <video
            key={attempt}
            className="absolute inset-0 h-full w-full"
            controls
            playsInline
            preload="metadata"
            poster={video.posterUrl}
            aria-label={`Video: ${title}`}
            onError={() => setPlaybackFailed(true)}
            onEnded={() => setEnded(true)}
            onPlay={() => setEnded(false)}
          >
            <source src={video.url} type="video/mp4" />
            <track
              kind="captions"
              src={video.captionsUrl}
              srcLang={video.captionsLanguage}
              label="Captions"
              default
            />
          </video>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary/70 dark:text-surface/70">
        <span>{formatDuration(video.durationSeconds)}</span>
        <span aria-hidden="true">·</span>
        <span>Narrated by {video.narrator}</span>
        <span aria-hidden="true">·</span>
        <span>Captions and transcript</span>
      </figcaption>

      {ended && afterVideo ? (
        <div role="status" className="mt-3 rounded-lg bg-accent/10 px-4 py-3">
          {afterVideo}
        </div>
      ) : null}

      <details className="mt-3 rounded-lg border border-primary/15 px-4 py-2 dark:border-surface/15">
        <summary className="cursor-pointer text-sm font-medium">Transcript</summary>
        <ol id={transcriptId} aria-label="Transcript" className="mt-2 space-y-1.5 pb-2 text-sm">
          {video.transcript.map((line, i) => (
            <li key={i}>
              <span lang={line.language} className={line.translation ? "font-semibold" : undefined}>
                {line.text}
              </span>
              {line.translation ? (
                <span className="text-primary/70 dark:text-surface/70"> — {line.translation}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
