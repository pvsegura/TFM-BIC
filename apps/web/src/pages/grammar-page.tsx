import type { GrammarTopicSummaryResponse } from "@verbysia/contracts";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Link } from "../components/app-link.js";
import { LoadError } from "../components/catalog-notices.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { useGrammarTopics } from "../hooks/use-grammar.js";
import { m } from "../i18n/index.js";

const t = m.study.grammar;

const enc = encodeURIComponent;

/** Shelf names for the reference's categories (the API sends them in display order). */
const CATEGORY_LABELS: Record<GrammarTopicSummaryResponse["category"], string> = t.categories;

/** Accent-insensitive matching, so "conjugacion" finds "conjugación". */
function normalise(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * The grammar reference (M23): quick-lookup topics — conjugations, pronouns, time adverbs, word
 * formation — for each language, grouped by shelf and searchable. Public and read-only: nothing
 * here records progress. Every topic opens on its own page with its tables and examples.
 */
export function GrammarPage() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState("");
  const languagesQuery = useLanguages();
  const languages = languagesQuery.data?.languages ?? [];
  const languageCode = searchParams.get("language") ?? languages[0]?.code;
  const language = languages.find((l) => l.code === languageCode);
  const topicsQuery = useGrammarTopics(languageCode);

  const needle = normalise(filter.trim());
  const topics = (topicsQuery.data?.topics ?? []).filter(
    (topic) => needle === "" || normalise(`${topic.title} ${topic.description}`).includes(needle),
  );
  const shelves = Object.keys(CATEGORY_LABELS) as GrammarTopicSummaryResponse["category"][];

  return (
    <div className="mx-auto max-w-5xl py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
      {languages.length > 1 ? (
        <nav aria-label={t.languageNav} className="mt-3 flex flex-wrap gap-2">
          {languages.map((l) => (
            <Link
              key={l.code}
              to={`/learn/grammar?language=${enc(l.code)}`}
              aria-current={l.code === languageCode ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                l.code === languageCode
                  ? "border-accent bg-accent/15 font-semibold"
                  : "border-primary/25 hover:border-accent dark:border-surface/25"
              }`}
            >
              <span lang={l.code}>{l.name}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      <p className="mt-2 max-w-2xl text-primary/75 dark:text-surface/75">
        {t.intro(language?.name ?? null)}
      </p>

      <label className="mt-5 block max-w-md">
        <span className="text-sm font-medium">{t.search}</span>
        <input
          type="search"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
          }}
          placeholder={t.searchPlaceholder}
          className="mt-1 w-full rounded-md border border-primary/25 bg-surface px-3 py-2 text-sm dark:border-surface/25 dark:bg-night-paper"
        />
      </label>

      {topicsQuery.isPending ? (
        <p role="status" className="mt-6">
          {t.loading}
        </p>
      ) : null}
      {topicsQuery.isError ? (
        <LoadError message={t.loadError} onRetry={() => void topicsQuery.refetch()} />
      ) : null}
      {topicsQuery.isSuccess && topics.length === 0 ? (
        <p className="mt-6">{needle === "" ? t.emptyLanguage : t.emptySearch}</p>
      ) : null}

      {shelves.map((shelf) => {
        const inShelf = topics.filter((topic) => topic.category === shelf);
        if (inShelf.length === 0) return null;
        return (
          <section key={shelf} aria-labelledby={`grammar-${shelf}`} className="mt-8">
            <h2 id={`grammar-${shelf}`} className="text-xl font-semibold">
              {CATEGORY_LABELS[shelf]}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inShelf.map((topic) => (
                <li key={topic.id}>
                  <Link
                    to={`/learn/grammar/${enc(topic.id)}`}
                    className="block h-full rounded-xl border border-primary/15 p-4 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent dark:border-surface/15"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{topic.title}</span>
                      {topic.levelId ? (
                        <span className="shrink-0 rounded border border-primary/25 px-1.5 text-xs font-semibold uppercase dark:border-surface/25">
                          {topic.levelId}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm text-primary/75 dark:text-surface/75">
                      {topic.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
