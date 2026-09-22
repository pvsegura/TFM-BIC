import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { LanguageSelector } from "../components/language-selector.js";
import {
  VocabularyFilters,
  type VocabularyFiltersValue,
} from "../components/vocabulary-filters.js";
import { VocabularyList } from "../components/vocabulary-list.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { useUserVocabulary, useVocabularyCategories } from "../hooks/use-vocabulary.js";

const enc = encodeURIComponent;

function updatedSearch(current: URLSearchParams, patch: Record<string, string>): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  return next.toString();
}

function LanguageSection({ selectedCode }: { selectedCode: string | undefined }) {
  const languagesQuery = useLanguages();

  let body: ReactNode;
  if (languagesQuery.isPending) {
    body = <p role="status">Loading languages…</p>;
  } else if (languagesQuery.isError) {
    body = (
      <LoadError
        message="We couldn't load the languages. Please try again."
        onRetry={() => void languagesQuery.refetch()}
      />
    );
  } else {
    body = (
      <LanguageSelector
        languages={languagesQuery.data.languages}
        selectedCode={selectedCode}
        getHref={(code) => `/learn/vocabulary/mine?language=${enc(code)}`}
      />
    );
  }

  return (
    <section aria-labelledby="my-vocabulary-language-heading" className="mt-6">
      <h2 id="my-vocabulary-language-heading" className="mb-3 text-lg font-semibold">
        Language
      </h2>
      {body}
    </section>
  );
}

function MyVocabularySection({ languageCode }: { languageCode: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  const categoriesQuery = useVocabularyCategories(languageCode);
  const filters: Record<string, string> = {};
  if (category) filters.category = category;
  if (status) filters.status = status;
  if (q) filters.q = q;
  const mineQuery = useUserVocabulary(languageCode, filters);

  function setFilters(patch: Record<string, string>) {
    setSearchParams(updatedSearch(searchParams, patch));
  }

  const filterValue: VocabularyFiltersValue = { category, status, q };

  return (
    <>
      <VocabularyFilters
        categories={categoriesQuery.data?.categories ?? []}
        value={filterValue}
        onChange={(next) => setFilters({ category: next.category, status: next.status, q: next.q })}
        includeNewStatus={false}
      />

      <section aria-labelledby="my-vocabulary-words-heading" className="mt-4">
        <h2 id="my-vocabulary-words-heading" className="sr-only">
          Your words
        </h2>
        {mineQuery.isPending ? (
          <p role="status" className="mt-4">
            Loading your vocabulary…
          </p>
        ) : mineQuery.isError ? (
          <LoadError
            message="We couldn't load your vocabulary. Please try again."
            onRetry={() => void mineQuery.refetch()}
          />
        ) : mineQuery.data.items.length === 0 ? (
          <p className="mt-4">No vocabulary saved yet.</p>
        ) : (
          <VocabularyList
            items={mineQuery.data.items}
            getHref={(item) => `/learn/vocabulary/${enc(item.id)}`}
            label="Your vocabulary"
          />
        )}
      </section>
    </>
  );
}

/**
 * "My Vocabulary": only the words the student has saved, is learning or has learned, for one
 * language, filterable and searchable the same way browsing is. The language choice lives in the
 * URL, like the browse page.
 */
export function MyVocabularyPage() {
  const [searchParams] = useSearchParams();
  const languageCode = searchParams.get("language") ?? undefined;

  return (
    <section aria-labelledby="my-vocabulary-page-heading" className="mx-auto max-w-3xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="my-vocabulary-page-heading" className="text-2xl font-semibold">
          My Vocabulary
        </h1>
        <Link to="/learn/vocabulary" className="text-sm underline underline-offset-2">
          Browse vocabulary
        </Link>
      </div>
      <LanguageSection selectedCode={languageCode} />
      {languageCode === undefined ? null : <MyVocabularySection languageCode={languageCode} />}
    </section>
  );
}
