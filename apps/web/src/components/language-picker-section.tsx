import type { ReactNode } from "react";

import { useLanguages } from "../hooks/use-catalog.js";
import { LoadError } from "./catalog-notices.js";
import { LanguageSelector } from "./language-selector.js";
import { m } from "../i18n/index.js";

export interface LanguagePickerSectionProps {
  /** The heading's id, unique on the page (the section is labelled by it). */
  headingId: string;
  selectedCode: string | undefined;
  /** Where choosing a language leads — each page keeps the choice in its own URL. */
  getHref: (languageCode: string) => string;
}

/** The "Language" section every per-language page starts with: loading, a retryable error, an
 * honest empty state, or the languages to choose from. */
export function LanguagePickerSection({
  headingId,
  selectedCode,
  getHref,
}: LanguagePickerSectionProps) {
  const languagesQuery = useLanguages();

  let body: ReactNode;
  if (languagesQuery.isPending) {
    body = <p role="status">{m.learn.catalog.loadingLanguages}</p>;
  } else if (languagesQuery.isError) {
    body = (
      <LoadError
        message={m.learn.catalog.languagesError}
        onRetry={() => void languagesQuery.refetch()}
      />
    );
  } else if (languagesQuery.data.languages.length === 0) {
    body = <p>{m.learn.catalog.noLanguages}</p>;
  } else {
    body = (
      <LanguageSelector
        languages={languagesQuery.data.languages}
        selectedCode={selectedCode}
        getHref={getHref}
      />
    );
  }

  return (
    <section aria-labelledby={headingId} className="mt-6">
      <h2 id={headingId} className="mb-3 text-lg font-semibold">
        {m.learn.catalog.languageHeading}
      </h2>
      {body}
    </section>
  );
}
