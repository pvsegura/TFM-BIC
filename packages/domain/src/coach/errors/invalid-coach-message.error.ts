/** Why a learner's message cannot be handed to the coach. The rejected text is never in the message. */
export type InvalidCoachMessageReason = "empty" | "too_long" | "control_characters";

export class InvalidCoachMessageError extends Error {
  constructor(readonly reason: InvalidCoachMessageReason) {
    super(`The message cannot be sent to the AI Coach (${reason}).`);
    this.name = "InvalidCoachMessageError";
  }
}
