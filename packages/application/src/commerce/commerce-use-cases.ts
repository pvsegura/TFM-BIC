import {
  isLicenceActive,
  isPurchasable,
  type LicenceKind,
  type LicenceRecord,
  type Product,
  type Purchase,
  type Subscription,
} from "@verbysia/domain";

import type { Clock } from "../ports/clock.js";
import type {
  AdminAuditLog,
  AdminUserDirectory,
  AdminUserSummary,
  LicenceRepository,
  ProductChanges,
  ProductRepository,
  PurchaseRepository,
  SubscriptionRepository,
} from "./ports.js";

export class CommerceNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
    this.name = "CommerceNotFoundError";
  }
}

export class InvalidCommerceInputError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidCommerceInputError";
  }
}

export interface PublicProductView {
  id: string;
  licenceKind: LicenceKind;
  billing: Product["billing"];
  status: "active" | "coming_soon";
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  accessDays: number | null;
  /** False until a payment provider price exists — the pricing page shows "payments soon". */
  purchasable: boolean;
}

/** The public price list: active products and drafts as "coming soon"; archived ones hidden. */
export class ListPublicProductsUseCase {
  constructor(
    private readonly products: ProductRepository,
    /** False while no payment provider is configured: nothing is purchasable then. */
    private readonly paymentsEnabled = true,
  ) {}

  async execute(): Promise<PublicProductView[]> {
    const all = await this.products.list();
    return all
      .filter((product) => product.status !== "archived")
      .map((product) => ({
        id: product.id,
        licenceKind: product.licenceKind,
        billing: product.billing,
        status: product.status === "active" ? "active" : "coming_soon",
        name: product.namePl,
        description: product.descriptionPl,
        priceMinor: product.priceMinor,
        currency: product.currency,
        accessDays: product.accessDays,
        purchasable: this.paymentsEnabled && isPurchasable(product),
      }));
  }
}

export interface MyAccessView {
  premium: boolean;
  licences: {
    id: string;
    kind: LicenceKind;
    startsAt: Date;
    endsAt: Date | null;
    active: boolean;
  }[];
}

/** The learner's own licences (never another user's: the id comes from the session). */
export class GetMyAccessUseCase {
  constructor(
    private readonly licences: LicenceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<MyAccessView> {
    const now = this.clock.now();
    const records = await this.licences.listByUser(userId);
    const licences = records
      .filter((licence) => licence.revokedAt === null)
      .map((licence) => ({
        id: licence.id,
        kind: licence.kind,
        startsAt: licence.startsAt,
        endsAt: licence.endsAt,
        active: isLicenceActive(licence, now),
      }));
    return {
      premium: licences.some(
        (l) => l.active && (l.kind === "PREMIUM_MONTHLY" || l.kind === "PREMIUM_YEARLY"),
      ),
      licences,
    };
  }
}

const MAX_NOTE_LENGTH = 500;
const MAX_GRANT_DAYS = 3660;

/**
 * Everything an administrator may do. The caller's role is checked by the route (ADMIN only);
 * every change is written to the audit log with the acting administrator's id.
 */
export class AdminCommerceUseCases {
  constructor(
    private readonly deps: {
      users: AdminUserDirectory;
      products: ProductRepository;
      licences: LicenceRepository;
      purchases: PurchaseRepository;
      subscriptions: SubscriptionRepository;
      audit: AdminAuditLog;
      clock: Clock;
    },
  ) {}

  searchUsers(query: string, limit: number, offset: number) {
    return this.deps.users.search(query.trim().slice(0, 100), limit, offset);
  }

  async getUser(userId: string): Promise<{
    user: AdminUserSummary;
    licences: readonly LicenceRecord[];
    purchases: readonly Purchase[];
    subscriptions: readonly Subscription[];
  }> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw new CommerceNotFoundError("User");
    const [licences, purchases, subscriptions] = await Promise.all([
      this.deps.licences.listByUser(userId),
      this.deps.purchases.listByUser(userId),
      this.deps.subscriptions.listByUser(userId),
    ]);
    return { user, licences, purchases, subscriptions };
  }

  listProducts() {
    return this.deps.products.list();
  }

  listPurchases(limit: number) {
    return this.deps.purchases.listRecent(limit);
  }

  listSubscriptions(limit: number) {
    return this.deps.subscriptions.listRecent(limit);
  }

  listAudit(limit: number) {
    return this.deps.audit.listRecent(limit);
  }

  async updateProduct(actorUserId: string, productId: string, changes: ProductChanges) {
    if (
      changes.priceMinor !== undefined &&
      (!Number.isInteger(changes.priceMinor) || changes.priceMinor < 0)
    ) {
      throw new InvalidCommerceInputError("Price must be a non-negative integer in minor units.");
    }
    const now = this.deps.clock.now();
    const before = await this.deps.products.findById(productId);
    if (!before) throw new CommerceNotFoundError("Product");
    const after = await this.deps.products.update(productId, changes, now);
    if (!after) throw new CommerceNotFoundError("Product");
    await this.deps.audit.record({
      actorUserId,
      action: "product.updated",
      targetType: "product",
      targetId: productId,
      details: { changes: { ...changes } },
      createdAt: now,
    });
    return after;
  }

  /** A manual licence (support, gift, testing). `days` null = indefinite. */
  async grantLicence(
    actorUserId: string,
    input: { userId: string; kind: LicenceKind; days: number | null; note: string | null },
  ): Promise<LicenceRecord> {
    if (
      input.days !== null &&
      (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_GRANT_DAYS)
    ) {
      throw new InvalidCommerceInputError(`Days must be between 1 and ${String(MAX_GRANT_DAYS)}.`);
    }
    if (input.note !== null && input.note.length > MAX_NOTE_LENGTH) {
      throw new InvalidCommerceInputError("Note is too long.");
    }
    const user = await this.deps.users.findById(input.userId);
    if (!user) throw new CommerceNotFoundError("User");

    const now = this.deps.clock.now();
    const licence = await this.deps.licences.grant({
      userId: input.userId,
      kind: input.kind,
      startsAt: now,
      endsAt: input.days === null ? null : new Date(now.getTime() + input.days * 86_400_000),
      source: "admin",
      sourceId: actorUserId,
      note: input.note,
      createdAt: now,
    });
    await this.deps.audit.record({
      actorUserId,
      action: "licence.granted",
      targetType: "user",
      targetId: input.userId,
      details: { licenceId: licence.id, kind: input.kind, days: input.days },
      createdAt: now,
    });
    return licence;
  }

  async revokeLicence(actorUserId: string, licenceId: string): Promise<LicenceRecord> {
    const now = this.deps.clock.now();
    const licence = await this.deps.licences.revoke(licenceId, now);
    if (!licence) throw new CommerceNotFoundError("Licence");
    await this.deps.audit.record({
      actorUserId,
      action: "licence.revoked",
      targetType: "user",
      targetId: licence.userId,
      details: { licenceId, kind: licence.kind },
      createdAt: now,
    });
    return licence;
  }
}
