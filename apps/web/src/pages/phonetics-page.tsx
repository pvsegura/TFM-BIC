import { useSearchParams } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { LanguagePickerSection } from "../components/language-picker-section.js";
import { PhoneticList } from "../components/phonetic-list.js";
import { PhoneticTopicList } from "../components/phonetic-topic-list.js";
import { usePhonetics, usePhoneticTopics } from "../hooks/use-phonetics.js";
import { useSearchParamFilters } from "../hooks/use-search-param-filters.js";
import { m } from "../i18n/index.js";

const t = m.study.phonetics;

const enc = encodeURIComponent;

function PhoneticsSection({ languageCode }: { languageCode: string }) {
  const [searchParams, setFilters] = useSearchParamFilters();
  const topic = searchParams.get("topic") ?? "";
  const status = searchParams.get("status") ?? "";

  const topicsQuery = usePhoneticTopics(languageCode);
  const filters: Record<string, string> = {};
  if (topic) filters.topic = topic;
  if (status) filters.status = status;
  const phoneticsQuery = usePhonetics(languageCode, filters);

  return (
    <>
      {topicsQuery.data && topicsQuery.data.topics.length > 0 ? (
        <section aria-labelledby="phonetics-topics-heading" className="mt-6">
          <h2 id="phonetics-topics-heading" className="mb-3 text-lg font-semibold">
            {t.topics}
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
          {t.sounds}
        </h2>
        {phoneticsQuery.isPending ? (
          <p role="status" className="mt-4">
            {t.loading}
          </p>
        ) : phoneticsQuery.isError ? (
          <LoadError message={t.loadError} onRetry={() => void phoneticsQuery.refetch()} />
        ) : phoneticsQuery.data.items.length === 0 ? (
          <p className="mt-4">{t.empty}</p>
        ) : (
          <PhoneticList
            items={phoneticsQuery.data.items}
            getHref={(representation) => `/learn/phonetics/${enc(representation.id)}`}
            label={t.listLabel}
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
        {t.title}
      </h1>
      <LanguagePickerSection
        headingId="phonetics-language-heading"
        selectedCode={languageCode}
        getHref={(code) => `/learn/phonetics?language=${enc(code)}`}
      />
      {languageCode === undefined ? null : <PhoneticsSection languageCode={languageCode} />}
    </section>
  );
}
