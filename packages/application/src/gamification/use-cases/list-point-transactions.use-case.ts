import type { AchievementRegistry } from "@tfm-bic/domain";

import type { AchievementTexts } from "../achievement-texts.js";
import type { GamificationRepository } from "../ports/gamification-repository.js";
import { toPointTransactionView, type PointTransactionView } from "../views.js";

export interface ListPointTransactionsInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  locale: string;
  limit: number;
  /** The id of the last transaction of the previous page. */
  before?: number;
}

export interface PointTransactionsPage {
  transactions: PointTransactionView[];
  nextBefore: number | null;
}

/**
 * The student's points history, newest first, one page at a time — the answer to "why do I have
 * these points?". Keyset paging (a cursor, not an offset) keeps a page's cost independent of how
 * deep it is and stable while new rewards arrive. Only the student's own transactions are ever
 * read.
 */
export class ListPointTransactionsUseCase {
  constructor(
    private readonly repository: GamificationRepository,
    private readonly registry: AchievementRegistry,
    private readonly texts: AchievementTexts,
  ) {}

  async execute(input: ListPointTransactionsInput): Promise<PointTransactionsPage> {
    const page = await this.repository.listPointTransactions(input.userId, {
      limit: input.limit,
      ...(input.before === undefined ? {} : { before: input.before }),
    });

    return {
      transactions: page.transactions.map((t) =>
        toPointTransactionView(t, this.registry, this.texts, input.locale),
      ),
      nextBefore: page.nextBefore,
    };
  }
}
