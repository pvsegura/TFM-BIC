import type { LanguageLevelsResponse } from "@tfm-bic/contracts";
import type { ReactNode } from "react";
import { useParams } from "react-router";

import { ContentList } from "../components/content-list.js";
import { LanguageSelector } from "../components/language-selector.js";
import { LevelSelector } from "../components/level-selector.js";
import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { useContentList, useLanguageLevels, useLanguages } from "../hooks/use-catalog.js";
import { isNotFoundError } from "../services/api-error.js";

const languageHref = (code: string) => `/learn/${encodeURIComponent(code)}`;

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
        getHref={languageHref}
      />
    );
  }

  return (
    <section aria-labelledby="language-heading" className="mt-6">
      <h2 id="language-heading" className="mb-3 text-lg font-semibold">
        Language
      </h2>
      {body}
    </section>
  );
}

function ContentSection({ languageCode, levelId }: { languageCode: string; levelId: string }) {
  const contentQuery = useContentList(languageCode, levelId, true);

  let body: ReactNode;
  if (contentQuery.isPending) {
    body = <p role="status">Loading content…</p>;
  } else if (contentQuery.isError) {
    body = (
      <LoadError
        message="We couldn't load the content. Please try again."
        onRetry={() => void contentQuery.refetch()}
      />
    );
  } else if (contentQuery.data.items.length === 0) {
    body = <p>No content is available for this level yet.</p>;
  } else {
    body = (
      <ContentList
        items={contentQuery.data.items}
        getHref={(item) =>
          `/learn/${encodeURIComponent(item.languageId)}/${encodeURIComponent(item.levelId)}/${encodeURIComponent(item.id)}`
        }
      />
    );
  }

  return (
    <section aria-labelledby="content-heading" className="mt-6">
      <h2 id="content-heading" className="mb-3 text-lg font-semibold">
        Content
      </h2>
      {body}
    </section>
  );
}

function LevelDetail({
  levels,
  languageCode,
  levelId,
}: {
  levels: LanguageLevelsResponse;
  languageCode: string;
  levelId: string;
}) {
  const level = levels.levels.find((candidate) => candidate.id === levelId);
  if (!level) {
    return (
      <NotFoundNotice title="Level not found" message="This language does not offer that level." />
    );
  }
  if (level.status !== "available") {
    return (
      <p role="status" className="mt-6">
        {level.label} is coming soon for {levels.language.name}. There is no content to show yet.
      </p>
    );
  }
  return <ContentSection languageCode={languageCode} levelId={levelId} />;
}

function LevelSection({
  languageCode,
  levelId,
}: {
  languageCode: string;
  levelId: string | undefined;
}) {
  const levelsQuery = useLanguageLevels(languageCode);

  if (levelsQuery.isPending) {
    return (
      <p role="status" className="mt-6">
        Loading levels…
      </p>
    );
  }
  if (levelsQuery.isError) {
    if (isNotFoundError(levelsQuery.error)) {
      return (
        <NotFoundNotice title="Language not found" message="That language is not available." />
      );
    }
    return (
      <LoadError
        message="We couldn't load the levels. Please try again."
        onRetry={() => void levelsQuery.refetch()}
      />
    );
  }

  const levels = levelsQuery.data;
  return (
    <>
      <section aria-labelledby="level-heading" className="mt-6">
        <h2 id="level-heading" className="mb-3 text-lg font-semibold">
          Level for {levels.language.name}
        </h2>
        <LevelSelector
          levels={levels.levels}
          selectedId={levelId}
          getHref={(id) => `${languageHref(languageCode)}/${encodeURIComponent(id)}`}
        />
      </section>
      {levelId === undefined ? null : (
        <LevelDetail levels={levels} languageCode={languageCode} levelId={levelId} />
      )}
    </>
  );
}

/**
 * The one page for choosing what to learn — language, then level, then the
 * content available there — for *every* language. The choice lives in the URL
 * (`/learn`, `/learn/:languageCode`, `/learn/:languageCode/:levelId`), so it is
 * linkable and needs no client state. Everything shown comes from the catalog
 * API; nothing here names a language. Public — the API is too — and only
 * `available` levels ever request content.
 */
export function LearnPage() {
  const { languageCode, levelId } = useParams();

  return (
    <section aria-labelledby="learn-heading" className="mx-auto max-w-3xl py-8">
      <h1 id="learn-heading" className="text-2xl font-semibold">
        Choose what to learn
      </h1>
      <LanguageSection selectedCode={languageCode} />
      {languageCode === undefined ? null : (
        <LevelSection languageCode={languageCode} levelId={levelId} />
      )}
    </section>
  );
}
