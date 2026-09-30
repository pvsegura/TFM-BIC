import type { ContentSummaryResponse } from "@tfm-bic/contracts";
import { useQueries } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";

import { formatDuration } from "../components/format-duration.js";
import { useLanguageLevels, useLanguages } from "../hooks/use-catalog.js";
import { useMediaIndex } from "../hooks/use-media.js";
import { useVocabulary } from "../hooks/use-vocabulary.js";
import { fetchContentList } from "../services/catalog-api.js";

const enc = encodeURIComponent;

function contentHref(item: ContentSummaryResponse): string {
  // Lessons open in the lesson player (progress, practice); explanations in the reading view.
  return item.type === "lesson"
    ? `/learn/lessons/${enc(item.id)}`
    : `/learn/${enc(item.languageId)}/${enc(item.levelId)}/${enc(item.id)}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-10 w-10 drop-shadow">
      <circle cx="12" cy="12" r="11" className="fill-accent" />
      <path d="M9.5 7.5v9l7-4.5z" className="fill-primary" />
    </svg>
  );
}

/**
 * The video library (M21): every lesson and every word of a language, with its explainer video
 * when one is published and an honest "Video coming soon" when not — content without a video is
 * listed, not hidden. Posters load lazily; no video element is created here, so opening the page
 * downloads no video at all. Replaces M11's render demo as the "Videos" destination; that demo
 * now lives, unlinked, at /learn/videos/render-demo.
 */
export function VideosPage() {
  const [searchParams] = useSearchParams();
  const languagesQuery = useLanguages();
  // The catalog API lists active languages only.
  const languages = languagesQuery.data?.languages ?? [];
  const languageCode = searchParams.get("language") ?? languages[0]?.code;
  const language = languages.find((l) => l.code === languageCode);

  const levelsQuery = useLanguageLevels(languageCode);
  const levels = (levelsQuery.data?.levels ?? []).filter((l) => l.status === "available");
  const contentQueries = useQueries({
    queries: levels.map((level) => ({
      queryKey: ["catalog", "content", languageCode, level.id],
      queryFn: () => fetchContentList(languageCode ?? "", level.id),
      staleTime: 10 * 60_000,
    })),
  });
  const lessons = contentQueries
    .flatMap((q) => q.data?.items ?? [])
    .sort((a, b) => a.levelId.localeCompare(b.levelId) || a.order - b.order);

  const wordsQuery = useVocabulary(languageCode, { limit: 50 });
  const words = wordsQuery.data?.items ?? [];
  const media = useMediaIndex();
  const mediaFor = (type: "lesson" | "vocabulary-item", id: string) =>
    media.data?.get(`${type}:${id}`);

  const loading =
    languagesQuery.isPending || levelsQuery.isPending || contentQueries.some((q) => q.isPending);
  const withVideo =
    lessons.filter((l) => mediaFor("lesson", l.id)?.hasVideo).length +
    words.filter((w) => mediaFor("vocabulary-item", w.id)?.hasVideo).length;

  const categories = new Map<string, { title: string; items: typeof words }>();
  for (const word of words) {
    const group = categories.get(word.category.id) ?? { title: word.category.title, items: [] };
    group.items.push(word);
    categories.set(word.category.id, group);
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Videos</h1>
      <p className="mt-2 max-w-2xl text-primary/75 dark:text-surface/75">
        Short explainer videos made from the course itself{language ? ` — ${language.name}` : ""}.
        Watch one, then practise what it explains.
      </p>
      {media.isSuccess && !loading ? (
        <p className="mt-1 text-sm text-primary/65 dark:text-surface/65">
          {withVideo} of {lessons.length + words.length} lessons and words have a video so far.
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="mt-6">
          Loading videos…
        </p>
      ) : null}

      <section aria-labelledby="videos-lessons" className="mt-8">
        <h2 id="videos-lessons" className="text-xl font-semibold">
          Lessons
        </h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => {
            const entry = mediaFor("lesson", lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  to={contentHref(lesson)}
                  className="group block h-full overflow-hidden rounded-xl border border-primary/15 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-surface/15"
                >
                  <div className="relative aspect-video bg-paper-shade dark:bg-night-paper">
                    {entry?.posterUrl ? (
                      <>
                        <img
                          src={entry.posterUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 grid place-items-center opacity-90 transition-opacity group-hover:opacity-100">
                          <PlayIcon />
                        </span>
                      </>
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-sm text-primary/60 dark:text-surface/60">
                        Video coming soon
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-wide text-primary/65 dark:text-surface/65">
                      {lesson.levelId.toUpperCase()} ·{" "}
                      {lesson.type === "lesson" ? "Lesson" : "Explanation"}
                      {entry?.durationSeconds ? ` · ${formatDuration(entry.durationSeconds)}` : ""}
                    </p>
                    <p className="mt-0.5 font-semibold" lang={lesson.instructionLanguage}>
                      {lesson.title}
                    </p>
                    {entry?.narrator ? (
                      <p className="text-xs text-primary/65 dark:text-surface/65">
                        Narrated by {entry.narrator}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="videos-words" className="mt-10">
        <h2 id="videos-words" className="text-xl font-semibold">
          Words
        </h2>
        {[...categories.entries()].map(([id, group]) => (
          <div key={id} className="mt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-accent-ink dark:text-accent">
              {group.title}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {group.items.map((word) => {
                const entry = mediaFor("vocabulary-item", word.id);
                return (
                  <li key={word.id}>
                    <Link
                      to={`/learn/vocabulary/${enc(word.id)}`}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:border-accent ${
                        entry?.hasVideo
                          ? "border-primary/25 dark:border-surface/25"
                          : "border-dashed border-primary/25 text-primary/70 dark:border-surface/25 dark:text-surface/70"
                      }`}
                    >
                      {entry?.hasVideo ? (
                        <svg
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                          className="h-2.5 w-2.5 fill-accent"
                        >
                          <path d="M2 1.5v9l8-4.5z" />
                        </svg>
                      ) : null}
                      <span lang={word.languageId} className="font-medium">
                        {word.lemma}
                      </span>
                      <span className="text-primary/60 dark:text-surface/60">
                        {word.translation}
                      </span>
                      <span className="sr-only">
                        {entry?.hasVideo ? "(video available)" : "(video coming soon)"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
