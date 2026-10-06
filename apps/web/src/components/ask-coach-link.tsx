import { Link } from "./app-link.js";

/**
 * A contextual entry point into the AI Coach (M23, ADR-034).
 *
 * The coach is not only a page a learner has to remember: it is offered where the question arises —
 * under an exercise they got wrong, beside a word, under a video. The link carries nothing but a
 * **content id**, which the backend re-authorises through the same use case that page uses; it
 * never carries a user, a level, a prompt or an answer.
 *
 * Rendered as a link, not a button, because it navigates — so middle-click, open-in-new-tab and
 * the browser's own focus handling all work, and keyboard users get the usual behaviour for free.
 */
export type AskCoachContext =
  | { type: "lesson"; lessonId: string }
  | { type: "exercise"; exerciseId: string }
  | { type: "vocabulary"; vocabularyItemId: string }
  | { type: "video"; lessonId: string }
  | { type: "phonetic"; phoneticId: string };

function hrefFor(context: AskCoachContext, languageCode: string | undefined): string {
  const params = new URLSearchParams();
  switch (context.type) {
    case "lesson":
      params.set("lesson", context.lessonId);
      break;
    case "exercise":
      params.set("exercise", context.exerciseId);
      break;
    case "vocabulary":
      params.set("vocabulary", context.vocabularyItemId);
      break;
    case "video":
      params.set("video", context.lessonId);
      break;
    case "phonetic":
      params.set("phonetic", context.phoneticId);
      break;
  }
  if (languageCode !== undefined) {
    params.set("language", languageCode);
  }
  return `/learn/coach?${params.toString()}`;
}

export function AskCoachLink({
  context,
  languageCode,
  label,
}: {
  context: AskCoachContext;
  languageCode?: string | undefined;
  label: string;
}) {
  return (
    <Link
      to={hrefFor(context, languageCode)}
      // A 44px tap target, and an outline rather than a fill so it never competes with the page's
      // own primary action (answering the exercise, completing the lesson).
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium hover:bg-primary/5 dark:border-surface/30 dark:hover:bg-surface/10"
    >
      {/* Decorative only: the label carries the meaning, so the glyph is hidden from screen readers. */}
      <span aria-hidden="true">✨</span>
      {label}
    </Link>
  );
}
