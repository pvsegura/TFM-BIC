import type { CoachMode, LanguageId, LevelId } from "@tfm-bic/domain";

import type { AgentToolDeclaration } from "../ports/ai-agent-service.js";

/**
 * One tool the coach may call (M23, ADR-034).
 *
 * The authorisation design is in the types, not in a convention someone must remember:
 *
 * - A handler receives `CoachToolContext`, whose `userId` the route took from the **session**. The
 *   model never sees it and cannot supply it.
 * - A handler receives `args` as `unknown` and must parse it (see `tool-arguments.ts`). No tool
 *   declares a `userId`, `studentId`, `teacherId` or `email` argument, so there is nothing for a
 *   crafted tool call — or a learner's prompt — to put there.
 * - A handler returns plain, already-minimised data. "Minimised" is each tool's own job: cap list
 *   lengths, keep ids and titles, drop everything the coach does not need to answer. Whole
 *   database records are never returned (ADR-034, tool security).
 */
export interface CoachToolContext {
  /** The authenticated learner. From `request.currentUser`, never from an argument. */
  readonly userId: string;
  /** The language being learned, as the application resolved it. */
  readonly languageId: LanguageId;
  /** The learner's level, when the application knows it. */
  readonly levelId: LevelId | undefined;
}

export interface CoachTool {
  readonly declaration: AgentToolDeclaration;
  /**
   * Runs the tool. May throw `ToolArgumentError` for bad arguments or a domain not-found error;
   * the orchestrator turns either into a refusal result for the model, never an HTTP failure.
   */
  execute(context: CoachToolContext, args: unknown): Promise<unknown>;
}

export type CoachToolRegistry = ReadonlyMap<string, CoachTool>;

/**
 * Which tools each mode offers. A mode is a smaller tool set, not a different agent: fewer
 * declarations mean fewer input tokens per turn and fewer ways for the model to wander off the
 * task the learner picked. Every mode can read the learner's own context and progress.
 *
 * `propose_practice_activity` is deliberately **not** in every mode: a conversation turn should not
 * suddenly become a quiz.
 */
export const TOOLS_BY_MODE: Record<CoachMode, readonly string[]> = {
  explain: [
    "get_learner_context",
    "get_progress_summary",
    "get_recent_activity",
    "get_weak_areas",
    "list_lessons",
    "get_lesson",
    "get_exercise_context",
    "get_vocabulary_item",
    "list_vocabulary",
    "get_grammar_topic",
    "list_grammar_topics",
    "get_phonetic_information",
    "recommend_next_activity",
  ],
  practice: [
    "get_learner_context",
    "get_progress_summary",
    "get_weak_areas",
    "list_vocabulary",
    "get_vocabulary_item",
    "get_lesson",
    "propose_practice_activity",
  ],
  conversation: ["get_learner_context", "list_vocabulary", "get_lesson"],
  vocabulary: [
    "get_learner_context",
    "get_vocabulary_item",
    "list_vocabulary",
    "get_phonetic_information",
    "propose_practice_activity",
  ],
  "lesson-help": [
    "get_learner_context",
    "get_lesson",
    "list_lessons",
    "list_vocabulary",
    "get_grammar_topic",
    "get_exercise_context",
  ],
  "video-help": [
    "get_learner_context",
    "get_lesson_video_context",
    "get_lesson",
    "list_vocabulary",
  ],
  pronunciation: [
    "get_learner_context",
    "get_phonetic_information",
    "list_phonetics",
    "get_vocabulary_item",
  ],
};

/** The declarations one mode offers, in registry order. Unknown names are skipped, not fatal. */
export function declarationsForMode(
  registry: CoachToolRegistry,
  mode: CoachMode,
): readonly AgentToolDeclaration[] {
  const declarations: AgentToolDeclaration[] = [];
  for (const name of TOOLS_BY_MODE[mode]) {
    const tool = registry.get(name);
    if (tool) declarations.push(tool.declaration);
  }
  return declarations;
}
