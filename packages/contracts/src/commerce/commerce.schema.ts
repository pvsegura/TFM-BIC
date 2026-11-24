import {
  LICENCE_KINDS,
  LICENCE_SOURCES,
  PRODUCT_BILLING,
  PRODUCT_STATUSES,
  PURCHASE_STATUSES,
  ROLES,
  SUBSCRIPTION_STATUSES,
} from "@verbysia/domain";
import { z } from "zod";

import { boundedIntText } from "../common/whole-number-text.js";

const isoTimestamp = z.iso.datetime();
const minor = z.number().int().min(0);

export const publicProductSchema = z.object({
  id: z.string(),
  licenceKind: z.enum(LICENCE_KINDS),
  billing: z.enum(PRODUCT_BILLING),
  status: z.enum(["active", "coming_soon"]),
  name: z.string(),
  description: z.string(),
  priceMinor: minor,
  currency: z.string(),
  accessDays: z.number().int().positive().nullable(),
  purchasable: z.boolean(),
});
export const publicProductsResponseSchema = z.object({ products: z.array(publicProductSchema) });

export const myAccessResponseSchema = z.object({
  premium: z.boolean(),
  licences: z.array(
    z.object({
      id: z.uuid(),
      kind: z.enum(LICENCE_KINDS),
      startsAt: isoTimestamp,
      endsAt: isoTimestamp.nullable(),
      active: z.boolean(),
    }),
  ),
});

// Admin ------------------------------------------------------------------------------------------

export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  role: z.enum(ROLES),
  emailVerified: z.boolean(),
  createdAt: isoTimestamp,
});

export const adminProductSchema = z.object({
  id: z.string(),
  licenceKind: z.enum(LICENCE_KINDS),
  billing: z.enum(PRODUCT_BILLING),
  status: z.enum(PRODUCT_STATUSES),
  namePl: z.string(),
  descriptionPl: z.string(),
  priceMinor: minor,
  currency: z.string(),
  accessDays: z.number().int().positive().nullable(),
  providerPriceId: z.string().nullable(),
  sortOrder: z.number().int(),
  updatedAt: isoTimestamp,
});

export const adminLicenceSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  kind: z.enum(LICENCE_KINDS),
  startsAt: isoTimestamp,
  endsAt: isoTimestamp.nullable(),
  revokedAt: isoTimestamp.nullable(),
  source: z.enum(LICENCE_SOURCES),
  note: z.string().nullable(),
  active: z.boolean(),
  createdAt: isoTimestamp,
});

export const adminPurchaseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  productId: z.string(),
  status: z.enum(PURCHASE_STATUSES),
  amountMinor: minor,
  currency: z.string(),
  provider: z.string(),
  createdAt: isoTimestamp,
  paidAt: isoTimestamp.nullable(),
  refundedAt: isoTimestamp.nullable(),
});

export const adminSubscriptionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  productId: z.string(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  currentPeriodEnd: isoTimestamp,
  cancelAtPeriodEnd: z.boolean(),
  provider: z.string(),
  updatedAt: isoTimestamp,
});

export const adminAuditEntrySchema = z.object({
  id: z.uuid(),
  actorUserId: z.uuid(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: isoTimestamp,
});

export const adminUsersQuerySchema = z.strictObject({
  q: z.string().max(100).optional(),
  limit: boundedIntText(1, 100).optional(),
  offset: boundedIntText(0, 100_000).optional(),
});
export const adminListQuerySchema = z.strictObject({ limit: boundedIntText(1, 200).optional() });
export const adminUserIdParamSchema = z.strictObject({ userId: z.uuid() });
export const adminLicenceIdParamSchema = z.strictObject({ licenceId: z.uuid() });
export const adminProductIdParamSchema = z.strictObject({
  productId: z
    .string()
    .regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
    .max(64),
});

export const adminUpdateProductRequestSchema = z
  .strictObject({
    status: z.enum(PRODUCT_STATUSES).optional(),
    namePl: z.string().trim().min(1).max(120).optional(),
    descriptionPl: z.string().trim().min(1).max(500).optional(),
    priceMinor: z.number().int().min(0).max(10_000_000).optional(),
    accessDays: z.number().int().min(1).max(3660).nullable().optional(),
    providerPriceId: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to change." });

export const adminGrantLicenceRequestSchema = z.strictObject({
  kind: z.enum(LICENCE_KINDS),
  days: z.number().int().min(1).max(3660).nullable(),
  note: z.string().trim().max(500).nullable(),
});

export const adminUsersResponseSchema = z.object({
  users: z.array(adminUserSchema),
  total: z.number().int().min(0),
});
export const adminUserDetailResponseSchema = z.object({
  user: adminUserSchema,
  licences: z.array(adminLicenceSchema),
  purchases: z.array(adminPurchaseSchema),
  subscriptions: z.array(adminSubscriptionSchema),
});

export type PublicProduct = z.infer<typeof publicProductSchema>;
export type MyAccessResponse = z.infer<typeof myAccessResponseSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminLicence = z.infer<typeof adminLicenceSchema>;
export type AdminPurchase = z.infer<typeof adminPurchaseSchema>;
export type AdminSubscription = z.infer<typeof adminSubscriptionSchema>;
export type AdminAuditEntryResponse = z.infer<typeof adminAuditEntrySchema>;
export type AdminUserDetailResponse = z.infer<typeof adminUserDetailResponseSchema>;
export type AdminUpdateProductRequest = z.infer<typeof adminUpdateProductRequestSchema>;
export type AdminGrantLicenceRequest = z.infer<typeof adminGrantLicenceRequestSchema>;

/** The terms of sale the checkout consent refers to; bump with every published wording. */
export const CURRENT_TERMS_VERSION = "regulamin-v1";

/**
 * POST /checkout — the product to buy; the user is always the session's. Both consents must be
 * given explicitly before the payment page opens: the terms of sale, and the request to start
 * delivering the digital content at once with the acknowledgement that the 14-day right of
 * withdrawal is then lost (Polish consumer law, digital content). Draft pending legal review.
 */
export const checkoutRequestSchema = z.strictObject({
  productId: z
    .string()
    .regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
    .max(64),
  acceptTerms: z.literal(true),
  startDeliveryNow: z.literal(true),
});
/** POST /checkout and POST /billing/portal answer with where to send the browser. */
export const redirectResponseSchema = z.object({ url: z.url() });
export const syncProvidersResponseSchema = z.object({ synced: z.array(z.string()) });
