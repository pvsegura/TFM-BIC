/**
 * What the learner opened the coach to do. A small closed set rather than one giant prompt
 * (ADR-034): a mode selects the instruction paragraph the agent is given and which tools are
 * offered, so "practise conversation" cannot silently turn into a grammar lecture and a vocabulary
 * question does not pay for the conversation rules.
 *
 * Modes are a product vocabulary, language-independent and provider-independent: no mode names a
 * language, a model or a provider. Adding one is a value here, a paragraph in the instructions and
 * a tool-set entry — never a new endpoint.
 */
export const COACH_MODES = [
  /** The default: answer the question, explain, adapt to the level. */
  "explain",
  /** Generate and run a small retrieval activity from the learner's real data (M22 principle 1). */
  "practice",
  /** Be a conversation partner in the target language, correcting sparingly. */
  "conversation",
  /** A specific vocabulary entry: meaning, more examples, a memory hook. */
  "vocabulary",
  /** Inside a lesson: re-explain, simplify, give another example. */
  "lesson-help",
  /** Inside a video: what was said, what it means, in that scene's context. */
  "video-help",
  /** Pronunciation awareness from the M10 phonetics data — never a scoring claim. */
  "pronunciation",
] as const;

export type CoachMode = (typeof COACH_MODES)[number];

export const DEFAULT_COACH_MODE: CoachMode = "explain";

export function isCoachMode(value: string): value is CoachMode {
  return COACH_MODES.some((mode) => mode === value);
}
