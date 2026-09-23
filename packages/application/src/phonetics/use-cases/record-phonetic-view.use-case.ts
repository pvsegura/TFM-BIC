import type { PhoneticRepresentationId } from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { Clock } from "../../ports/clock.js";
import { findVisiblePhoneticRepresentation } from "../find-visible-phonetic-representation.js";
import type { PhoneticContentRepository } from "../ports/phonetic-content-repository.js";
import type { UserPhoneticProgressRepository } from "../ports/user-phonetic-progress-repository.js";
import {
  toPhoneticProgressView,
  type PhoneticUserProgressView,
} from "../phonetic-progress-view.js";

export interface RecordPhoneticViewInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  phoneticRepresentationId: PhoneticRepresentationId;
}

/**
 * The student opens a representation. The representation must be one they can see. Safe to
 * repeat: viewing again never regresses a `practiced`/`completed` representation, only refreshes
 * when it was last seen (the repository's `recordView` is the atomic, race-free upsert).
 */
export class RecordPhoneticViewUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly phonetics: PhoneticContentRepository,
    private readonly userProgress: UserPhoneticProgressRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RecordPhoneticViewInput): Promise<PhoneticUserProgressView> {
    const representation = await findVisiblePhoneticRepresentation(
      this.contentRepository,
      this.phonetics,
      input.phoneticRepresentationId,
    );
    const progress = await this.userProgress.recordView(
      input.userId,
      representation.id,
      this.clock.now(),
    );
    return toPhoneticProgressView(progress);
  }
}
