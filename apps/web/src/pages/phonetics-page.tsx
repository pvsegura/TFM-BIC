import type { ReactNode } from "react";
import { useSearchParams } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { LanguageSelector } from "../components/language-selector.js";
import { PhoneticList } from "../components/phonetic-list.js";
import { PhoneticTopicList } from "../components/phonetic-topic-list.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { usePhonetics, usePhoneticTopics } from "../hooks/use-phonetics.js";

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
  } else if (languagesQuery.data.languages.length === 0) {
    body = <p>No languages are available yet.</p>;
  } else {
    body = (
      <LanguageSelector
        languages={languagesQuery.data.languages}
        selectedCode={selectedCode}
        getHref={(code) => `/learn/phonetics?language=${enc(code)}`}
      />
    );
  }

  return (
    <section aria-labelledby="phonetics-language-heading" className="mt-6">
      <h2 id="phonetics-language-heading" className="mb-3 text-lg font-semibold">
        Language
      </h2>
      {body}
    </section>
  );
}

function PhoneticsSection({ languageCode }: { languageCode: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const topic = searchParams.get("topic") ?? "";
  const status = searchParams.get("status") ?? "";

  const topicsQuery = usePhoneticTopics(languageCode);
  const filters: Record<string, string> = {};
  if (topic) filters.topic = topic;
  if (status) filters.status = status;
  const phoneticsQuery = usePhonetics(languageCode, filters);

  function setFilters(patch: Record<string, string>) {
    setSearchParams(updatedSearch(searchParams, patch));
  }

  return (
    <>
      {topicsQuery.data && topicsQuery.data.topics.length > 0 ? (
        <section aria-labelledby="phonetics-topics-heading" className="mt-6">
          <h2 id="phonetics-topics-heading" className="mb-3 text-lg font-semibold">
            Topics
          </h2>
          <PhoneticTopicList
            topics={topicsQuery.data.topics}
            selectedId={topic}
            onSelect={(id) => setFilters({ topic: id })}
          />
        </section>
      ) : null}

      <section aria-labelledby="phonetics-sounds-heading" className="mt-6">
        <h2 id="phonetics-sounds-heading" className="sr-only">
          Sounds
        </h2>
        {phoneticsQuery.isPending ? (
          <p role="status" className="mt-4">
            Loading phonetics…
          </p>
        ) : phoneticsQuery.isError ? (
          <LoadError
            message="We couldn't load the phonetics. Please try again."
            onRetry={() => void phoneticsQuery.refetch()}
          />
        ) : phoneticsQuery.data.items.length === 0 ? (
          <p className="mt-4">No sounds match these filters yet.</p>
        ) : (
          <PhoneticList
            items={phoneticsQuery.data.items}
            getHref={(representation) => `/learn/phonetics/${enc(representation.id)}`}
            label="Phonetics"
          />
        )}
      </section>
    </>
  );
}

/**
 * The student's phonetics for one language: topics with progress, a topic/progress filter and the
 * matching sounds, each with its own practice/complete actions. The language choice lives in the
 * URL (`?language=pl`), like the public catalog picker and Vocabulary; the rest of the filters do
 * too, so the page is linkable. Nothing here names a language.
 */
export function PhoneticsPage() {
  const [searchParams] = useSearchParams();
  const languageCode = searchParams.get("language") ?? undefined;

  return (
    <section aria-labelledby="phonetics-page-heading" className="mx-auto max-w-3xl py-8">
      <h1 id="phonetics-page-heading" className="text-2xl font-semibold">
        Phonetics
      </h1>
      <LanguageSection selectedCode={languageCode} />
      {languageCode === undefined ? null : <PhoneticsSection languageCode={languageCode} />}
    </section>
  );
}
