import type { VocabularyItemResponse } from "@tfm-bic/contracts";
import { Link } from "./app-link.js";

import { useMediaIndex } from "../hooks/use-media.js";
import { WordAudioButton } from "./word-audio-button.js";
import { VocabularyActions } from "./vocabulary-actions.js";
import { VocabularyStatusBadge } from "./vocabulary-status-badge.js";

export interface VocabularyItemCardProps {
  item: VocabularyItemResponse;
  href: string;
}

/**
 * One vocabulary entry in a list: the word, its meaning, where it belongs and the student's own
 * state and actions. Presentation only — it receives the entry and where its detail page is. Text
 * is rendered as text, never as markup, and the word is tagged with the language it is written in.
 */
export function VocabularyItemCard({ item, href }: VocabularyItemCardProps) {
  const media = useMediaIndex();
  const pronunciation = media.data?.get(`vocabulary-item:${item.id}`)?.pronunciationUrl;
  return (
    <li className="rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex items-start gap-3">
          <WordAudioButton url={pronunciation} word={item.lemma} lang={item.languageId} />
          <div>
            <Link to={href} className="text-lg font-semibold underline-offset-2 hover:underline">
              <span lang={item.languageId}>{item.lemma}</span>
            </Link>
            <p className="text-primary/70 dark:text-surface/70">{item.translation}</p>
          </div>
        </div>
        <VocabularyStatusBadge status={item.userState.status} />
      </div>

      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-primary/70 dark:text-surface/70">
        <span>{item.category.title}</span>
        {item.levelId ? <span>{item.levelId.toUpperCase()}</span> : null}
        {item.partOfSpeech ? <span>{item.partOfSpeech}</span> : null}
      </p>

      <div className="mt-3">
        <VocabularyActions vocabularyId={item.id} status={item.userState.status} />
      </div>
    </li>
  );
}
