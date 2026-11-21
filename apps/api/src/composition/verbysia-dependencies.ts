import {
  AccessPolicy,
  AdminCommerceUseCases,
  GetMemorySessionUseCase,
  GetMemoryStatsUseCase,
  GetMyAccessUseCase,
  ListPublicProductsUseCase,
  ReviewMemoryCardUseCase,
  type Clock,
  type MemoryCardRepository,
} from "@verbysia/application";
import {
  createCommerceDb,
  createCommerceRepositories,
  createMemoryDb,
  DrizzleMemoryCardRepository,
  SystemClock,
  type CommerceDb,
  type CommerceRepositories,
  type MemoryDb,
} from "@verbysia/data";

import type { ContentDependencies } from "./content-dependencies.js";

/** Commerce (products, licences, admin) and the memory trainer — Verbysia's paid-product core. */
export interface CommerceDependencies {
  repositories: CommerceRepositories;
  memoryCards: MemoryCardRepository;
  clock: Clock;
  close: () => Promise<void>;
}

export function buildCommerceDependencies(
  commerceDb: CommerceDb,
  memoryDb: MemoryDb,
  close: () => Promise<void>,
  clock: Clock = new SystemClock(),
): CommerceDependencies {
  return {
    repositories: createCommerceRepositories(commerceDb),
    memoryCards: new DrizzleMemoryCardRepository(memoryDb),
    clock,
    close,
  };
}

export function createCommerceDependencies(databaseUrl: string): CommerceDependencies {
  const commerce = createCommerceDb(databaseUrl);
  const memory = createMemoryDb(databaseUrl);
  return buildCommerceDependencies(commerce.db, memory.db, async () => {
    await commerce.close();
    await memory.close();
  });
}

export function createCommerceUseCases(content: ContentDependencies, deps: CommerceDependencies) {
  const { repositories: repos, memoryCards, clock } = deps;
  const accessPolicy = new AccessPolicy(repos.licences, clock);
  const memoryArgs = [
    content.contentRepository,
    content.vocabularyRepository,
    memoryCards,
    accessPolicy,
    clock,
  ] as const;
  return {
    clock,
    accessPolicy,
    listPublicProducts: new ListPublicProductsUseCase(repos.products),
    getMyAccess: new GetMyAccessUseCase(repos.licences, clock),
    admin: new AdminCommerceUseCases({ ...repos, clock }),
    memorySession: new GetMemorySessionUseCase(...memoryArgs),
    memoryReview: new ReviewMemoryCardUseCase(...memoryArgs),
    memoryStats: new GetMemoryStatsUseCase(...memoryArgs),
  };
}

export type CommerceUseCases = ReturnType<typeof createCommerceUseCases>;
