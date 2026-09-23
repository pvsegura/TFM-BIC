import type {
  PhoneticRepresentation,
  PhoneticRepresentationId,
  PhoneticTopicId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import { findVisiblePhoneticRepresentation } from "../find-visible-phonetic-representation.js";
import type { PhoneticContentRepository } from "../ports/phonetic-content-repository.js";
import type { UserPhoneticProgressRepository } from "../ports/user-phonetic-progress-repository.js";
import {
  toPhoneticProgressView,
  type PhoneticUserProgressView,
} from "../phonetic-progress-view.js";

export interface GetPhoneticRepresentationInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  phoneticRepresentationId: PhoneticRepresentationId;
}

export interface PhoneticRepresentationDetail {
  representation: PhoneticRepresentation;
  /** `undefined` when the representation names no topic. */
  topic: { id: PhoneticTopicId; title: string } | undefined;
  progress: PhoneticUserProgressView;
}

/**
 * One visible phonetic representation, with the student's own progress for it. Opening a
 * representation is a read: it never creates or changes a record (recording a view is a separate,
 * explicit action — `RecordPhoneticViewUseCase`). The topic's title is looked up so the caller
 * needs no second request; visibility is `findVisiblePhoneticRepresentation`'s rule, restated
 * nowhere.
 */
export class GetPhoneticRepresentationUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly phonetics: PhoneticContentRepository,
    private readonly userProgress: UserPhoneticProgressRepository,
  ) {}

  async execute(input: GetPhoneticRepresentationInput): Promise<PhoneticRepresentationDetail> {
    const representation = await findVisiblePhoneticRepresentation(
      this.contentRepository,
      this.phonetics,
      input.phoneticRepresentationId,
    );
    const topic =
      representation.topicId !== undefined
        ? await this.phonetics.findTopic(representation.languageId, representation.topicId)
        : null;
    const progress = await this.userProgress.findByUserAndRepresentation(
      input.userId,
      representation.id,
    );

    return {
      representation,
      // Visible under findVisiblePhoneticRepresentation only when its topic (if any) is
      // published, so a named topic always exists.
      topic: representation.topicId
        ? { id: representation.topicId, title: topic?.title ?? "" }
        : undefined,
      progress: toPhoneticProgressView(progress),
    };
  }
}
