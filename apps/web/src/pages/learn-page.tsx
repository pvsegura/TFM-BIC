import type { ReactNode } from "react";
import { useParams } from "react-router";

import { LoadError } from "../components/catalog-notices.js";
import { ContentList } from "../components/content-list.js";
import { LanguageLevelPicker } from "../components/language-level-picker.js";
import { useContentList } from "../hooks/use-catalog.js";

const languageHref = (code: string) => `/learn/${encodeURIComponent(code)}`;
const levelHref = (code: string, id: string) => `${languageHref(code)}/${encodeURIComponent(id)}`;

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
      <LanguageLevelPicker
        languageCode={languageCode}
        levelId={levelId}
        getLanguageHref={languageHref}
        getLevelHref={levelHref}
        renderAvailableLevel={(code, id) => <ContentSection languageCode={code} levelId={id} />}
      />
    </section>
  );
}
