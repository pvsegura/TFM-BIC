import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { ContentBlocks, type LearningLanguage } from "../components/content-blocks.js";
import { useContentItem, useLanguages } from "../hooks/use-catalog.js";
import { isNotFoundError } from "../services/api-error.js";

const NOT_FOUND = (
  <NotFoundNotice title="Content not found" message="That content is not available." />
);

/**
 * A read-only view of one content item: its title, description and structured
 * blocks, each shown by a known safe component. It is the foundation the
 * lesson experience (a later milestone) builds on — it has no exercises,
 * progress or completion. Public, like the API behind it.
 *
 * The URL names the language and level, but the API is the authority on where
 * an item lives, so a mismatch is "not found" rather than trusted.
 */
export function ContentPage() {
  const { languageCode, levelId, contentId } = useParams();
  const contentQuery = useContentItem(contentId);
  const languagesQuery = useLanguages();

  let body: ReactNode;
  if (contentQuery.isPending || languagesQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading content…
      </p>
    );
  } else if (contentQuery.isError) {
    body = isNotFoundError(contentQuery.error) ? (
      NOT_FOUND
    ) : (
      <LoadError
        message="We couldn't load this content. Please try again."
        onRetry={() => void contentQuery.refetch()}
      />
    );
  } else if (
    contentQuery.data.languageId !== languageCode ||
    contentQuery.data.levelId !== levelId
  ) {
    body = NOT_FOUND;
  } else {
    const item = contentQuery.data;
    // Direction comes from the catalog metadata. If that could not be loaded
    // the browser decides; it is never assumed to be left-to-right.
    const catalogLanguage = languagesQuery.data?.languages.find((l) => l.code === item.languageId);
    const language: LearningLanguage = catalogLanguage
      ? { locale: catalogLanguage.locale, direction: catalogLanguage.direction }
      : { locale: item.languageId };

    body = (
      <article className="mt-4" lang={item.instructionLanguage}>
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        <p className="mt-1 text-primary/70 dark:text-surface/70">{item.description}</p>
        <p className="mt-2 text-xs text-primary/60 dark:text-surface/60">
          This is a reading view: it shows the content only.
        </p>
        <div className="mt-6">
          <ContentBlocks
            blocks={item.blocks}
            language={language}
            instructionLanguage={item.instructionLanguage}
          />
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Link
        to={`/learn/${encodeURIComponent(languageCode ?? "")}/${encodeURIComponent(levelId ?? "")}`}
        className="text-sm underline underline-offset-2"
      >
        Back to the content list
      </Link>
      {body}
    </div>
  );
}
