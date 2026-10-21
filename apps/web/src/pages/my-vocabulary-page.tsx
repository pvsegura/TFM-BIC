import { useSearchParams } from "react-router";
import { Link } from "../components/app-link.js";

import { LoadError } from "../components/catalog-notices.js";
import { LanguagePickerSection } from "../components/language-picker-section.js";
import {
  VocabularyFilters,
  type VocabularyFiltersValue,
} from "../components/vocabulary-filters.js";
import { VocabularyList } from "../components/vocabulary-list.js";
import { useUserVocabulary, useVocabularyCategories } from "../hooks/use-vocabulary.js";
import { useSearchParamFilters } from "../hooks/use-search-param-filters.js";

const enc = encodeURIComponent;

function MyVocabularySection({ languageCode }: { languageCode: string }) {
  const [searchParams, setFilters] = useSearchParamFilters();
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q") ?? "";

  const categoriesQuery = useVocabularyCategories(languageCode);
  const filters: Record<string, string> = {};
  if (category) filters.category = category;
  if (status) filters.status = status;
  if (q) filters.q = q;
  const mineQuery = useUserVocabulary(languageCode, filters);

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
      <LanguagePickerSection
        headingId="my-vocabulary-language-heading"
        selectedCode={languageCode}
        getHref={(code) => `/learn/vocabulary/mine?language=${enc(code)}`}
      />
      {languageCode === undefined ? null : <MyVocabularySection languageCode={languageCode} />}
    </section>
  );
}
