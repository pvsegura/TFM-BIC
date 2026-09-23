import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import { InvalidPhoneticTopicIdError } from "./errors/invalid-phonetic-topic-id.error.js";

/**
 * The identifier of a phonetic topic (a grouping such as `consonants` or `vowels`), for example
 * `consonants`. A topic is data, never code: nothing branches on a topic id, it only names a set
 * of representations.
 *
 * Unlike a representation id it is *not* language-prefixed. A topic is a shared grouping name
 * that each language scopes for itself (a language's `consonants` topic lives in that language's
 * folder), the same way `VocabularyCategoryId` works (ADR-022). It uses the same strict slug
 * rules, so it is safe in a URL, a file name and a query.
 */
export type PhoneticTopicId = Brand<string, "PhoneticTopicId">;

export function isValidPhoneticTopicId(value: string): boolean {
  return isValidContentId(value);
}

export function createPhoneticTopicId(value: string): PhoneticTopicId {
  if (!isValidPhoneticTopicId(value)) {
    throw new InvalidPhoneticTopicIdError(value);
  }
  return value as PhoneticTopicId;
}
