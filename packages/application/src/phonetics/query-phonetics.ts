import {
  isLevelSelectable,
  isPublished,
  LanguageNotFoundError,
  LevelNotAvailableError,
  type LanguageId,
  type LevelId,
  type PhoneticRepresentation,
  type PhoneticRepresentationId,
  type PhoneticTopic,
  type PhoneticTopicId,
  type UserPhoneticProgress,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { PhoneticContentRepository } from "./ports/phonetic-content-repository.js";
import type { UserPhoneticProgressRepository } from "./ports/user-phonetic-progress-repository.js";

export interface PhoneticQueryFilters {
  languageId: LanguageId;
  levelId?: LevelId | undefined;
  topicId?: PhoneticTopicId | undefined;
  limit: number;
  /** The id of the last representation of the previous page. */
  after?: PhoneticRepresentationId | undefined;
}

export interface PhoneticQueryEntry {
  representation: PhoneticRepresentation;
  /** `null` when the representation names no topic. */
  topic: PhoneticTopic | null;
  progress: UserPhoneticProgress | null;
}

export interface PhoneticQueryResult {
  entries: PhoneticQueryEntry[];
  /** How many representations match the filters in all, not just on this page. */
  total: number;
  nextAfter: PhoneticRepresentationId | null;
}

/**
 * The engine behind listing phonetics: one visible, filtered, deterministically ordered (topic
 * order, then representation order, ties by id — a representation with no topic sorts after every
 * topic's own) list, with the student's own progress batched in one lookup — never one query per
 * representation. `extraFilter` is where a caller adds what only it needs (a progress status);
 * everything else — visibility, the language/level/topic filters, sorting, the cursor — is shared.
 *
 * Pagination slices an already-filtered, already-sorted in-memory list (like the rest of the
 * content catalog: a validated file tree, not a growing table) rather than paging in SQL; `after`
 * not found in the current result starts from the beginning rather than failing, since content can
 * change between two requests.
 */
export async function queryVisiblePhonetics(
  contentRepository: ContentRepository,
  phonetics: PhoneticContentRepository,
  userProgress: UserPhoneticProgressRepository,
  userId: string,
  filters: PhoneticQueryFilters,
  extraFilter: (
    representation: PhoneticRepresentation,
    progress: UserPhoneticProgress | null,
  ) => boolean = () => true,
): Promise<PhoneticQueryResult> {
  const language = await contentRepository.findLanguage(filters.languageId);
  if (!language?.isActive) {
    throw new LanguageNotFoundError(filters.languageId);
  }

  const declaredLevels = await contentRepository.listLanguageLevels(filters.languageId);
  if (filters.levelId !== undefined) {
    const declared = declaredLevels.find((candidate) => candidate.levelId === filters.levelId);
    if (!declared || !isLevelSelectable(declared)) {
      throw new LevelNotAvailableError(filters.languageId, filters.levelId);
    }
  }
  const availableLevels = new Set(
    declaredLevels.filter(isLevelSelectable).map((entry) => entry.levelId),
  );

  const topicById = new Map<PhoneticTopicId, PhoneticTopic>(
    (await phonetics.listTopics(filters.languageId))
      .filter(isPublished)
      .map((topic) => [topic.id, topic]),
  );

  const allRepresentations = await phonetics.listRepresentations(filters.languageId);
  const visible = allRepresentations.filter((representation) => {
    if (!isPublished(representation)) {
      return false;
    }
    if (representation.topicId !== undefined && !topicById.has(representation.topicId)) {
      return false;
    }
    if (filters.topicId !== undefined && representation.topicId !== filters.topicId) {
      return false;
    }
    if (filters.levelId !== undefined) {
      if (representation.levelId !== filters.levelId) {
        return false;
      }
    } else if (
      representation.levelId !== undefined &&
      !availableLevels.has(representation.levelId)
    ) {
      return false;
    }
    return true;
  });

  const topicOrder = (representation: PhoneticRepresentation): number =>
    representation.topicId !== undefined
      ? (topicById.get(representation.topicId)?.order ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;

  const sorted = [...visible].sort((a, b) => {
    const orderA = topicOrder(a);
    const orderB = topicOrder(b);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
  });

  const progressRecords = await userProgress.findByUserAndRepresentations(
    userId,
    sorted.map((representation) => representation.id),
  );
  const progressByRepresentation = new Map(
    progressRecords.map((progress) => [progress.phoneticRepresentationId, progress]),
  );

  const matched: PhoneticQueryEntry[] = sorted
    .filter((representation) =>
      extraFilter(representation, progressByRepresentation.get(representation.id) ?? null),
    )
    .map((representation) => ({
      representation,
      topic:
        representation.topicId !== undefined
          ? (topicById.get(representation.topicId) ?? null)
          : null,
      progress: progressByRepresentation.get(representation.id) ?? null,
    }));

  const startIndex =
    filters.after === undefined
      ? 0
      : (() => {
          const index = matched.findIndex((entry) => entry.representation.id === filters.after);
          return index === -1 ? 0 : index + 1;
        })();

  const page = matched.slice(startIndex, startIndex + filters.limit);
  const lastOfPage = page.at(-1);
  const hasMore = startIndex + filters.limit < matched.length;

  return {
    entries: page,
    total: matched.length,
    nextAfter: hasMore && lastOfPage ? lastOfPage.representation.id : null,
  };
}
