import {
  contentIdSchema,
  vocabularyItemIdSchema,
  type CoachContextRef,
  type CoachStatusResponse,
} from "@verbysia/contracts";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Link } from "../components/app-link.js";
import { CoachComposer } from "../components/coach-composer.js";
import { CoachConversation } from "../components/coach-conversation.js";
import { useLanguages } from "../hooks/use-catalog.js";
import { useCoachConversation, useCoachStatus } from "../hooks/use-coach.js";
import type { CoachMode } from "../services/coach-api.js";
import { m } from "../i18n/index.js";

/**
 * The AI Coach (M23, ADR-034).
 *
 * This is a learning tool, not a chat window with a language model attached. Three things make
 * that visible on the page rather than only in the backend:
 *
 * - **It shows the context it was given** — language, the CEFR level the *application* derived, and
 *   what the learner has open. A learner can see what the coach knows about them.
 * - **It says what it looked at** after each answer (see `coach-conversation.tsx`), so a
 *   recommendation can be checked against real records instead of trusted.
 * - **It says what it does not do**: the conversation is not saved, and generated practice is not
 *   scored.
 *
 * Contextual entry points land here with a query parameter (`?lesson=`, `?exercise=`,
 * `?vocabulary=`, `?video=`, `?phonetic=`). The id is only a hint: the backend re-authorises it
 * through the same use case the corresponding page uses, so a link to someone else's or to
 * unpublished content simply yields no context.
 */

/** The query parameters the contextual entry points use, in the order they are checked. */
const CONTEXT_PARAMS = ["exercise", "lesson", "video", "vocabulary", "phonetic"] as const;

/**
 * Builds the context from the URL, validating the id against the shared contract first — so a
 * hand-edited or stale link is simply "no context" here rather than a `400` from the API. The
 * backend re-authorises it regardless; this only keeps a malformed value out of the request.
 */
function contextFrom(params: URLSearchParams): CoachContextRef | undefined {
  for (const key of CONTEXT_PARAMS) {
    const raw = params.get(key);
    if (!raw) continue;
    if (key === "vocabulary") {
      const id = vocabularyItemIdSchema.safeParse(raw);
      if (id.success) return { type: "vocabulary-item", vocabularyItemId: id.data };
      continue;
    }
    const id = contentIdSchema.safeParse(raw);
    if (!id.success) continue;
    switch (key) {
      case "exercise":
        return { type: "exercise", exerciseId: id.data };
      case "lesson":
        return { type: "lesson", lessonId: id.data };
      case "video":
        return { type: "video", lessonId: id.data };
      case "phonetic":
        return { type: "phonetic", phoneticId: id.data };
    }
  }
  return undefined;
}

/** The mode a contextual entry point should open in — the help that page's button promised. */
function modeFor(context: CoachContextRef | undefined): CoachMode {
  switch (context?.type) {
    case "vocabulary-item":
      return "vocabulary";
    case "lesson":
      return "lesson-help";
    case "video":
      return "video-help";
    case "phonetic":
      return "pronunciation";
    default:
      return "explain";
  }
}

/** Starter questions. Each is a real question in the learner's words, not a hidden command. */
const t = m.study.coach;
const QUICK_MODES: readonly CoachMode[] = ["explain", "practice", "explain", "conversation"];
const QUICK_ACTIONS: { label: string; message: string; mode: CoachMode }[] = t.quickActions.map(
  (action, i) => ({ ...action, mode: QUICK_MODES[i] ?? "explain" }),
);

function ContextPanel({
  learner,
  context,
}: {
  learner: CoachStatusResponse["learner"];
  context: CoachContextRef | undefined;
}) {
  const rows: { label: string; value: string }[] = [];
  if (learner) {
    rows.push({ label: t.learning, value: learner.languageName });
    rows.push({
      label: t.level,
      // Said in words when unknown: the coach is told the same, and must not guess.
      value: learner.cefrLevel ?? t.levelUnset,
    });
  }
  if (context) {
    const described: Record<CoachContextRef["type"], string> = t.contextTypes;
    rows.push({ label: t.inContext, value: described[context.type] });
  }
  if (rows.length === 0) return null;

  return (
    <aside
      aria-labelledby="coach-context-heading"
      className="rounded-lg border border-primary/15 bg-surface p-4 dark:border-surface/15 dark:bg-surface-dark"
    >
      <h2 id="coach-context-heading" className="text-sm font-semibold uppercase tracking-wide">
        {t.contextTitle}
      </h2>
      <dl className="mt-2 space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap gap-x-2">
            <dt className="opacity-70">{row.label}:</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs opacity-70">{t.contextNote}</p>
    </aside>
  );
}

export function AiCoachPage() {
  const [searchParams] = useSearchParams();
  const languagesQuery = useLanguages();
  const requestedLanguage = searchParams.get("language") ?? undefined;
  const context = useMemo(() => contextFrom(searchParams), [searchParams]);

  // The language comes from the link, or the first language the catalog offers — never hard-coded.
  const languageCode = requestedLanguage ?? languagesQuery.data?.languages[0]?.code ?? undefined;

  const statusQuery = useCoachStatus(languageCode);
  const [mode, setMode] = useState<CoachMode>(() => modeFor(context));
  const conversation = useCoachConversation({
    languageCode: languageCode ?? "",
    context,
  });

  const unavailable = statusQuery.data?.available === false;
  const failedToLoad = statusQuery.isError;
  const ready = languageCode !== undefined && !unavailable && !failedToLoad;

  return (
    <section aria-labelledby="coach-heading" className="mx-auto max-w-3xl">
      <h1 id="coach-heading" className="text-2xl font-semibold">
        {t.title}
      </h1>
      <p className="mt-2 opacity-80">{t.intro}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="sm:order-2 sm:w-64">
          <ContextPanel learner={statusQuery.data?.learner ?? null} context={context} />
        </div>

        <div className="sm:order-1">
          {statusQuery.isPending ? <p role="status">{t.checking}</p> : null}

          {failedToLoad ? (
            <p role="status" className="rounded-lg border border-primary/20 p-4">
              {t.failedBefore}
              <Link to="/learn/lessons">{t.lessonsLink}</Link>
              {t.failedAfter}
            </p>
          ) : null}

          {unavailable ? (
            <p role="status" className="rounded-lg border border-primary/20 p-4">
              {t.unavailableBefore}
              <Link to="/learn/lessons">{t.lessonsLink}</Link>,{" "}
              <Link to="/learn/exercises">{t.exercisesLink}</Link>
              {t.and}
              <Link to="/learn/vocabulary">{t.vocabularyLink}</Link>
              {t.unavailableAfter}
            </p>
          ) : null}

          {ready ? (
            <>
              <CoachConversation
                messages={conversation.messages}
                isSending={conversation.isSending}
                emptyState={
                  <div>
                    <h2 className="text-base font-semibold">{t.quickTitle}</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {QUICK_ACTIONS.map((action) => (
                        <li key={action.label}>
                          <button
                            type="button"
                            className="min-h-11 rounded-full border border-primary/30 px-4 py-2 text-sm hover:bg-primary/5 dark:border-surface/30 dark:hover:bg-surface/10"
                            onClick={() => {
                              setMode(action.mode);
                              conversation.send(action.message, action.mode);
                            }}
                          >
                            {action.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                }
              />

              {conversation.error ? (
                <div role="alert" className="mt-4 rounded-lg border border-primary/30 p-3">
                  <p>{conversation.error}</p>
                  {conversation.canRetry ? (
                    <button
                      type="button"
                      className="mt-2 min-h-11 rounded border border-primary px-3 py-1 font-medium"
                      onClick={conversation.retry}
                    >
                      {t.tryAgain}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <CoachComposer
                mode={mode}
                onModeChange={setMode}
                onSend={(message) => conversation.send(message, mode)}
                isSending={conversation.isSending}
                maxLength={statusQuery.data?.maxMessageLength ?? 1000}
                disabled={!ready}
              />

              <p className="mt-4 text-xs opacity-70">
                {t.footerBefore}
                <Link to="/privacy">{t.footerLink}</Link>
              </p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
