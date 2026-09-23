import { Button } from "@tfm-bic/ui";
import { useState } from "react";

import { useCompletePhonetic, useRecordPhoneticPractice } from "../hooks/use-phonetics.js";

export interface PhoneticActionsProps {
  phoneticId: string;
  status: "not_started" | "viewed" | "practiced" | "completed";
}

/**
 * Practice and "Mark as completed", shared by the list card and the detail view so the two can
 * never disagree about what a student may do with a representation. Recording a view is not a
 * button here — the detail page does that itself on open, the way opening a lesson starts it.
 * Feedback after an action is a sentence in a polite live region — never the badge's colour alone.
 */
export function PhoneticActions({ phoneticId, status }: PhoneticActionsProps) {
  const practiceMutation = useRecordPhoneticPractice();
  const completeMutation = useCompletePhonetic();
  const [feedback, setFeedback] = useState<string | null>(null);

  const isCompleted = status === "completed";
  const busy = practiceMutation.isPending || completeMutation.isPending;

  if (isCompleted) {
    return (
      <p role="status" className="sr-only" aria-live="polite">
        {feedback}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => {
          practiceMutation.mutate(phoneticId);
          setFeedback("Marked as practiced.");
        }}
      >
        Practice
      </Button>

      <Button
        disabled={busy}
        onClick={() => {
          completeMutation.mutate(phoneticId);
          setFeedback("Marked as completed.");
        }}
      >
        Mark as completed
      </Button>

      <p role="status" className="sr-only" aria-live="polite">
        {feedback}
      </p>
      {(practiceMutation.isError || completeMutation.isError) && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
