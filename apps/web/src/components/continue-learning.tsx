import { Link } from "./app-link.js";

import { useLanguageLevels, useLanguages } from "../hooks/use-catalog.js";
import { useLessons } from "../hooks/use-lessons.js";
import { useMediaIndex } from "../hooks/use-media.js";
import { formatDuration } from "./format-duration.js";

const enc = encodeURIComponent;

/**
 * "Continue learning" on the dashboard (M21): the next lesson to open — the first one in progress,
 * else the first not started — with its video when it has one, so the dashboard leads into the
 * learning flow (watch → understand → practise) instead of ending at a points total. The profile
 * has no language preference, so it uses the catalog's first language and its first available
 * level, like the video library; nothing here names a language.
 */
export function ContinueLearning() {
  const languages = useLanguages();
  // One card per language the catalog offers (M22: more than one language).
  return (
    <div className="grid gap-4">
      {(languages.data?.languages ?? []).map((language) => (
        <ContinueLanguage
          key={language.code}
          languageCode={language.code}
          languageName={language.name}
        />
      ))}
    </div>
  );
}

function ContinueLanguage({
  languageCode,
  languageName,
}: {
  languageCode: string;
  languageName: string;
}) {
  const levels = useLanguageLevels(languageCode);
  const levelId = levels.data?.levels.find((l) => l.status === "available")?.id;
  const lessonsQuery = useLessons(languageCode, levelId);
  const media = useMediaIndex();

  if (!lessonsQuery.isSuccess) return null;
  const lessons = [...lessonsQuery.data.lessons].sort((a, b) => a.order - b.order);
  const next =
    lessons.find((l) => l.progress.status === "in_progress") ??
    lessons.find((l) => l.progress.status === "not_started");
  const done = lessons.filter((l) => l.progress.status === "completed").length;

  if (!next) {
    return (
      <div className="rounded-xl border border-primary/15 p-5 dark:border-surface/15">
        <h2 className="text-lg font-semibold">You've completed every lesson here</h2>
        <p className="mt-1 text-sm text-primary/75 dark:text-surface/75">
          Keep the words fresh with their videos, or review a lesson.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-5 text-sm">
          <Link to="/learn/vocabulary/mine" className="underline underline-offset-2">
            Review your words
          </Link>
          <Link to="/learn/videos" className="underline underline-offset-2">
            Watch the videos
          </Link>
        </p>
      </div>
    );
  }

  const entry = media.data?.get(`lesson:${next.id}`);
  const verb = next.progress.status === "in_progress" ? "Continue" : "Start";
  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 dark:border-surface/15 sm:grid sm:grid-cols-[minmax(0,16rem)_1fr]">
      <div className="relative aspect-video bg-paper-shade sm:aspect-auto dark:bg-night-paper">
        {entry?.posterUrl ? (
          <img src={entry.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-primary/60 dark:text-surface/60">
            Video coming soon
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-accent-ink dark:text-accent">
          {languageName} · {verb} learning · {done} of {lessons.length} lessons done
        </p>
        <h2 className="mt-1 text-xl font-semibold">{next.title}</h2>
        <p className="mt-1 text-sm text-primary/75 dark:text-surface/75">{next.description}</p>
        <Link
          to={`/learn/lessons/${enc(next.id)}`}
          className="mt-4 inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-primary hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {entry?.hasVideo
            ? `${verb}: watch the video (${formatDuration(entry.durationSeconds ?? 0)})`
            : `${verb} the lesson`}
        </Link>
      </div>
    </div>
  );
}
