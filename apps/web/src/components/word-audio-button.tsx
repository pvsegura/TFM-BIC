import { useRef, useState } from "react";

/**
 * A small play button for a word's recorded pronunciation (M22: words get audio, not video). Plays
 * the stored clip on click only — nothing is preloaded or played automatically; the clip's file is
 * fetched on the first press. Shows nothing when no clip is published.
 */
export function WordAudioButton({
  url,
  word,
  lang,
}: {
  url: string | null | undefined;
  word: string;
  lang: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!url) return null;

  const play = (event: React.MouseEvent) => {
    // Inside a card link, play the word without following the link.
    event.preventDefault();
    event.stopPropagation();
    setFailed(false);
    audioRef.current ??= new Audio(url);
    const audio = audioRef.current;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      setPlaying(false);
      setFailed(true);
    };
    audio.currentTime = 0;
    setPlaying(true);
    audio.play().catch(() => {
      setPlaying(false);
      setFailed(true);
    });
  };

  return (
    <button
      type="button"
      onClick={play}
      aria-label={
        failed ? `Could not play “${word}”. Try again` : `Play the pronunciation of ${word}`
      }
      title={failed ? "Could not play — try again" : "Play the pronunciation"}
      className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        playing
          ? "border-accent bg-accent text-primary"
          : "border-primary/30 hover:border-accent dark:border-surface/30"
      }`}
    >
      <span lang={lang} className="sr-only">
        {word}
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
