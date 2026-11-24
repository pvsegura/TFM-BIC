import {
  myAccessResponseSchema,
  publicProductsResponseSchema,
  redirectResponseSchema,
  syncProvidersResponseSchema,
  type MyAccessResponse,
  type PublicProduct,
} from "@verbysia/contracts";

import { requestJson, requestPublicJson } from "./api-request.js";

/** The public price list (no session). */
export async function fetchProducts(): Promise<PublicProduct[]> {
  return publicProductsResponseSchema.parse(await requestPublicJson("/products")).products;
}

/** The signed-in learner's own licences. */
export async function fetchMyAccess(): Promise<MyAccessResponse> {
  return myAccessResponseSchema.parse(await requestJson("/me/access"));
}

const postJson = (body?: unknown): RequestInit => ({
  method: "POST",
  headers: body === undefined ? {} : { "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

/** Starts a Stripe checkout for the session's user; returns where to send the browser. */
export async function startCheckout(productId: string): Promise<string> {
  return redirectResponseSchema.parse(await requestJson("/checkout", postJson({ productId }))).url;
}

/** The Stripe customer portal for the session's user. */
export async function openBillingPortal(): Promise<string> {
  return redirectResponseSchema.parse(await requestJson("/billing/portal", postJson())).url;
}

/** Admin: creates Stripe prices for active products that have none. */
export async function syncProductsWithProvider(): Promise<string[]> {
  return syncProvidersResponseSchema.parse(
    await requestJson("/admin/products/sync-provider", postJson()),
  ).synced;
}
