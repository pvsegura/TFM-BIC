import type { GrammarTopicSummaryResponse } from "@tfm-bic/contracts";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Link } from "../components/app-link.js";
import { LoadError } from "../components/catalog-notices.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { useGrammarTopics } from "../hooks/use-grammar.js";

const enc = encodeURIComponent;

/** Shelf names for the reference's categories (the API sends them in display order). */
const CATEGORY_LABELS: Record<GrammarTopicSummaryResponse["category"], string> = {
  verbs: "Verbs and conjugation",
  pronouns: "Pronouns and question words",
  nouns: "Nouns, cases and articles",
  adjectives: "Adjectives",
  adverbs: "Adverbs",
  prepositions: "Prepositions",
  numbers: "Numbers",
  connectors: "Connectors",
  "word-formation": "Word formation",
};

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
    (t) => needle === "" || normalise(`${t.title} ${t.description}`).includes(needle),
  );
  const shelves = Object.keys(CATEGORY_LABELS) as GrammarTopicSummaryResponse["category"][];

  return (
    <div className="mx-auto max-w-5xl py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Grammar</h1>
      {languages.length > 1 ? (
        <nav aria-label="Language" className="mt-3 flex flex-wrap gap-2">
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
        Quick reference tables{language ? ` for ${language.name}` : ""}: conjugations, pronouns,
        adverbs, cases, numbers and word formation. Look something up while you learn.
      </p>

      <label className="mt-5 block max-w-md">
        <span className="text-sm font-medium">Search the reference</span>
        <input
          type="search"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
          }}
          placeholder="e.g. past tense, pronouns, adverbs"
          className="mt-1 w-full rounded-md border border-primary/25 bg-surface px-3 py-2 text-sm dark:border-surface/25 dark:bg-night-paper"
        />
      </label>

      {topicsQuery.isPending ? (
        <p role="status" className="mt-6">
          Loading the reference…
        </p>
      ) : null}
      {topicsQuery.isError ? (
        <LoadError
          message="We couldn't load the grammar reference. Please try again."
          onRetry={() => void topicsQuery.refetch()}
        />
      ) : null}
      {topicsQuery.isSuccess && topics.length === 0 ? (
        <p className="mt-6">
          {needle === ""
            ? "No reference topics for this language yet."
            : "No topic matches that search."}
        </p>
      ) : null}

      {shelves.map((shelf) => {
        const inShelf = topics.filter((t) => t.category === shelf);
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
