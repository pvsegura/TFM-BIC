import { useEffect, useRef } from "react";

import type { CoachMessage } from "../hooks/use-coach.js";
import { CoachPractice } from "./coach-practice.js";

/**
 * What the coach looked at, in the learner's words (M23, ADR-034).
 *
 * This is the product's answer to black-box AI: a coach that says "I checked your recent attempts"
 * is one a learner can sanity-check. The names are our own fixed strings, mapped here — never a
 * tool name, an internal path or a query shown raw.
 */
const TOOL_LABELS: Record<string, string> = {
  get_learner_context: "your course and level",
  get_progress_summary: "your progress",
  get_recent_activity: "what you did recently",
  get_weak_areas: "the exercises you find hardest",
  recommend_next_activity: "your lessons and their status",
  list_lessons: "your lesson list",
  get_lesson: "the lesson content",
  list_vocabulary: "your vocabulary",
  get_vocabulary_item: "the word's entry",
  list_phonetics: "the pronunciation guide",
  get_phonetic_information: "the pronunciation entry",
  list_grammar_topics: "the grammar reference",
  get_grammar_topic: "the grammar tables",
  get_exercise_context: "your answer to that exercise",
  get_lesson_video_context: "the video transcript",
  propose_practice_activity: "practice it wrote for you",
};

function describeTools(toolsUsed: readonly string[]): string | undefined {
  const labels = [...new Set(toolsUsed.map((tool) => TOOL_LABELS[tool]).filter(Boolean))];
  if (labels.length === 0) return undefined;
  return `Looked at: ${labels.join(", ")}.`;
}

function Bubble({ message }: { message: CoachMessage }) {
  const isLearner = message.role === "learner";
  return (
    <li className={isLearner ? "flex justify-end" : "flex justify-start"}>
      <div className={isLearner ? "max-w-[85%]" : "max-w-[95%]"}>
        {/* The speaker is named in text, not implied by alignment or colour alone — a screen
            reader reads these in order and must still be able to tell who said what. */}
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
          {isLearner ? "You" : "AI Coach"}
        </p>
        <div
          className={
            isLearner
              ? "rounded-lg rounded-br-none bg-primary/10 px-3 py-2 dark:bg-surface/10"
              : "rounded-lg rounded-bl-none border border-primary/15 bg-surface px-3 py-2 dark:border-surface/15 dark:bg-surface-dark"
          }
        >
          {/* `whitespace-pre-line` keeps the coach's line breaks without any markup being parsed. */}
          <p className="whitespace-pre-line">{message.text}</p>
        </div>
        {message.toolsUsed && describeTools(message.toolsUsed) ? (
          <p className="mt-1 text-xs opacity-70">{describeTools(message.toolsUsed)}</p>
        ) : null}
        {message.practice ? <CoachPractice practice={message.practice} /> : null}
      </div>
    </li>
  );
}

/**
 * The conversation area.
 *
 * Accessibility: the list is a polite live region, so a screen reader announces the coach's answer
 * when it arrives without interrupting typing; the "thinking" state is announced the same way. New
 * messages scroll into view, but only within this panel — the page itself does not jump.
 */
export function CoachConversation({
  messages,
  isSending,
  emptyState,
}: {
  messages: readonly CoachMessage[];
  isSending: boolean;
  emptyState: React.ReactNode;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Guarded: `scrollIntoView` is missing in jsdom and in some older browsers, and a scroll
    // convenience must never be what breaks the conversation.
    const end = endRef.current;
    if (typeof end?.scrollIntoView === "function") {
      end.scrollIntoView({ block: "nearest" });
    }
  }, [messages.length, isSending]);

  if (messages.length === 0 && !isSending) {
    return <div className="mt-4">{emptyState}</div>;
  }

  return (
    <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1">
      <ul aria-live="polite" aria-label="Conversation with the AI Coach" className="space-y-4">
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {isSending ? (
          <li className="flex justify-start">
            {/* One live region, so a screen reader hears the wait once rather than on every tick.
                The second line is there because an answer really can take a minute or more on a
                free provider tier (measured 2026-10-07) — a learner who is not told that assumes
                the page is broken and reloads, which costs another turn. */}
            <div role="status" className="text-sm opacity-80">
              <p>The AI Coach is thinking…</p>
              <p className="mt-1 text-xs">
                It is reading your lessons and progress. This can take up to a couple of minutes.
              </p>
            </div>
          </li>
        ) : null}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
