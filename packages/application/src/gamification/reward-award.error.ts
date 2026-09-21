import type { RewardReason } from "@tfm-bic/domain";

/**
 * A reward could not be stored. Everything the same request wrote was rolled back, so nothing
 * is half done, and repeating the request is safe (and is how the reward is eventually given).
 *
 * It names what was being rewarded — the reason and the source, never the student — so a log
 * line is enough to diagnose it, and keeps the underlying error as `cause`. Its message is
 * fixed and safe; the HTTP layer answers with a generic 500 and never repeats it.
 */
export class RewardAwardError extends Error {
  constructor(
    readonly reason: RewardReason,
    readonly sourceId: string,
    cause: unknown,
  ) {
    super("A reward could not be recorded.", { cause });
    this.name = "RewardAwardError";
  }
}
