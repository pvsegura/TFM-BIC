import { Button } from "@tfm-bic/ui";
import { useEffect, useId, useRef, useState } from "react";

import { useVocabularyAudio } from "../hooks/use-audio-generation.js";
import { ApiError } from "../services/api-error.js";
import type { VocabularyAudioRequest } from "../services/audio-generations-api.js";

export interface VocabularyAudioPlayerProps {
  vocabularyId: string;
  hasExample: boolean;
}

type Part = VocabularyAudioRequest["part"];
type Voice = VocabularyAudioRequest["voice"];

const PART_LABELS: Record<Part, string> = { lemma: "the word", example: "the example" };
const VOICE_OPTIONS: { value: Voice; label: string; description: string }[] = [
  { value: "standard", label: "Normal speed", description: "normal speed" },
  { value: "slow", label: "Slow", description: "slow" },
];

interface Clip {
  url: string;
  label: string;
}

/**
 * "Listen" for a vocabulary entry (M12): the student picks a speed and which text to hear; the
 * server generates (or reuses) the clip and the native `<audio>` element plays it — keyboard
 * operable, with its own controls. Loading and failure are stated in words in live regions. Each
 * clip's object URL is released as soon as it is replaced or the component unmounts.
 */
export function VocabularyAudioPlayer({ vocabularyId, hasExample }: VocabularyAudioPlayerProps) {
  const mutation = useVocabularyAudio();
  const [voice, setVoice] = useState<Voice>("standard");
  const [clip, setClip] = useState<Clip | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const radioName = useId();

  useEffect(() => {
    if (!clip) return undefined;
    // The student just asked to listen, so starting playback is expected; a browser that still
    // refuses leaves the controls for them to press play.
    audioRef.current?.play().catch(() => undefined);
    return () => URL.revokeObjectURL(clip.url);
  }, [clip]);

  const listen = (part: Part) => {
    const request = { vocabularyItemId: vocabularyId, part, voice };
    const description = VOICE_OPTIONS.find((o) => o.value === voice)?.description ?? voice;
    mutation.mutate(request, {
      onSuccess: (blob) => {
        setClip({
          url: URL.createObjectURL(blob),
          label: `Audio: ${PART_LABELS[part]} (${description})`,
        });
      },
    });
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : "We couldn't generate audio. Please try again.";

  return (
    <fieldset className="rounded-md border border-primary/20 p-4 dark:border-surface/20">
      <legend className="px-1 text-sm font-medium">Listen</legend>

      <div className="flex flex-wrap items-center gap-4">
        {VOICE_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={radioName}
              value={option.value}
              checked={voice === option.value}
              onChange={() => setVoice(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={mutation.isPending} onClick={() => listen("lemma")}>
          Listen to the word
        </Button>
        {hasExample ? (
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => listen("example")}
          >
            Listen to the example
          </Button>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {mutation.isPending ? "Generating audio…" : null}
      </p>
      {mutation.isError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}

      {clip && !mutation.isError ? (
        // No captions track: the clip speaks a single word or sentence that is already shown as
        // text on the page itself.
        <audio
          ref={audioRef}
          key={clip.url}
          src={clip.url}
          controls
          aria-label={clip.label}
          className="mt-3 w-full"
        />
      ) : null}
    </fieldset>
  );
}
