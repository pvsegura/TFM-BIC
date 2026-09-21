import { catalogErrorResponseSchema } from "@tfm-bic/contracts";

import { ApiError } from "./api-error.js";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** Turns a non-2xx response into an `ApiError` carrying only the API's own fixed message — or a
 * generic one when the body is not the documented error shape — never a raw body or a stack. */
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const parsed = catalogErrorResponseSchema.safeParse(await response.json());
    return new ApiError(
      parsed.success ? parsed.data.error : GENERIC_ERROR_MESSAGE,
      response.status,
    );
  } catch {
    return new ApiError(GENERIC_ERROR_MESSAGE, response.status);
  }
}

/**
 * The one way the per-student services (lessons, exercises, gamification) call the API: the
 * session cookie is always sent — the user is identified by that cookie alone, never by anything
 * the client puts in the request — JSON is asked for, and anything but a 2xx becomes an
 * `ApiError`. Same-origin like the rest (see vite.config.ts). The caller validates the body
 * against the shared contract.
 */
export async function requestJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...init.headers },
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}
