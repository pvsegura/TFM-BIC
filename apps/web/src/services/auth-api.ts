import {
  authUserResponseSchema,
  messageResponseSchema,
  type AuthUserResponse,
  type LoginRequest,
  type MessageResponse,
  type PasswordResetConfirm,
  type PasswordResetRequest,
  type RegisterRequest,
  type ResendVerificationRequest,
  type VerifyEmailRequest,
} from "@verbysia/contracts";

import { requestJson, toApiError } from "./api-request.js";

/**
 * `/auth` is same-origin — the Vite dev server proxies it to apps/api (see
 * vite.config.ts) so no CORS/cross-origin cookie handling is needed;
 * `credentials: "include"` still matters because same-origin requests to a
 * different port would otherwise be treated as cross-origin without the
 * proxy, and it's harmless once proxied. See ADR-006.
 */
const AUTH_BASE = "/auth";

async function postJson<T>(
  path: string,
  body: unknown,
  schema: { parse: (data: unknown) => T },
): Promise<T> {
  return schema.parse(
    await requestJson(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function register(input: RegisterRequest): Promise<MessageResponse> {
  return postJson("/register", input, messageResponseSchema);
}

export function login(input: LoginRequest): Promise<AuthUserResponse> {
  return postJson("/login", input, authUserResponseSchema);
}

/** Safe to call with no active session (mirrors the API's own idempotent
 * logout — see apps/api/src/routes/auth.route.ts). */
export async function logout(): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/logout`, { method: "POST", credentials: "include" });
  if (!response.ok && response.status !== 401) {
    throw await toApiError(response);
  }
}

/** `null` means "not authenticated" — not an error, callers use this to
 * restore (or not restore) auth state on load. */
export async function fetchCurrentUser(): Promise<AuthUserResponse | null> {
  const response = await fetch(`${AUTH_BASE}/me`, { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return authUserResponseSchema.parse(await response.json());
}

export function verifyEmail(input: VerifyEmailRequest): Promise<MessageResponse> {
  return postJson("/email-verification/confirm", input, messageResponseSchema);
}

export function resendVerification(input: ResendVerificationRequest): Promise<MessageResponse> {
  return postJson("/email-verification/resend", input, messageResponseSchema);
}

export function requestPasswordReset(input: PasswordResetRequest): Promise<MessageResponse> {
  return postJson("/password-reset/request", input, messageResponseSchema);
}

export function confirmPasswordReset(input: PasswordResetConfirm): Promise<MessageResponse> {
  return postJson("/password-reset/confirm", input, messageResponseSchema);
}
