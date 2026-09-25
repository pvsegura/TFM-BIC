export type InvalidSpeechTextReason = "empty" | "too_long" | "control_characters";

/** Text that cannot be turned into speech. Carries a fixed reason code, never the text itself — it may be long, and it is not needed to explain the failure. */
export class InvalidSpeechTextError extends Error {
  constructor(readonly reason: InvalidSpeechTextReason) {
    super(`The text cannot be converted to speech (${reason}).`);
    this.name = "InvalidSpeechTextError";
  }
}
