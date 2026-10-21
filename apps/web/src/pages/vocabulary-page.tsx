import { useSearchParams } from "react-router";
import { Link } from "../components/app-link.js";

import { LoadError } from "../components/catalog-notices.js";
import { LanguagePickerSection } from "../components/language-picker-section.js";
import { VocabularyCategoryList } from "../components/vocabulary-category-list.js";
import {
  VocabularyFilters,
  type VocabularyFiltersValue,
} from "../components/vocabulary-filters.js";
import { VocabularyList } from "../components/vocabulary-list.js";
import { useVocabulary, useVocabularyCategories } from "../hooks/use-vocabulary.js";
import { useSearchParamFilters } from "../hooks/use-search-param-filters.js";

const enc = encodeURIComponent;

function VocabularySection({ languageCode }: { languageCode: string }) {
  const [searchParams, setFilters] = useSearchParamFilters();
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  const categoriesQuery = useVocabularyCategories(languageCode);
  const filters: Record<string, string> = {};
  if (category) filters.category = category;
  if (status) filters.status = status;
  if (q) filters.q = q;
  const vocabularyQuery = useVocabulary(languageCode, filters);

  const filterValue: VocabularyFiltersValue = { category, status, q };

  return (
    <>
      {categoriesQuery.data && categoriesQuery.data.categories.length > 0 ? (
        <section aria-labelledby="vocabulary-categories-heading" className="mt-6">
          <h2 id="vocabulary-categories-heading" className="mb-3 text-lg font-semibold">
            Categories
          </h2>
          <VocabularyCategoryList
            categories={categoriesQuery.data.categories}
            selectedId={category}
            onSelect={(id) => setFilters({ category: id })}
          />
        </section>
      ) : null}

      <VocabularyFilters
        categories={categoriesQuery.data?.categories ?? []}
        value={filterValue}
        onChange={(next) => setFilters({ category: next.category, status: next.status, q: next.q })}
      />

      <section aria-labelledby="vocabulary-words-heading" className="mt-4">
        <h2 id="vocabulary-words-heading" className="sr-only">
          Words
        </h2>
        {vocabularyQuery.isPending ? (
          <p role="status" className="mt-4">
            Loading vocabulary…
          </p>
        ) : vocabularyQuery.isError ? (
          <LoadError
            message="We couldn't load the vocabulary. Please try again."
            onRetry={() => void vocabularyQuery.refetch()}
          />
        ) : vocabularyQuery.data.items.length === 0 ? (
          <p className="mt-4">No vocabulary matches these filters yet.</p>
        ) : (
          <VocabularyList
            items={vocabularyQuery.data.items}
            getHref={(item) => `/learn/vocabulary/${enc(item.id)}`}
            label="Vocabulary"
          />
        )}
      </section>
    </>
  );
}

/**
 * The student's vocabulary for one language: categories with progress, filters (category, status,
 * search) and the matching words, each with its own save/learned actions. The language choice
 * lives in the URL (`?language=pl`), like the public catalog picker; the rest of the filters do
 * too, so the page is linkable. Nothing here names a language.
 */
export function VocabularyPage() {
  const [searchParams] = useSearchParams();
  const languageCode = searchParams.get("language") ?? undefined;

  return (
    <section aria-labelledby="vocabulary-page-heading" className="mx-auto max-w-3xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="vocabulary-page-heading" className="text-2xl font-semibold">
          Vocabulary
        </h1>
        <Link to="/learn/vocabulary/mine" className="text-sm underline underline-offset-2">
          My Vocabulary
        </Link>
      </div>
      <LanguagePickerSection
        headingId="vocabulary-language-heading"
        selectedCode={languageCode}
        getHref={(code) => `/learn/vocabulary?language=${enc(code)}`}
      />
      {languageCode === undefined ? null : <VocabularySection languageCode={languageCode} />}
    </section>
  );
}
