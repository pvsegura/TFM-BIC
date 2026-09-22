import { Button } from "@tfm-bic/ui";
import { useState } from "react";

import {
  useMarkVocabularyItemLearned,
  useSaveVocabularyItem,
  useUnsaveVocabularyItem,
} from "../hooks/use-vocabulary.js";

export interface VocabularyActionsProps {
  vocabularyId: string;
  status: "new" | "saved" | "learning" | "learned";
}

/**
 * Save/unsave and "Mark as learned", shared by the list card and the detail view so the two can
 * never disagree about what a student may do with a word. Feedback after an action is a sentence
 * in a polite live region — never the badge's colour alone.
 */
export function VocabularyActions({ vocabularyId, status }: VocabularyActionsProps) {
  const saveMutation = useSaveVocabularyItem();
  const unsaveMutation = useUnsaveVocabularyItem();
  const learnedMutation = useMarkVocabularyItemLearned();
  const [feedback, setFeedback] = useState<string | null>(null);

  const isSaved = status !== "new";
  const isLearned = status === "learned";
  const busy = saveMutation.isPending || unsaveMutation.isPending || learnedMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isSaved ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            unsaveMutation.mutate(vocabularyId);
            setFeedback("Removed from your list.");
          }}
        >
          Remove from list
        </Button>
      ) : (
        <Button
          disabled={busy}
          onClick={() => {
            saveMutation.mutate(vocabularyId);
            setFeedback("Saved to your list.");
          }}
        >
          Save word
        </Button>
      )}

      {isLearned ? null : (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            learnedMutation.mutate(vocabularyId);
            setFeedback("Marked as learned.");
          }}
        >
          Mark as learned
        </Button>
      )}

      <p role="status" className="sr-only" aria-live="polite">
        {feedback}
      </p>
      {(saveMutation.isError || unsaveMutation.isError || learnedMutation.isError) && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
