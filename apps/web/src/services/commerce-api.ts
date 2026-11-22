import {
  myAccessResponseSchema,
  publicProductsResponseSchema,
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
