import { sanitizeCoachText, type CoachMessage } from "./coach-message.js";

/**
 * How many earlier turns of the current conversation are replayed to the provider. The coach is
 * deliberately stateless at the provider (`store: false`, so no `previous_interaction_id` is even
 * available — ADR-034), so the transcript travels with each request and this is the one thing
 * keeping that from growing without bound. Twelve turns is about six exchanges: enough for
 * "why was that wrong?" → "give me another example" → "make it easier", which is what the
 * conversation model is for.
 */
export const MAX_HISTORY_TURNS = 12;

/**
 * Characters kept per replayed turn. Longer than a learner's own limit because a coach answer may
 * legitimately be longer than a question; a turn above this is truncated rather than refused, since
 * refusing would strand a conversation the learner can see on screen.
 */
export const MAX_HISTORY_TURN_LENGTH = 2_000;

/** Who said it. Only these two: tool calls and results are never part of a replayed transcript. */
export const COACH_TURN_ROLES = ["learner", "coach"] as const;
export type CoachTurnRole = (typeof COACH_TURN_ROLES)[number];

export interface CoachTurn {
  readonly role: CoachTurnRole;
  readonly text: CoachMessage;
}

/**
 * The transcript the provider may be shown, from what the client sent.
 *
 * The client is the only place the conversation exists, so it is the client that sends the history
 * back — and a client can lie. This is what makes that harmless: only `learner` and `coach` **text**
 * survives, so a crafted history cannot forge a tool result, replay a model signature or claim the
 * application said something about another learner. Nothing here is trusted for authorization;
 * every tool still resolves the learner from the session (ADR-034, decisions 3 and 5).
 *
 * Oldest turns are dropped first, so the end of the conversation — the part the learner is actually
 * replying to — is what is kept.
 */
export function normalizeCoachHistory(
  turns: readonly { role: CoachTurnRole; text: string }[],
  maxTurns = MAX_HISTORY_TURNS,
): readonly CoachTurn[] {
  const kept: CoachTurn[] = [];
  for (const turn of turns.slice(-Math.max(0, maxTurns))) {
    const truncated = [...turn.text].slice(0, MAX_HISTORY_TURN_LENGTH).join("");
    let text: CoachMessage;
    try {
      text = sanitizeCoachText(truncated, MAX_HISTORY_TURN_LENGTH);
    } catch {
      // An empty or control-character turn is dropped, not refused: the learner can see their
      // conversation on screen and a single unusable entry must not break the next question.
      continue;
    }
    kept.push({ role: turn.role, text });
  }
  return kept;
}
