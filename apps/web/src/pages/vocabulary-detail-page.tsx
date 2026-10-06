import type { ReactNode } from "react";
import { useParams } from "react-router";
import { Link } from "../components/app-link.js";

import { AskCoachLink } from "../components/ask-coach-link.js";
import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { PronunciationPlayer } from "../components/pronunciation-player.js";
import { RelatedLesson } from "../components/related-lesson.js";
import { VocabularyActions } from "../components/vocabulary-actions.js";
import { VocabularyAudioPlayer } from "../components/vocabulary-audio-player.js";
import { VocabularyStatusBadge } from "../components/vocabulary-status-badge.js";
import { WordAudioButton } from "../components/word-audio-button.js";
import { useVocabularyMedia } from "../hooks/use-media.js";
import { useVocabulary, useVocabularyItem } from "../hooks/use-vocabulary.js";
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
  const mediaQuery = useVocabularyMedia(vocabularyId);
  const item0 = itemQuery.data;
  // The rest of the word's category, for "Next word" — the learning flow continues in context.
  const siblingsQuery = useVocabulary(item0?.languageId, {
    ...(item0 ? { category: item0.category.id } : {}),
    limit: 50,
  });

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
    const media = mediaQuery.data;
    const storedClips = media?.audio ?? [];
    const siblings = siblingsQuery.data?.items ?? [];
    const position = siblings.findIndex((s) => s.id === item.id);
    const next = position >= 0 ? siblings[position + 1] : undefined;
    const nextStep = next ? (
      <Link
        to={`${VOCABULARY_HREF}/${enc(next.id)}`}
        className="font-medium underline underline-offset-2"
      >
        Next word: <span lang={next.languageId}>{next.lemma}</span> →
      </Link>
    ) : (
      <Link to={`${VOCABULARY_HREF}/mine`} className="font-medium underline underline-offset-2">
        Review your saved words →
      </Link>
    );
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-sm">
          <Link
            to={`${VOCABULARY_HREF}?language=${enc(item.languageId)}&category=${enc(item.category.id)}`}
            className="underline underline-offset-2"
          >
            ← {item.category.title}
          </Link>
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl font-bold tracking-tight" lang={item.languageId}>
                {item.lemma}
              </h1>
              {/* M22: words are taught with their recorded pronunciation, not a video. */}
              <WordAudioButton
                url={storedClips.find((clip) => clip.purpose === "pronunciation")?.url}
                word={item.lemma}
                lang={item.languageId}
              />
            </div>
            <p className="mt-1 text-lg text-primary/70 dark:text-surface/70">{item.translation}</p>
          </div>
          <VocabularyStatusBadge status={item.userState.status} />
        </div>

        <div className="mt-6">
          {storedClips.length > 0 ? (
            <PronunciationPlayer clips={storedClips} />
          ) : (
            <VocabularyAudioPlayer vocabularyId={item.id} hasExample={item.example !== undefined} />
          )}
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
          <blockquote className="mt-6 border-l-4 border-accent pl-4">
            <p lang={item.languageId}>{item.example.text}</p>
            <p className="text-primary/70 dark:text-surface/70">{item.example.translation}</p>
          </blockquote>
        ) : null}

        <div className="mt-6">
          <VocabularyActions vocabularyId={item.id} status={item.userState.status} />
        </div>

        <nav
          aria-label="Keep going"
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-primary/10 pt-4 text-sm dark:border-surface/10"
        >
          {nextStep}
          <RelatedLesson vocabularyId={item.id} />
          <Link
            to={`/learn/phonetics?language=${enc(item.languageId)}`}
            className="underline underline-offset-2"
          >
            View pronunciation guide
          </Link>
          {/* M23: practise this word with the AI Coach. Only the entry's id travels; the backend
              re-authorises it through the same use case this page used. */}
          <AskCoachLink
            context={{ type: "vocabulary", vocabularyItemId: item.id }}
            languageCode={item.languageId}
            label="Practise this word"
          />
        </nav>
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
