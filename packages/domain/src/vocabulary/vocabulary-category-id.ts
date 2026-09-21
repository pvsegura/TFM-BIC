import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import { InvalidVocabularyCategoryIdError } from "./errors/invalid-vocabulary-category-id.error.js";

/**
 * The identifier of a vocabulary category (topic), for example `food`. A category is data, never
 * code: nothing branches on a category id, it only names a set of entries.
 *
 * Unlike an item id it is *not* language-prefixed. A category is a shared topic name that each
 * language scopes for itself (a language's `food` set lives in that language's folder), so the
 * same slug can mean "the food words" in every language and a filter such as `?category=food`
 * always travels together with a language. It uses the same strict slug rules, so it is safe in a
 * URL, a file name and a query.
 */
export type VocabularyCategoryId = Brand<string, "VocabularyCategoryId">;

export function isValidVocabularyCategoryId(value: string): boolean {
  return isValidContentId(value);
}

export function createVocabularyCategoryId(value: string): VocabularyCategoryId {
  if (!isValidVocabularyCategoryId(value)) {
    throw new InvalidVocabularyCategoryIdError(value);
  }
  return value as VocabularyCategoryId;
}
