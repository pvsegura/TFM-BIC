import { isValidContentId } from "../content/content-id.js";
import { InvalidRewardSourceError } from "./errors/invalid-reward-source.error.js";

/**
 * The identity of what a reward is for: an exercise id, a lesson id or an achievement key.
 * All three are stable, language-neutral slugs, so they share one strict pattern (the
 * content-id rules), which keeps a source id safe in a URL, a log line and a database
 * column and unable to carry markup or SQL.
 */
export function isValidRewardSourceId(value: string): boolean {
  return isValidContentId(value);
}

export function assertRewardSourceId(value: string): string {
  if (!isValidRewardSourceId(value)) {
    throw new InvalidRewardSourceError(value);
  }
  return value;
}
