import type { AudioAssetResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";
import { useId, useRef, useState } from "react";

const LABELS: Record<AudioAssetResponse["purpose"], string> = {
  pronunciation: "Play the word",
  "example-pronunciation": "Play the example",
};

/** Browsers keep the pitch when slowing playback down, so this is the same clip, just slower. */
const SLOW_RATE = 0.7;

/**
 * Pre-recorded pronunciation clips (M21, ADR-031): the very clips the word's video speaks, played
 * on demand. No request generates anything — the files were produced offline — and nothing plays
 * until the learner presses a button. "Slow" changes the playback rate, not the recording.
 */
export function PronunciationPlayer({ clips }: { clips: AudioAssetResponse[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const slowId = useId();

  const play = (clip: AudioAssetResponse) => {
    const audio = audioRef.current;
    if (!audio) return;
    setFailed(false);
    if (audio.getAttribute("src") !== clip.url) audio.src = clip.url;
    audio.playbackRate = slow ? SLOW_RATE : 1;
    audio.currentTime = 0;
    audio.play().catch(() => setFailed(true));
  };

  return (
    <fieldset className="rounded-md border border-primary/20 p-4 dark:border-surface/20">
      <legend className="px-1 text-sm font-medium">Pronunciation</legend>
      <div className="flex flex-wrap items-center gap-2">
        {clips.map((clip) => (
          <Button key={clip.url} variant="secondary" onClick={() => play(clip)}>
            {LABELS[clip.purpose]}
            <span className="sr-only">: {clip.text}</span>
          </Button>
        ))}
        <label htmlFor={slowId} className="ml-2 flex items-center gap-2 text-sm">
          <input
            id={slowId}
            type="checkbox"
            checked={slow}
            onChange={(e) => setSlow(e.target.checked)}
          />
          Slow
        </label>
      </div>
      <p className="mt-2 text-xs text-primary/65 dark:text-surface/65">
        Synthesized voice ({clips[0]?.narrator ?? "narrator"}), generated from the course text.
      </p>
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          The audio could not be played. Please try again.
        </p>
      ) : null}
      {/* One element for all clips: preload nothing until asked. */}
      <audio ref={audioRef} preload="none" onError={() => setFailed(true)} />
    </fieldset>
  );
}
