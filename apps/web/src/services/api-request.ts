import { profileValidationErrorResponseSchema } from "@tfm-bic/contracts";

import { ApiError, GENERIC_ERROR_MESSAGE } from "./api-error.js";

/**
 * Turns a non-2xx response into an `ApiError` carrying only the API's own fixed message — or a
 * generic one when the body is not the documented error shape — never a raw body or a stack.
 * A validation error may also name fields (`{ error, fields }`, e.g. the profile form); only their
 * string messages are kept.
 */
export async function toApiError(response: Response): Promise<ApiError> {
  try {
    const parsed = profileValidationErrorResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return new ApiError(GENERIC_ERROR_MESSAGE, response.status);
    }
    const fields = Object.fromEntries(
      Object.entries(parsed.data.fields ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    return new ApiError(
      parsed.data.error,
      response.status,
      Object.keys(fields).length > 0 ? fields : undefined,
    );
  } catch {
    return new ApiError(GENERIC_ERROR_MESSAGE, response.status);
  }
}

async function send(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

/**
 * The one way the per-user services call the API: the session cookie is always sent — the user is
 * identified by that cookie alone, never by anything the client puts in the request — JSON is
 * asked for, and anything but a 2xx becomes an `ApiError`. Same-origin like the rest (see
 * vite.config.ts). The caller validates the body against the shared contract.
 */
export function requestJson(url: string, init: RequestInit = {}): Promise<unknown> {
  return send(url, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...init.headers },
  });
}

/**
 * Public, read-only data (the language and content catalog): no `credentials` option is set — the
 * request needs no session and says nothing about who asks. Errors are handled like `requestJson`.
 */
export function requestPublicJson(url: string): Promise<unknown> {
  return send(url, { headers: { Accept: "application/json" } });
}
