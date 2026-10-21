import {
  profileResponseSchema,
  type ProfileResponse,
  type UpdateProfileRequest,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * Same-origin like `/auth` (see services/auth-api.ts and vite.config.ts). The
 * page route `/profile` and this API path are the same URL, so every request
 * asks for JSON explicitly — that is how a dev/reverse proxy tells this fetch
 * apart from a browser navigation to the page.
 */
const PROFILE_URL = "/profile";

/** The authenticated student's profile. The user is identified by the session
 * cookie alone — no id is ever sent. */
export async function fetchCurrentProfile(): Promise<ProfileResponse> {
  return profileResponseSchema.parse(await requestJson(PROFILE_URL));
}

/** Resolves with the profile as persisted by the server — the caller should
 * show that, not what it submitted. Field-level validation messages arrive as
 * `ApiError.fieldErrors`. */
export async function updateProfile(input: UpdateProfileRequest): Promise<ProfileResponse> {
  return profileResponseSchema.parse(
    await requestJson(PROFILE_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
