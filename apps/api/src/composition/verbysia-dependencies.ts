import {
  AccessPolicy,
  AdminCommerceUseCases,
  GetMemorySessionUseCase,
  GetMemoryStatsUseCase,
  GetMyAccessUseCase,
  HandlePaymentEventUseCase,
  ListPublicProductsUseCase,
  OpenBillingPortalUseCase,
  ReviewMemoryCardUseCase,
  StartCheckoutUseCase,
  SyncProductsWithProviderUseCase,
  type Clock,
  type MemoryCardRepository,
  type PaymentDeps,
  type PaymentLedger,
  type PaymentNotifier,
  type PaymentProvider,
} from "@verbysia/application";
import type { AppEnv } from "@verbysia/config";
import {
  createCommerceDb,
  createCommerceRepositories,
  createMemoryDb,
  createPaymentLedger,
  DrizzleMemoryCardRepository,
  StripePaymentProvider,
  SystemClock,
  type CommerceDb,
  type CommerceRepositories,
  type MemoryDb,
} from "@verbysia/data";

import type { ContentDependencies } from "./content-dependencies.js";

/** Commerce (products, licences, payments, admin) and the memory trainer — Verbysia's paid-product core. */
export interface CommerceDependencies {
  repositories: CommerceRepositories;
  memoryCards: MemoryCardRepository;
  paymentLedger: PaymentLedger;
  /** Null when Stripe is not configured: checkout is disabled and the price list says so. */
  paymentProvider: PaymentProvider | null;
  clock: Clock;
  close: () => Promise<void>;
}

export function buildCommerceDependencies(
  commerceDb: CommerceDb,
  memoryDb: MemoryDb,
  close: () => Promise<void>,
  options: { clock?: Clock; paymentProvider?: PaymentProvider | null } = {},
): CommerceDependencies {
  return {
    repositories: createCommerceRepositories(commerceDb),
    memoryCards: new DrizzleMemoryCardRepository(memoryDb),
    paymentLedger: createPaymentLedger(commerceDb),
    paymentProvider: options.paymentProvider ?? null,
    clock: options.clock ?? new SystemClock(),
    close,
  };
}

export function createCommerceDependencies(env: AppEnv, databaseUrl: string): CommerceDependencies {
  const commerce = createCommerceDb(databaseUrl);
  const memory = createMemoryDb(databaseUrl);
  const paymentProvider =
    env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
      ? new StripePaymentProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET)
      : null;
  return buildCommerceDependencies(
    commerce.db,
    memory.db,
    async () => {
      await commerce.close();
      await memory.close();
    },
    { paymentProvider },
  );
}

export function createCommerceUseCases(
  content: ContentDependencies,
  deps: CommerceDependencies,
  env: Pick<AppEnv, "APP_BASE_URL">,
  notifier?: PaymentNotifier,
) {
  const { repositories: repos, memoryCards, clock } = deps;
  const accessPolicy = new AccessPolicy(repos.licences, clock);
  const memoryArgs = [
    content.contentRepository,
    content.vocabularyRepository,
    memoryCards,
    accessPolicy,
    clock,
  ] as const;
  const payments: PaymentDeps = {
    provider: deps.paymentProvider,
    ledger: deps.paymentLedger,
    products: repos.products,
    licences: repos.licences,
    audit: repos.audit,
    clock,
    appBaseUrl: env.APP_BASE_URL ?? "http://localhost:5173",
    ...(notifier ? { notifier } : {}),
  };
  return {
    clock,
    accessPolicy,
    paymentsEnabled: deps.paymentProvider !== null,
    listPublicProducts: new ListPublicProductsUseCase(
      repos.products,
      deps.paymentProvider !== null,
    ),
    getMyAccess: new GetMyAccessUseCase(repos.licences, clock),
    admin: new AdminCommerceUseCases({ ...repos, clock }),
    startCheckout: new StartCheckoutUseCase(payments),
    openBillingPortal: new OpenBillingPortalUseCase(payments),
    syncProducts: new SyncProductsWithProviderUseCase(payments),
    handlePaymentEvent: new HandlePaymentEventUseCase(payments),
    memorySession: new GetMemorySessionUseCase(...memoryArgs),
    memoryReview: new ReviewMemoryCardUseCase(...memoryArgs),
    memoryStats: new GetMemoryStatsUseCase(...memoryArgs),
  };
}

export type CommerceUseCases = ReturnType<typeof createCommerceUseCases>;
