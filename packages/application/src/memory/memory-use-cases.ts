import {
  contentAccessFor,
  isDifficultCard,
  isPublished,
  VocabularyItemNotFoundError,
  type LanguageId,
  type RecallGrade,
  type VocabularyCategory,
  type VocabularyItem,
  type VocabularyItemId,
} from "@verbysia/domain";

import type { UserAccess } from "../commerce/access-policy.js";
import type { AccessPolicy } from "../commerce/access-policy.js";
import { isVisibleInCatalog } from "../content/is-visible-in-catalog.js";
import type { ContentRepository } from "../content/ports/content-repository.js";
import type { Clock } from "../ports/clock.js";
import type { VocabularyRepository } from "../vocabulary/ports/vocabulary-repository.js";
import type { MemoryCard, MemoryCardRepository } from "./ports.js";

/** New words introduced per session — enough to progress, few enough to keep reviews manageable. */
export const NEW_CARDS_PER_SESSION = 10;
export const MAX_SESSION_SIZE = 50;
/** A card counts as "consolidated" once its interval reaches three weeks. */
export const MATURE_INTERVAL_DAYS = 21;
const DAY_MS = 86_400_000;

export interface MemoryCardView {
  vocabularyItemId: VocabularyItemId;
  lemma: string;
  translation: string;
  note: string | null;
  partOfSpeech: string | null;
  gender: string | null;
  example: { text: string; translation: string } | null;
  categoryTitle: string;
  isNew: boolean;
  dueAt: Date | null;
  intervalDays: number;
  difficult: boolean;
}

export interface MemorySession {
  cards: MemoryCardView[];
  dueCount: number;
  newAvailable: number;
}

interface StudyableItem {
  item: VocabularyItem;
  category: VocabularyCategory;
}

/** The vocabulary of `languageId` this learner may study: visible, published and licensed. */
async function studyableItems(
  content: ContentRepository,
  vocabulary: VocabularyRepository,
  access: UserAccess,
  languageId: LanguageId,
): Promise<Map<VocabularyItemId, StudyableItem>> {
  const result = new Map<VocabularyItemId, StudyableItem>();
  if (!(await isVisibleInCatalog(content, { languageId }))) return result;

  const categories = new Map(
    (await vocabulary.listCategories(languageId))
      .filter((category) => isPublished(category))
      .map((category) => [category.id, category]),
  );
  for (const item of await vocabulary.listItems(languageId)) {
    const category = categories.get(item.categoryId);
    if (!category || !isPublished(item)) continue;
    if (!(await isVisibleInCatalog(content, item))) continue;
    if (!canStudy(access, category, item)) continue;
    result.set(item.id, { item, category });
  }
  return result;
}

function canStudy(access: UserAccess, category: VocabularyCategory, item: VocabularyItem): boolean {
  if (category.access === "free") return true;
  // An entry without a level cannot be matched to a course licence: Premium only.
  if (item.levelId === undefined) return access.premium;
  return access.canOpen(contentAccessFor(category.access, item.levelId));
}

function toView(entry: StudyableItem, card: MemoryCard | undefined): MemoryCardView {
  const { item, category } = entry;
  return {
    vocabularyItemId: item.id,
    lemma: item.lemma,
    translation: item.translation,
    note: item.note ?? null,
    partOfSpeech: item.partOfSpeech ?? null,
    gender: item.gender ?? null,
    example: item.example
      ? { text: item.example.text, translation: item.example.translation }
      : null,
    categoryTitle: category.title,
    isNew: card === undefined,
    dueAt: card?.dueAt ?? null,
    intervalDays: card?.intervalDays ?? 0,
    difficult: card ? isDifficultCard(card) : false,
  };
}

/**
 * The next study session: every due card first (most overdue first), then up to
 * {@link NEW_CARDS_PER_SESSION} words never studied, in course order. Nothing session-specific is
 * stored — each answer is saved as it is given — so an interrupted session resumes by simply
 * asking again: answered cards are no longer due.
 */
export class GetMemorySessionUseCase {
  constructor(
    private readonly content: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly cards: MemoryCardRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: string;
    languageId: LanguageId;
    limit: number;
  }): Promise<MemorySession> {
    const now = this.clock.now();
    const limit = Math.min(Math.max(1, input.limit), MAX_SESSION_SIZE);
    const access = await this.accessPolicy.forUser(input.userId);
    const items = await studyableItems(this.content, this.vocabulary, access, input.languageId);
    const cards = (await this.cards.listByUser(input.userId)).filter((card) =>
      items.has(card.vocabularyItemId),
    );
    const known = new Set(cards.map((card) => card.vocabularyItemId));

    const due = cards
      .filter((card) => card.dueAt <= now)
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const fresh = [...items.values()]
      .filter(({ item }) => !known.has(item.id))
      .sort((a, b) => a.category.order - b.category.order || a.item.order - b.item.order);

    const session: MemoryCardView[] = [];
    for (const card of due) {
      if (session.length >= limit) break;
      const entry = items.get(card.vocabularyItemId);
      if (entry) session.push(toView(entry, card));
    }
    for (const entry of fresh.slice(0, NEW_CARDS_PER_SESSION)) {
      if (session.length >= limit) break;
      session.push(toView(entry, undefined));
    }

    return { cards: session, dueCount: due.length, newAvailable: fresh.length };
  }
}

/** One answer. The entry must be one the learner may study; the user comes from the session. */
export class ReviewMemoryCardUseCase {
  constructor(
    private readonly content: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly cards: MemoryCardRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: string;
    vocabularyItemId: VocabularyItemId;
    grade: RecallGrade;
    clientReviewId: string;
    usedHint: boolean;
  }): Promise<{ card: MemoryCardView; duplicate: boolean }> {
    const item = await this.vocabulary.findItem(input.vocabularyItemId);
    if (!item || !isPublished(item) || !(await isVisibleInCatalog(this.content, item))) {
      throw new VocabularyItemNotFoundError(input.vocabularyItemId);
    }
    const category = await this.vocabulary.findCategory(item.languageId, item.categoryId);
    if (!category || !isPublished(category)) {
      throw new VocabularyItemNotFoundError(input.vocabularyItemId);
    }
    // A word the learner may not study is reported exactly like one that does not exist.
    const access = await this.accessPolicy.forUser(input.userId);
    if (!canStudy(access, category, item)) {
      throw new VocabularyItemNotFoundError(input.vocabularyItemId);
    }

    const { card, duplicate } = await this.cards.recordReview({
      userId: input.userId,
      vocabularyItemId: item.id,
      clientReviewId: input.clientReviewId,
      grade: input.grade,
      usedHint: input.usedHint,
      now: this.clock.now(),
    });
    return { card: toView({ item, category }, card), duplicate };
  }
}

export interface MemoryStats {
  totalCards: number;
  dueNow: number;
  learning: number;
  mature: number;
  difficult: number;
  newAvailable: number;
  reviewsToday: number;
  /** Share of reviews in the last 30 days not answered "again", 0–1; null without reviews. */
  retention30d: number | null;
  /** Consecutive days, ending today or yesterday, with at least one review. */
  streakDays: number;
  /** Cards falling due on each of the next 7 days (index 0 = within 24 h). */
  forecast: number[];
}

function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS);
}

export class GetMemoryStatsUseCase {
  constructor(
    private readonly content: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly cards: MemoryCardRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(input: { userId: string; languageId: LanguageId }): Promise<MemoryStats> {
    const now = this.clock.now();
    const access = await this.accessPolicy.forUser(input.userId);
    const items = await studyableItems(this.content, this.vocabulary, access, input.languageId);
    const cards = (await this.cards.listByUser(input.userId)).filter((card) =>
      items.has(card.vocabularyItemId),
    );
    const reviews = await this.cards.listReviewsSince(
      input.userId,
      new Date(now.getTime() - 30 * DAY_MS),
    );

    const today = utcDay(now);
    const reviewDays = new Set(reviews.map((review) => utcDay(review.reviewedAt)));
    let streakDays = 0;
    let day = reviewDays.has(today) ? today : today - 1;
    while (reviewDays.has(day)) {
      streakDays += 1;
      day -= 1;
    }

    const forecast = Array.from({ length: 7 }, (_, index) => {
      const from = now.getTime() + index * DAY_MS;
      const to = from + DAY_MS;
      return cards.filter((card) => card.dueAt.getTime() > from && card.dueAt.getTime() <= to)
        .length;
    });

    return {
      totalCards: cards.length,
      dueNow: cards.filter((card) => card.dueAt <= now).length,
      learning: cards.filter((card) => card.intervalDays < MATURE_INTERVAL_DAYS).length,
      mature: cards.filter((card) => card.intervalDays >= MATURE_INTERVAL_DAYS).length,
      difficult: cards.filter((card) => isDifficultCard(card)).length,
      newAvailable: items.size - cards.length,
      reviewsToday: reviews.filter((review) => utcDay(review.reviewedAt) === today).length,
      retention30d:
        reviews.length === 0
          ? null
          : reviews.filter((review) => review.grade !== "again").length / reviews.length,
      streakDays,
      forecast,
    };
  }
}
