import {
  isLevelSelectable,
  isPublished,
  PhoneticRepresentationNotFoundError,
  type PhoneticRepresentation,
  type PhoneticRepresentationId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { PhoneticContentRepository } from "./ports/phonetic-content-repository.js";

/**
 * The one place that decides whether a student may see a phonetic representation. Reuses the M5
 * language/level visibility rule (active language; a level, when the representation declares one,
 * that is `available`) and adds phonetics' own: the representation must be `published`, and when
 * it names a topic, that topic must be `published` too. Every reason it is not visible is the same
 * `PhoneticRepresentationNotFoundError`, so a caller cannot tell a draft from a typo.
 *
 * Unlike vocabulary, a representation's topic is optional: a representation with no topic skips
 * the topic check entirely (there is nothing to hide it behind).
 */
export async function findVisiblePhoneticRepresentation(
  contentRepository: ContentRepository,
  phonetics: PhoneticContentRepository,
  phoneticRepresentationId: PhoneticRepresentationId,
): Promise<PhoneticRepresentation> {
  const representation = await phonetics.findRepresentation(phoneticRepresentationId);
  if (!representation || !isPublished(representation)) {
    throw new PhoneticRepresentationNotFoundError(phoneticRepresentationId);
  }

  const language = await contentRepository.findLanguage(representation.languageId);
  if (!language?.isActive) {
    throw new PhoneticRepresentationNotFoundError(phoneticRepresentationId);
  }

  if (representation.levelId !== undefined) {
    const declared = await contentRepository.listLanguageLevels(representation.languageId);
    const entry = declared.find((candidate) => candidate.levelId === representation.levelId);
    if (!entry || !isLevelSelectable(entry)) {
      throw new PhoneticRepresentationNotFoundError(phoneticRepresentationId);
    }
  }

  if (representation.topicId !== undefined) {
    const topic = await phonetics.findTopic(representation.languageId, representation.topicId);
    if (!topic || !isPublished(topic)) {
      throw new PhoneticRepresentationNotFoundError(phoneticRepresentationId);
    }
  }

  return representation;
}
