import type { Brand } from "@tfm-bic/shared";

import { InvalidCoachMessageError } from "./errors/invalid-coach-message.error.js";

/**
 * The hard ceiling for one learner message, in characters. A deployment may configure a lower
 * limit, never a higher one: every character is billed as input, and a coaching question is short.
 * A learner who needs more room is asking two questions.
 */
export const COACH_MESSAGE_MAX_LENGTH = 1_000;

/**
 * Text a learner typed, safe to hand to the agent provider: trimmed, non-empty, within the limit,
 * free of control characters.
 *
 * Unlike `SpeechText` (M12) this keeps line breaks — a learner may paste a two-line sentence to
 * ask about — and unlike a name (M4) it is never case-folded. It is **not** sanitised for meaning:
 * the message is untrusted input that the provider is told to treat as a learner's words, and the
 * security boundary is the backend's tool authorization, never the text's shape (ADR-034).
 */
export type CoachMessage = Brand<string, "CoachMessage">;

// C0 controls and DEL, except the line feed and tab that survive normalisation below.
// eslint-disable-next-line no-control-regex -- matching control characters is the point.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b-\u001f\u007f]/;

/**
 * Normalisation and the safety checks, against an explicit limit and nothing else.
 *
 * Separate from `createCoachMessage` because a replayed *coach* turn may legitimately be longer
 * than anything a learner is allowed to type (`MAX_HISTORY_TURN_LENGTH` > `COACH_MESSAGE_MAX_LENGTH`),
 * and the learner's ceiling must not quietly discard the coach's own earlier answers.
 */
export function sanitizeCoachText(raw: string, limit: number): CoachMessage {
  // CRLF and lone CR become LF so the same typing produces the same message on every platform;
  // runs of blank lines collapse, so padding cannot be used to inflate the request.
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length === 0) {
    throw new InvalidCoachMessageError("empty");
  }
  if (CONTROL_CHARACTERS.test(text)) {
    throw new InvalidCoachMessageError("control_characters");
  }
  // Characters (code points), not UTF-16 units — a learner's "😀" is one character.
  if ([...text].length > limit) {
    throw new InvalidCoachMessageError("too_long");
  }
  return text as CoachMessage;
}

/** What a learner may send: never more than the domain's own ceiling, whatever a caller asks for. */
export function createCoachMessage(
  raw: string,
  maxLength = COACH_MESSAGE_MAX_LENGTH,
): CoachMessage {
  return sanitizeCoachText(raw, Math.min(maxLength, COACH_MESSAGE_MAX_LENGTH));
}
