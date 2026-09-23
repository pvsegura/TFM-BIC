import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { VocabularyActions } from "../components/vocabulary-actions.js";
import { VocabularyStatusBadge } from "../components/vocabulary-status-badge.js";
import { useVocabularyItem } from "../hooks/use-vocabulary.js";
import { isNotFoundError } from "../services/api-error.js";

const VOCABULARY_HREF = "/learn/vocabulary";
const enc = encodeURIComponent;

/** One labelled fact, shown only when the entry actually has it — a lesson never sees an empty "Plural:". */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-primary/70 dark:text-surface/70">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * One vocabulary entry for the signed-in student: its meaning, whatever grammar information it
 * has, an example when there is one, and the save/mark-learned actions. All state that matters is
 * on the server — the page only asks and shows what it was told — so a refresh shows the
 * persisted status.
 *
 * The API is the authority on whether the entry exists and is visible: a missing, unpublished or
 * malformed id is the same "not found" here, and the requested id is never echoed.
 */
export function VocabularyDetailPage() {
  const { vocabularyId } = useParams();
  const itemQuery = useVocabularyItem(vocabularyId);

  let body: ReactNode;
  if (itemQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading word…
      </p>
    );
  } else if (itemQuery.isError) {
    body = isNotFoundError(itemQuery.error) ? (
      <NotFoundNotice
        title="Vocabulary item not found"
        message="That word is not available."
        backTo={VOCABULARY_HREF}
        backLabel="Back to vocabulary"
      />
    ) : (
      <LoadError
        message="We couldn't load this word. Please try again."
        onRetry={() => void itemQuery.refetch()}
      />
    );
  } else {
    const item = itemQuery.data;
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" lang={item.languageId}>
              {item.lemma}
            </h1>
            <p className="mt-1 text-lg text-primary/70 dark:text-surface/70">{item.translation}</p>
          </div>
          <VocabularyStatusBadge status={item.userState.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Fact label="Category">{item.category.title}</Fact>
          {item.levelId ? <Fact label="Level">{item.levelId.toUpperCase()}</Fact> : null}
          {item.partOfSpeech ? <Fact label="Part of speech">{item.partOfSpeech}</Fact> : null}
          {item.gender ? <Fact label="Gender">{item.gender}</Fact> : null}
          {item.plural ? (
            <Fact label="Plural">
              <span lang={item.languageId}>{item.plural}</span>
            </Fact>
          ) : null}
        </dl>

        {item.note ? (
          <p className="mt-4 text-sm text-primary/70 dark:text-surface/70">{item.note}</p>
        ) : null}

        {item.example ? (
          <blockquote className="mt-6 border-l-4 border-primary/20 pl-4 dark:border-surface/20">
            <p lang={item.languageId}>{item.example.text}</p>
            <p className="text-primary/70 dark:text-surface/70">{item.example.translation}</p>
          </blockquote>
        ) : null}

        <div className="mt-6">
          <VocabularyActions vocabularyId={item.id} status={item.userState.status} />
        </div>

        <p className="mt-4">
          <Link
            to={`/learn/phonetics?language=${enc(item.languageId)}`}
            className="text-sm underline underline-offset-2"
          >
            View pronunciation guide
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-semibold">Vocabulary</h1>
      {body}
    </div>
  );
}
