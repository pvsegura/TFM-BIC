import type { Licence, LicenceKind } from "./entitlement.js";

/** `one_off`: a single payment for a licence; `subscription`: recurring monthly or yearly. */
export const PRODUCT_BILLING = ["one_off", "monthly", "yearly"] as const;
export type ProductBilling = (typeof PRODUCT_BILLING)[number];

/** `draft` products are never offered for sale (A2–B2 until their content exists). */
export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PURCHASE_STATUSES = ["pending", "paid", "failed", "refunded", "cancelled"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "past_due", "cancelled", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Where a licence came from — `admin` grants are manual (support, gifts, testing). */
export const LICENCE_SOURCES = ["purchase", "subscription", "admin"] as const;
export type LicenceSource = (typeof LICENCE_SOURCES)[number];

export interface Product {
  id: string;
  licenceKind: LicenceKind;
  billing: ProductBilling;
  status: ProductStatus;
  namePl: string;
  descriptionPl: string;
  /** In the currency's minor unit (grosze for PLN). */
  priceMinor: number;
  currency: string;
  /** One-off licence length; null = indefinite. */
  accessDays: number | null;
  providerPriceId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  status: PurchaseStatus;
  amountMinor: number;
  currency: string;
  provider: string;
  providerRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
}

export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  provider: string;
  providerRef: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LicenceRecord extends Licence {
  id: string;
  userId: string;
  source: LicenceSource;
  sourceId: string | null;
  note: string | null;
  createdAt: Date;
}

export interface AdminAuditEntry {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

/** Whether a product may be bought right now: active, and backed by a provider price. */
export function isPurchasable(product: Pick<Product, "status" | "providerPriceId">): boolean {
  return product.status === "active" && product.providerPriceId !== null;
}
