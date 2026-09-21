import type {
  AchievementList,
  AchievementView,
  GamificationSummary,
  PointTransactionsPage,
  PointTransactionView,
  ResolveSessionUseCase,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import {
  achievementsResponseSchema,
  gamificationQuerySchema,
  gamificationSummaryResponseSchema,
  pointHistoryQuerySchema,
  pointHistoryResponseSchema,
} from "@tfm-bic/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { GamificationUseCases } from "../composition/gamification-use-cases.js";
import { createAuthenticateHook } from "../hooks/authenticate.js";
import { gamificationReadRateLimit } from "./gamification-rate-limit.js";
import { requestLocale } from "./interface-locale.js";

const INVALID_REQUEST = { error: "Invalid request." } as const;

/** Points and achievements are per student, so no shared cache (browser, proxy or CDN) may keep any of it. */
function noStore(reply: FastifyReply): void {
  void reply.header("Cache-Control", "private, no-store");
}

/** The student the request is for — always the session's, set by `authenticate`. */
function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  if (!user) {
    // Unreachable: `authenticate` replies 401 before any handler runs. Failing loudly beats
    // carrying on with no identity.
    throw new Error("A gamification handler ran without an authenticated user.");
  }
  return user.id;
}

function toTransactionResponse(transaction: PointTransactionView) {
  return {
    id: transaction.id,
    amount: transaction.amount,
    reason: transaction.reason,
    sourceId: transaction.sourceId,
    title: transaction.title,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function toAchievementResponse(achievement: AchievementView) {
  return {
    key: achievement.key,
    title: achievement.title,
    description: achievement.description,
    iconId: achievement.iconId,
    rewardPoints: achievement.rewardPoints,
    unlocked: achievement.unlocked,
    unlockedAt: achievement.unlockedAt?.toISOString() ?? null,
    progress: achievement.progress,
  };
}

function toSummaryResponse(summary: GamificationSummary) {
  // Parsed through the allowlisting response schema, like every other student response.
  return gamificationSummaryResponseSchema.parse({
    totalPoints: summary.totalPoints,
    achievements: summary.achievements,
    inProgressAchievements: summary.inProgressAchievements.map(toAchievementResponse),
    recentTransactions: summary.recentTransactions.map(toTransactionResponse),
  });
}

function toAchievementsResponse(list: AchievementList) {
  return achievementsResponseSchema.parse({
    achievements: list.achievements.map(toAchievementResponse),
    unlockedCount: list.unlockedCount,
    totalCount: list.totalCount,
  });
}

function toHistoryResponse(page: PointTransactionsPage) {
  return pointHistoryResponseSchema.parse({
    transactions: page.transactions.map(toTransactionResponse),
    nextBefore: page.nextBefore,
  });
}

/**
 * The student's points and achievements (M8) — authenticated-only and **read-only**.
 *
 * - `GET /gamification/summary` — total points, how many achievements, the ones closest to
 *   unlocking and the most recent rewards: what the dashboard shows.
 * - `GET /gamification/achievements` — every achievement with progress and unlock date.
 * - `GET /gamification/point-transactions?limit=&before=` — the points history, newest first, keyset
 *   paged: the answer to "why do I have these points?".
 *
 * The student is always the session's: there is no `:userId` in any path, a `userId` in the
 * query is a `400` rather than ignored, and no route addresses anyone else's data — so there is
 * nothing to iterate over or tamper with. And there is no route that creates points or unlocks an
 * achievement: rewards are granted only inside the exercise and lesson use cases, as a consequence
 * of a valid domain action the server itself judged.
 */
export function registerGamificationRoutes(
  app: FastifyInstance,
  deps: { useCases: GamificationUseCases; resolveSession: ResolveSessionUseCase; env: AppEnv },
): void {
  const { useCases, resolveSession, env } = deps;
  const authenticate = createAuthenticateHook(resolveSession);
  const config = { rateLimit: gamificationReadRateLimit(env) };
  const localeOf = (request: FastifyRequest) => requestLocale(request, useCases.achievementTexts);

  app.get(
    "/gamification/summary",
    { config, preHandler: [authenticate] },
    async (request, reply) => {
      if (!gamificationQuerySchema.safeParse(request.query).success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      const summary = await useCases.getSummary.execute({
        userId: sessionUserId(request),
        locale: localeOf(request),
      });
      noStore(reply);
      return toSummaryResponse(summary);
    },
  );

  app.get(
    "/gamification/achievements",
    { config, preHandler: [authenticate] },
    async (request, reply) => {
      if (!gamificationQuerySchema.safeParse(request.query).success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      const list = await useCases.listAchievements.execute({
        userId: sessionUserId(request),
        locale: localeOf(request),
      });
      noStore(reply);
      return toAchievementsResponse(list);
    },
  );

  app.get(
    "/gamification/point-transactions",
    { config, preHandler: [authenticate] },
    async (request, reply) => {
      const query = pointHistoryQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send(INVALID_REQUEST);
      }

      const page = await useCases.listPointTransactions.execute({
        userId: sessionUserId(request),
        locale: localeOf(request),
        limit: query.data.limit,
        ...(query.data.before === undefined ? {} : { before: query.data.before }),
      });
      noStore(reply);
      return toHistoryResponse(page);
    },
  );
}
