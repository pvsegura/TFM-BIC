import {
  profileResponseSchema,
  profileValidationErrorResponseSchema,
  type ProfileResponse,
  type UpdateProfileRequest,
} from "@tfm-bic/contracts";

import { ApiError } from "./api-error.js";

/**
 * Same-origin like `/auth` (see services/auth-api.ts and vite.config.ts). The
 * page route `/profile` and this API path are the same URL, so every request
 * asks for JSON explicitly — that is how a dev/reverse proxy tells this fetch
 * apart from a browser navigation to the page.
 */
const PROFILE_URL = "/profile";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function toApiError(response: Response): Promise<ApiError> {
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

/** The authenticated student's profile. The user is identified by the session
 * cookie alone — no id is ever sent. */
export async function fetchCurrentProfile(): Promise<ProfileResponse> {
  const response = await fetch(PROFILE_URL, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return profileResponseSchema.parse(await response.json());
}

/** Resolves with the profile as persisted by the server — the caller should
 * show that, not what it submitted. */
export async function updateProfile(input: UpdateProfileRequest): Promise<ProfileResponse> {
  const response = await fetch(PROFILE_URL, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return profileResponseSchema.parse(await response.json());
}
