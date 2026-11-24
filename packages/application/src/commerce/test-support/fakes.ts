import {
  newMemoryCardSchedule,
  scheduleReview,
  type AdminAuditEntry,
  type LicenceRecord,
  type Product,
  type Purchase,
  type Subscription,
} from "@verbysia/domain";

import type { MemoryCard, MemoryCardRepository, MemoryReviewLog } from "../../memory/ports.js";
import {
  InvalidWebhookError,
  type CheckoutRequest,
  type PaymentEvent,
  type PaymentLedger,
  type PaymentProvider,
} from "../payments.js";
import type {
  AdminAuditLog,
  AdminUserDirectory,
  AdminUserSummary,
  LicenceRepository,
  ProductRepository,
  PurchaseRepository,
  SubscriptionRepository,
} from "../ports.js";

let nextId = 0;
/** Deterministic UUID-shaped ids for fakes (the application package has no Node types). */
function fakeUuid(): string {
  nextId += 1;
  return `00000000-0000-4000-8000-${nextId.toString(16).padStart(12, "0")}`;
}

const at = new Date("2026-01-01T00:00:00.000Z");

/** The seeded launch catalogue's shape, for tests. */
export function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "course-a1",
    licenceKind: "COURSE_A1",
    billing: "one_off",
    status: "active",
    namePl: "Kurs hiszpańskiego A1",
    descriptionPl: "Pełny kurs A1.",
    priceMinor: 14900,
    currency: "PLN",
    accessDays: null,
    providerPriceId: null,
    sortOrder: 30,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

/** In-memory commerce ports — the same behaviour the Drizzle repositories are tested for. */
export class FakeCommerce {
  readonly productsById = new Map<string, Product>([["course-a1", fakeProduct()]]);
  readonly licenceRows: LicenceRecord[] = [];
  readonly auditRows: AdminAuditEntry[] = [];
  readonly userRows: AdminUserSummary[] = [];

  readonly products: ProductRepository = {
    list: () => Promise.resolve([...this.productsById.values()]),
    findById: (id) => Promise.resolve(this.productsById.get(id) ?? null),
    update: (id, changes, now) => {
      const product = this.productsById.get(id);
      if (!product) return Promise.resolve(null);
      const defined = Object.fromEntries(
        Object.entries(changes).filter(([, v]) => v !== undefined),
      );
      const updated = { ...product, ...defined, updatedAt: now };
      this.productsById.set(id, updated);
      return Promise.resolve(updated);
    },
  };

  readonly licences: LicenceRepository = {
    listByUser: (userId) => Promise.resolve(this.licenceRows.filter((l) => l.userId === userId)),
    findById: (id) => Promise.resolve(this.licenceRows.find((l) => l.id === id) ?? null),
    grant: (input) => {
      const licence: LicenceRecord = { id: fakeUuid(), revokedAt: null, ...input };
      this.licenceRows.push(licence);
      return Promise.resolve(licence);
    },
    revoke: (id, revokedAt) => {
      const licence = this.licenceRows.find((l) => l.id === id);
      if (!licence) return Promise.resolve(null);
      licence.revokedAt ??= revokedAt;
      return Promise.resolve(licence);
    },
  };

  readonly purchases: PurchaseRepository = {
    listByUser: () => Promise.resolve([]),
    listRecent: () => Promise.resolve([]),
  };

  readonly subscriptions: SubscriptionRepository = {
    listByUser: () => Promise.resolve([]),
    listRecent: () => Promise.resolve([]),
  };

  readonly audit: AdminAuditLog = {
    record: (entry) => {
      this.auditRows.push({ id: fakeUuid(), ...entry });
      return Promise.resolve();
    },
    listRecent: (limit) => Promise.resolve(this.auditRows.slice(-limit).reverse()),
  };

  readonly users: AdminUserDirectory = {
    search: (query, limit, offset) => {
      const matches = this.userRows.filter((u) => u.email.includes(query.toLowerCase()));
      return Promise.resolve({
        users: matches.slice(offset, offset + limit),
        total: matches.length,
      });
    },
    findById: (id) => Promise.resolve(this.userRows.find((u) => u.id === id) ?? null),
  };
}

export class FakeMemoryCardRepository implements MemoryCardRepository {
  readonly cards = new Map<string, MemoryCard>();
  readonly reviews: (MemoryReviewLog & { userId: string; clientReviewId: string })[] = [];

  listByUser(userId: string): Promise<readonly MemoryCard[]> {
    return Promise.resolve([...this.cards.values()].filter((card) => card.userId === userId));
  }

  recordReview(input: Parameters<MemoryCardRepository["recordReview"]>[0]) {
    const key = `${input.userId}/${input.vocabularyItemId}`;
    if (
      this.reviews.some(
        (r) => r.userId === input.userId && r.clientReviewId === input.clientReviewId,
      )
    ) {
      const card = this.cards.get(key);
      if (!card) throw new Error("A recorded review has no card.");
      return Promise.resolve({ card, duplicate: true });
    }
    const current = this.cards.get(key);
    const next = scheduleReview(
      current ?? newMemoryCardSchedule(input.now),
      input.grade,
      input.now,
    );
    const card: MemoryCard = {
      userId: input.userId,
      vocabularyItemId: input.vocabularyItemId,
      ...next,
      version: (current?.version ?? 0) + 1,
      lastReviewedAt: input.now,
      createdAt: current?.createdAt ?? input.now,
    };
    this.cards.set(key, card);
    this.reviews.push({
      userId: input.userId,
      clientReviewId: input.clientReviewId,
      vocabularyItemId: input.vocabularyItemId,
      grade: input.grade,
      usedHint: input.usedHint,
      reviewedAt: input.now,
    });
    return Promise.resolve({ card, duplicate: false });
  }

  listReviewsSince(userId: string, since: Date): Promise<readonly MemoryReviewLog[]> {
    return Promise.resolve(
      this.reviews.filter((r) => r.userId === userId && r.reviewedAt >= since),
    );
  }
}

/** In-memory PaymentLedger with the Postgres one's idempotency (keys: provider + reference). */
export class FakePaymentLedger implements PaymentLedger {
  readonly events = new Set<string>();
  readonly customers = new Map<string, string>();
  readonly purchaseRows: Purchase[] = [];
  readonly subscriptionRows: Subscription[] = [];

  constructor(private readonly commerce: FakeCommerce) {}

  hasEvent(provider: string, eventId: string) {
    return Promise.resolve(this.events.has(`${provider}/${eventId}`));
  }
  recordEvent(provider: string, eventId: string) {
    this.events.add(`${provider}/${eventId}`);
    return Promise.resolve();
  }
  findCustomerRef(userId: string, provider: string) {
    return Promise.resolve(this.customers.get(`${provider}/${userId}`) ?? null);
  }
  saveCustomerRef(userId: string, provider: string, customerRef: string) {
    if (!this.customers.has(`${provider}/${userId}`))
      this.customers.set(`${provider}/${userId}`, customerRef);
    return Promise.resolve();
  }
  findPurchaseByRef(provider: string, providerRef: string) {
    return Promise.resolve(
      this.purchaseRows.find((p) => p.provider === provider && p.providerRef === providerRef) ??
        null,
    );
  }
  createPaidPurchase(input: Omit<Purchase, "id" | "refundedAt" | "status">) {
    const purchase: Purchase = { id: fakeUuid(), status: "paid", refundedAt: null, ...input };
    this.purchaseRows.push(purchase);
    return Promise.resolve(purchase);
  }
  markPurchaseRefunded(purchaseId: string, at: Date) {
    const purchase = this.purchaseRows.find((p) => p.id === purchaseId);
    if (purchase) {
      purchase.status = "refunded";
      purchase.refundedAt = at;
    }
    return Promise.resolve();
  }
  upsertSubscription(input: Omit<Subscription, "id" | "createdAt">, at: Date) {
    const existing = this.subscriptionRows.find(
      (s) => s.provider === input.provider && s.providerRef === input.providerRef,
    );
    if (existing) {
      Object.assign(existing, input);
      return Promise.resolve(existing);
    }
    const subscription: Subscription = { id: fakeUuid(), createdAt: at, ...input };
    this.subscriptionRows.push(subscription);
    return Promise.resolve(subscription);
  }
  findSubscriptionByRef(provider: string, providerRef: string) {
    return Promise.resolve(
      this.subscriptionRows.find((s) => s.provider === provider && s.providerRef === providerRef) ??
        null,
    );
  }
  findLicenceBySource(source: "purchase" | "subscription", sourceId: string) {
    const licence = this.commerce.licenceRows.find(
      (l) => l.source === source && l.sourceId === sourceId,
    );
    return Promise.resolve(licence ? { id: licence.id } : null);
  }
  setLicenceEnd(licenceId: string, endsAt: Date | null) {
    const licence = this.commerce.licenceRows.find((l) => l.id === licenceId);
    if (licence) licence.endsAt = endsAt;
    return Promise.resolve();
  }
}

/**
 * A scriptable payment provider: `nextEvent` is what the next webhook "verifies" to; a body of
 * "bad-signature" is refused like a forged request.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  readonly checkouts: CheckoutRequest[] = [];
  readonly pricedProducts: string[] = [];
  nextEvent: PaymentEvent | null = null;

  createCheckout(request: CheckoutRequest) {
    this.checkouts.push(request);
    return Promise.resolve({
      url: `https://checkout.example/${request.product.id}`,
      customerRef: request.customerRef ?? "cus_fake",
    });
  }
  createPortal(customerRef: string) {
    return Promise.resolve(`https://billing.example/${customerRef}`);
  }
  ensurePrice(product: Product) {
    this.pricedProducts.push(product.id);
    return Promise.resolve(`price_${product.id}`);
  }
  parseWebhook(rawBody: Uint8Array) {
    if (String.fromCharCode(...rawBody) === "bad-signature" || !this.nextEvent) {
      return Promise.reject(new InvalidWebhookError());
    }
    return Promise.resolve(this.nextEvent);
  }
}
