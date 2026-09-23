import type { ReactNode } from "react";
import { useParams } from "react-router";

import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { PhoneticActions } from "../components/phonetic-actions.js";
import { PhoneticProgressBadge } from "../components/phonetic-progress-badge.js";
import { usePhonetic, useRecordPhoneticViewOnOpen } from "../hooks/use-phonetics.js";
import { isNotFoundError } from "../services/api-error.js";

const PHONETICS_HREF = "/learn/phonetics";

/** One labelled fact, shown only when the representation actually has it — a sound never sees an
 * empty "Level:". */
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
 * One phonetic representation for the signed-in student: its IPA, description, topic, level, a
 * usage note and example words when there are any, and the practice/complete actions. Opening the
 * page records a view (`useRecordPhoneticViewOnOpen`), the way opening a lesson starts it. All
 * state that matters is on the server — the page only asks and shows what it was told — so a
 * refresh shows the persisted progress.
 *
 * The API is the authority on whether the representation exists and is visible: a missing,
 * unpublished or malformed id is the same "not found" here, and the requested id is never echoed.
 */
export function PhoneticDetailPage() {
  const { phoneticId } = useParams();
  const phoneticQuery = usePhonetic(phoneticId);
  useRecordPhoneticViewOnOpen(phoneticQuery.data);

  let body: ReactNode;
  if (phoneticQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading sound…
      </p>
    );
  } else if (phoneticQuery.isError) {
    body = isNotFoundError(phoneticQuery.error) ? (
      <NotFoundNotice
        title="Phonetic representation not found"
        message="That sound is not available."
        backTo={PHONETICS_HREF}
        backLabel="Back to phonetics"
      />
    ) : (
      <LoadError
        message="We couldn't load this sound. Please try again."
        onRetry={() => void phoneticQuery.refetch()}
      />
    );
  } else {
    const representation = phoneticQuery.data;
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-4xl font-semibold"
              lang={representation.languageId}
              aria-label={`IPA symbol ${representation.ipa}`}
            >
              {representation.ipa}
            </p>
            <p className="mt-1 text-lg text-primary/70 dark:text-surface/70">
              {representation.description}
            </p>
          </div>
          <PhoneticProgressBadge status={representation.userProgress.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {representation.topic ? <Fact label="Topic">{representation.topic.title}</Fact> : null}
          {representation.levelId ? (
            <Fact label="Level">{representation.levelId.toUpperCase()}</Fact>
          ) : null}
        </dl>

        {representation.note ? (
          <p className="mt-4 text-sm text-primary/70 dark:text-surface/70">{representation.note}</p>
        ) : null}

        {representation.exampleWords && representation.exampleWords.length > 0 ? (
          <ul aria-label="Example words" className="mt-6 grid gap-2">
            {representation.exampleWords.map((example) => (
              <li
                key={example.word}
                className="border-l-4 border-primary/20 pl-4 dark:border-surface/20"
              >
                <p lang={representation.languageId}>{example.word}</p>
                <p className="text-primary/70 dark:text-surface/70">{example.translation}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6">
          <PhoneticActions
            phoneticId={representation.id}
            status={representation.userProgress.status}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-semibold">Phonetics</h1>
      {body}
    </div>
  );
}
