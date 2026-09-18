import type { APIRequestContext } from "@playwright/test";

const API_BASE = "http://localhost:3000";

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/** Retrieves the raw token embedded in the most recent verification/reset
 * link sent to `email`, via the NODE_ENV=test-only diagnostic email inbox
 * (see apps/api/src/routes/test-email.route.ts) — no real email is ever
 * sent, this is the "safe strategy for development/testing" the M3 brief
 * asks for. */
export async function getLinkToken(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.get(
    `${API_BASE}/auth/_test/emails?to=${encodeURIComponent(email)}`,
  );
  if (!response.ok()) {
    throw new Error(`No email captured for ${email}`);
  }
  const body = (await response.json()) as { url: string };
  const token = new URL(body.url).searchParams.get("token");
  if (!token) {
    throw new Error(`Link for ${email} had no token: ${body.url}`);
  }
  return token;
}

/**
 * Arranges a verified user directly via the API (not the UI) — keeps
 * login/logout/password-reset specs focused on their own golden path
 * instead of re-testing registration every time; registration itself has
 * its own dedicated UI-driven spec (registration.spec.ts).
 */
export async function registerAndVerifyUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const registerResponse = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password },
  });
  if (!registerResponse.ok()) {
    throw new Error(`Registration failed: ${registerResponse.status()}`);
  }

  const token = await getLinkToken(request, email);

  const verifyResponse = await request.post(`${API_BASE}/auth/email-verification/confirm`, {
    data: { token },
  });
  if (!verifyResponse.ok()) {
    throw new Error(`Verification failed: ${verifyResponse.status()}`);
  }
}
