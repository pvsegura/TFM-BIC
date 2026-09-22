import {
  changeVocabularyStatus,
  createVocabularyCategoryId,
  createVocabularyItemId,
  saveVocabularyItem,
  type ContentCatalog,
  type LanguageId,
  type StoredVocabularyStatus,
  type UserVocabularyEntry,
  type VocabularyCategory,
  type VocabularyCategoryId,
  type VocabularyItem,
  type VocabularyItemId,
} from "@tfm-bic/domain";
import { makeVocabularyCategory, makeVocabularyItem } from "@tfm-bic/domain/testing";

import { makeSampleCatalog } from "../../content/test-support/fakes.js";
import type { VocabularyEventPublisher } from "../ports/vocabulary-event-publisher.js";
import type { VocabularyRepository } from "../ports/vocabulary-repository.js";
import type { UserVocabularyRepository } from "../ports/user-vocabulary-repository.js";

/** In-memory `VocabularyRepository` for application and HTTP-layer tests. Like the real
 * adapter it returns categories and entries of every status, in the order given (deliberately
 * unsorted), so tests prove the use cases do the filtering and ordering. Test-only. */
export class FakeVocabularyRepository implements VocabularyRepository {
  categories: VocabularyCategory[];
  items: VocabularyItem[];

  constructor(
    categories: readonly VocabularyCategory[] = [],
    items: readonly VocabularyItem[] = [],
  ) {
    this.categories = [...categories];
    this.items = [...items];
  }

  listCategories(languageId: LanguageId): Promise<readonly VocabularyCategory[]> {
    return Promise.resolve(this.categories.filter((c) => c.languageId === languageId));
  }

  findCategory(
    languageId: LanguageId,
    categoryId: VocabularyCategoryId,
  ): Promise<VocabularyCategory | null> {
    return Promise.resolve(
      this.categories.find((c) => c.languageId === languageId && c.id === categoryId) ?? null,
    );
  }

  listItems(languageId: LanguageId): Promise<readonly VocabularyItem[]> {
    return Promise.resolve(this.items.filter((item) => item.languageId === languageId));
  }

  findItem(vocabularyItemId: VocabularyItemId): Promise<VocabularyItem | null> {
    return Promise.resolve(this.items.find((item) => item.id === vocabularyItemId) ?? null);
  }
}

/** In-memory `UserVocabularyRepository`. Applies the same domain transition rules the real
 * adapter implements in SQL (packages/data has its own tests against a real Postgres), and
 * counts calls so a test can prove a read never wrote and a list needed one lookup rather than
 * one per entry. Test-only. */
export class FakeUserVocabularyRepository implements UserVocabularyRepository {
  readonly records: UserVocabularyEntry[] = [];
  writeCalls = 0;
  batchLookups = 0;

  findByUserAndItem(
    userId: string,
    vocabularyItemId: VocabularyItemId,
  ): Promise<UserVocabularyEntry | null> {
    return Promise.resolve(this.find(userId, vocabularyItemId));
  }

  findByUserAndItems(
    userId: string,
    vocabularyItemIds: readonly VocabularyItemId[],
  ): Promise<readonly UserVocabularyEntry[]> {
    this.batchLookups += 1;
    return Promise.resolve(
      this.records.filter(
        (r) => r.userId === userId && vocabularyItemIds.includes(r.vocabularyItemId),
      ),
    );
  }

  listByUser(userId: string): Promise<readonly UserVocabularyEntry[]> {
    this.batchLookups += 1;
    return Promise.resolve(this.records.filter((r) => r.userId === userId));
  }

  save(
    userId: string,
    vocabularyItemId: VocabularyItemId,
    now: Date,
  ): Promise<UserVocabularyEntry> {
    this.writeCalls += 1;
    return Promise.resolve(
      this.put(
        saveVocabularyItem(this.find(userId, vocabularyItemId), userId, vocabularyItemId, now),
      ),
    );
  }

  changeStatus(
    userId: string,
    vocabularyItemId: VocabularyItemId,
    target: StoredVocabularyStatus,
    now: Date,
  ): Promise<UserVocabularyEntry> {
    this.writeCalls += 1;
    const { entry } = changeVocabularyStatus(
      this.find(userId, vocabularyItemId),
      userId,
      vocabularyItemId,
      target,
      now,
    );
    return Promise.resolve(this.put(entry));
  }

  remove(userId: string, vocabularyItemId: VocabularyItemId): Promise<void> {
    this.writeCalls += 1;
    const index = this.records.findIndex(
      (r) => r.userId === userId && r.vocabularyItemId === vocabularyItemId,
    );
    if (index !== -1) {
      this.records.splice(index, 1);
    }
    return Promise.resolve();
  }

  /** Puts a record in place directly, without going through a use case. */
  seed(entry: UserVocabularyEntry): UserVocabularyEntry {
    return this.put(entry);
  }

  private find(userId: string, vocabularyItemId: VocabularyItemId): UserVocabularyEntry | null {
    return (
      this.records.find((r) => r.userId === userId && r.vocabularyItemId === vocabularyItemId) ??
      null
    );
  }

  private put(entry: UserVocabularyEntry): UserVocabularyEntry {
    const index = this.records.findIndex(
      (r) => r.userId === entry.userId && r.vocabularyItemId === entry.vocabularyItemId,
    );
    if (index === -1) {
      this.records.push(entry);
    } else {
      this.records[index] = entry;
    }
    return entry;
  }
}

/** Records every event handed to it; never throws. Test-only stand-in for a real listener. */
export class FakeVocabularyEventPublisher implements VocabularyEventPublisher {
  readonly events: Parameters<VocabularyEventPublisher["publish"]>[0][] = [];

  publish(event: Parameters<VocabularyEventPublisher["publish"]>[0]): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

const GREETINGS = createVocabularyCategoryId("greetings");
const FOOD = createVocabularyCategoryId("food");
const DRAFT_TOPIC = createVocabularyCategoryId("draft-topic");

/**
 * A small realistic vocabulary catalog over `makeSampleCatalog()`'s languages (`pl` and the
 * fictional `xx`): two published categories for `pl` (with a draft entry, an entry with no level
 * and one hidden behind a draft category mixed in, to prove the use cases filter) and one category
 * for `xx`, so extensibility is proved the same way M5-M7 prove it.
 */
export function makeVocabularyCatalog(): ContentCatalog {
  const catalog = makeSampleCatalog();
  const [pl, xx] = catalog.languages;
  const plId = pl!.code;
  const xxId = xx!.code;

  const categories: VocabularyCategory[] = [
    makeVocabularyCategory({ id: GREETINGS, languageId: plId, order: 10 }),
    makeVocabularyCategory({ id: FOOD, languageId: plId, order: 20 }),
    makeVocabularyCategory({ id: DRAFT_TOPIC, languageId: plId, order: 30, status: "draft" }),
    makeVocabularyCategory({ id: GREETINGS, languageId: xxId, order: 10 }),
  ];

  const items: VocabularyItem[] = [
    makeVocabularyItem({
      id: createVocabularyItemId("pl-dom"),
      languageId: plId,
      categoryId: GREETINGS,
      order: 10,
    }),
    makeVocabularyItem({
      id: createVocabularyItemId("pl-kot"),
      languageId: plId,
      categoryId: GREETINGS,
      order: 20,
      lemma: "kot",
      translation: "cat",
      plural: undefined,
      example: undefined,
    }),
    makeVocabularyItem({
      id: createVocabularyItemId("pl-chleb"),
      languageId: plId,
      categoryId: FOOD,
      order: 10,
      lemma: "chleb",
      translation: "bread",
      levelId: undefined,
      plural: undefined,
      example: undefined,
    }),
    makeVocabularyItem({
      id: createVocabularyItemId("pl-draft-word"),
      languageId: plId,
      categoryId: GREETINGS,
      order: 30,
      status: "draft",
      lemma: "szkic",
      translation: "draft",
      plural: undefined,
      example: undefined,
    }),
    makeVocabularyItem({
      id: createVocabularyItemId("pl-hidden"),
      languageId: plId,
      categoryId: DRAFT_TOPIC,
      order: 10,
      status: "published",
      lemma: "ukryty",
      translation: "hidden",
      plural: undefined,
      example: undefined,
    }),
    makeVocabularyItem({
      id: createVocabularyItemId("xx-word"),
      languageId: xxId,
      categoryId: GREETINGS,
      order: 10,
      lemma: "xx-word",
      translation: "a word",
      plural: undefined,
      example: undefined,
    }),
  ];

  return { ...catalog, vocabularyCategories: categories, vocabulary: items };
}
