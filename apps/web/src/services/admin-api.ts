import {
  adminAuditEntrySchema,
  adminLicenceSchema,
  adminProductSchema,
  adminPurchaseSchema,
  adminSubscriptionSchema,
  adminUserDetailResponseSchema,
  adminUsersResponseSchema,
  type AdminGrantLicenceRequest,
  type AdminUpdateProductRequest,
} from "@verbysia/contracts";
import { z } from "zod";

import { requestJson } from "./api-request.js";

const enc = encodeURIComponent;
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? {} : { "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export async function fetchAdminUsers(q: string, offset = 0) {
  return adminUsersResponseSchema.parse(
    await requestJson(`/admin/users?q=${enc(q)}&limit=25&offset=${String(offset)}`),
  );
}

export async function fetchAdminUser(userId: string) {
  return adminUserDetailResponseSchema.parse(await requestJson(`/admin/users/${enc(userId)}`));
}

export async function grantLicence(userId: string, body: AdminGrantLicenceRequest) {
  return adminLicenceSchema.parse(
    await requestJson(`/admin/users/${enc(userId)}/licences`, json("POST", body)),
  );
}

export async function revokeLicence(licenceId: string) {
  return adminLicenceSchema.parse(
    await requestJson(`/admin/licences/${enc(licenceId)}/revoke`, json("POST")),
  );
}

export async function fetchAdminProducts() {
  return z
    .object({ paymentsEnabled: z.boolean(), products: z.array(adminProductSchema) })
    .parse(await requestJson("/admin/products"));
}

export async function updateProduct(productId: string, body: AdminUpdateProductRequest) {
  return adminProductSchema.parse(
    await requestJson(`/admin/products/${enc(productId)}`, json("PATCH", body)),
  );
}

export async function fetchAdminPurchases() {
  return z
    .object({ purchases: z.array(adminPurchaseSchema) })
    .parse(await requestJson("/admin/purchases")).purchases;
}

export async function fetchAdminSubscriptions() {
  return z
    .object({ subscriptions: z.array(adminSubscriptionSchema) })
    .parse(await requestJson("/admin/subscriptions")).subscriptions;
}

export async function fetchAdminAudit() {
  return z
    .object({ entries: z.array(adminAuditEntrySchema) })
    .parse(await requestJson("/admin/audit")).entries;
}
