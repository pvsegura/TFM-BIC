import {
  phoneticProgressStatusOf,
  type LanguageId,
  type LevelId,
  type PhoneticProgressStatus,
  type PhoneticRepresentationId,
  type PhoneticTopicId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import type { PhoneticContentRepository } from "../ports/phonetic-content-repository.js";
import type { UserPhoneticProgressRepository } from "../ports/user-phonetic-progress-repository.js";
import {
  toPhoneticProgressView,
  type PhoneticUserProgressView,
} from "../phonetic-progress-view.js";
import { queryVisiblePhonetics, type PhoneticQueryEntry } from "../query-phonetics.js";

export interface ListPhoneticsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  languageId: LanguageId;
  levelId?: LevelId | undefined;
  topicId?: PhoneticTopicId | undefined;
  status?: PhoneticProgressStatus | undefined;
  limit: number;
  after?: PhoneticRepresentationId | undefined;
}

export interface PhoneticListEntry {
  representation: PhoneticQueryEntry["representation"];
  topic: { id: PhoneticTopicId; title: string } | undefined;
  progress: PhoneticUserProgressView;
}

export interface PhoneticListResult {
  items: PhoneticListEntry[];
  total: number;
  nextAfter: PhoneticRepresentationId | null;
}

/**
 * The phonetics of one language a student can browse, filtered by topic/level/progress, one page
 * at a time, each representation with the student's own progress (`not_started` when untouched).
 * Visibility, filtering, sorting and paging are `queryVisiblePhonetics`'s job; this adds only the
 * `status` filter, which compares against the *derived* view status (`not_started` included).
 */
export class ListPhoneticsUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly phonetics: PhoneticContentRepository,
    private readonly userProgress: UserPhoneticProgressRepository,
  ) {}

  async execute(input: ListPhoneticsInput): Promise<PhoneticListResult> {
    const result = await queryVisiblePhonetics(
      this.contentRepository,
      this.phonetics,
      this.userProgress,
      input.userId,
      input,
      (_representation, progress) =>
        input.status === undefined || phoneticProgressStatusOf(progress) === input.status,
    );

    return {
      items: result.entries.map((entry) => ({
        representation: entry.representation,
        topic: entry.topic ? { id: entry.topic.id, title: entry.topic.title } : undefined,
        progress: toPhoneticProgressView(entry.progress),
      })),
      total: result.total,
      nextAfter: result.nextAfter,
    };
  }
}
