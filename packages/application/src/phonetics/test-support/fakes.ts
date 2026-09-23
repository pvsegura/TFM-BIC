import {
  completePhonetic,
  createPhoneticRepresentationId,
  createPhoneticTopicId,
  recordPhoneticPractice,
  recordPhoneticView,
  type ContentCatalog,
  type LanguageId,
  type PhoneticRepresentation,
  type PhoneticRepresentationId,
  type PhoneticTopic,
  type PhoneticTopicId,
  type UserPhoneticProgress,
} from "@tfm-bic/domain";
import { makePhoneticRepresentation, makePhoneticTopic } from "@tfm-bic/domain/testing";

import { makeSampleCatalog } from "../../content/test-support/fakes.js";
import type { PhoneticContentRepository } from "../ports/phonetic-content-repository.js";
import type { UserPhoneticProgressRepository } from "../ports/user-phonetic-progress-repository.js";

/** In-memory `PhoneticContentRepository` for application and HTTP-layer tests. Like the real
 * adapter it returns topics and representations of every status, in the order given (deliberately
 * unsorted), so tests prove the use cases do the filtering and ordering. Test-only. */
export class FakePhoneticContentRepository implements PhoneticContentRepository {
  topics: PhoneticTopic[];
  representations: PhoneticRepresentation[];

  constructor(
    topics: readonly PhoneticTopic[] = [],
    representations: readonly PhoneticRepresentation[] = [],
  ) {
    this.topics = [...topics];
    this.representations = [...representations];
  }

  listTopics(languageId: LanguageId): Promise<readonly PhoneticTopic[]> {
    return Promise.resolve(this.topics.filter((t) => t.languageId === languageId));
  }

  findTopic(languageId: LanguageId, topicId: PhoneticTopicId): Promise<PhoneticTopic | null> {
    return Promise.resolve(
      this.topics.find((t) => t.languageId === languageId && t.id === topicId) ?? null,
    );
  }

  listRepresentations(languageId: LanguageId): Promise<readonly PhoneticRepresentation[]> {
    return Promise.resolve(this.representations.filter((r) => r.languageId === languageId));
  }

  findRepresentation(
    phoneticRepresentationId: PhoneticRepresentationId,
  ): Promise<PhoneticRepresentation | null> {
    return Promise.resolve(
      this.representations.find((r) => r.id === phoneticRepresentationId) ?? null,
    );
  }
}

/** In-memory `UserPhoneticProgressRepository`. Applies the same domain transition rules the real
 * adapter implements in SQL (packages/data has its own tests against a real Postgres), and counts
 * calls so a test can prove a read never wrote and a list needed one lookup rather than one per
 * representation. Test-only. */
export class FakeUserPhoneticProgressRepository implements UserPhoneticProgressRepository {
  readonly records: UserPhoneticProgress[] = [];
  writeCalls = 0;
  batchLookups = 0;

  findByUserAndRepresentation(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
  ): Promise<UserPhoneticProgress | null> {
    return Promise.resolve(this.find(userId, phoneticRepresentationId));
  }

  findByUserAndRepresentations(
    userId: string,
    phoneticRepresentationIds: readonly PhoneticRepresentationId[],
  ): Promise<readonly UserPhoneticProgress[]> {
    this.batchLookups += 1;
    return Promise.resolve(
      this.records.filter(
        (r) =>
          r.userId === userId && phoneticRepresentationIds.includes(r.phoneticRepresentationId),
      ),
    );
  }

  listByUser(userId: string): Promise<readonly UserPhoneticProgress[]> {
    this.batchLookups += 1;
    return Promise.resolve(this.records.filter((r) => r.userId === userId));
  }

  recordView(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress> {
    this.writeCalls += 1;
    return Promise.resolve(
      this.put(
        recordPhoneticView(
          this.find(userId, phoneticRepresentationId),
          userId,
          phoneticRepresentationId,
          now,
        ),
      ),
    );
  }

  recordPractice(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress> {
    this.writeCalls += 1;
    return Promise.resolve(
      this.put(
        recordPhoneticPractice(
          this.find(userId, phoneticRepresentationId),
          userId,
          phoneticRepresentationId,
          now,
        ),
      ),
    );
  }

  complete(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
    now: Date,
  ): Promise<UserPhoneticProgress> {
    this.writeCalls += 1;
    return Promise.resolve(
      this.put(
        completePhonetic(
          this.find(userId, phoneticRepresentationId),
          userId,
          phoneticRepresentationId,
          now,
        ),
      ),
    );
  }

  /** Puts a record in place directly, without going through a use case. */
  seed(progress: UserPhoneticProgress): UserPhoneticProgress {
    return this.put(progress);
  }

  private find(
    userId: string,
    phoneticRepresentationId: PhoneticRepresentationId,
  ): UserPhoneticProgress | null {
    return (
      this.records.find(
        (r) => r.userId === userId && r.phoneticRepresentationId === phoneticRepresentationId,
      ) ?? null
    );
  }

  private put(progress: UserPhoneticProgress): UserPhoneticProgress {
    const index = this.records.findIndex(
      (r) =>
        r.userId === progress.userId &&
        r.phoneticRepresentationId === progress.phoneticRepresentationId,
    );
    if (index === -1) {
      this.records.push(progress);
    } else {
      this.records[index] = progress;
    }
    return progress;
  }
}

const CONSONANTS = createPhoneticTopicId("consonants");
const VOWELS = createPhoneticTopicId("vowels");
const DRAFT_TOPIC = createPhoneticTopicId("draft-topic");

/**
 * A small realistic phonetics catalog over `makeSampleCatalog()`'s languages (`pl` and the
 * fictional `xx`): two published topics for `pl` (with a draft representation, a representation
 * with no level, one with no topic at all, and one hidden behind a draft topic mixed in, to prove
 * the use cases filter) and one topic for `xx`, so extensibility is proved the same way M5-M9
 * prove it.
 */
export function makePhoneticsCatalog(): ContentCatalog {
  const catalog = makeSampleCatalog();
  const [pl, xx] = catalog.languages;
  const plId = pl!.code;
  const xxId = xx!.code;

  const topics: PhoneticTopic[] = [
    makePhoneticTopic({ id: CONSONANTS, languageId: plId, order: 10 }),
    makePhoneticTopic({ id: VOWELS, languageId: plId, order: 20 }),
    makePhoneticTopic({ id: DRAFT_TOPIC, languageId: plId, order: 30, status: "draft" }),
    makePhoneticTopic({ id: CONSONANTS, languageId: xxId, order: 10 }),
  ];

  const representations: PhoneticRepresentation[] = [
    makePhoneticRepresentation({
      id: createPhoneticRepresentationId("pl-ipa-ts"),
      languageId: plId,
      topicId: CONSONANTS,
      order: 10,
    }),
    makePhoneticRepresentation({
      id: createPhoneticRepresentationId("pl-ipa-a"),
      languageId: plId,
      topicId: VOWELS,
      order: 10,
      ipa: "a",
      levelId: undefined,
      exampleWords: undefined,
    }),
    makePhoneticRepresentation({
      id: createPhoneticRepresentationId("pl-ipa-no-topic"),
      languageId: plId,
      topicId: undefined,
      order: 20,
      ipa: "e",
      levelId: undefined,
      exampleWords: undefined,
    }),
    makePhoneticRepresentation({
      id: createPhoneticRepresentationId("pl-ipa-draft"),
      languageId: plId,
      topicId: CONSONANTS,
      order: 20,
      status: "draft",
      ipa: "d",
      levelId: undefined,
      exampleWords: undefined,
    }),
    makePhoneticRepresentation({
      id: createPhoneticRepresentationId("pl-ipa-hidden"),
      languageId: plId,
      topicId: DRAFT_TOPIC,
      order: 10,
      status: "published",
      ipa: "h",
      levelId: undefined,
      exampleWords: undefined,
    }),
    makePhoneticRepresentation({
      id: createPhoneticRepresentationId("xx-ipa-one"),
      languageId: xxId,
      topicId: CONSONANTS,
      order: 10,
      ipa: "x",
      levelId: undefined,
      exampleWords: undefined,
    }),
  ];

  return { ...catalog, phoneticTopics: topics, phonetics: representations };
}
