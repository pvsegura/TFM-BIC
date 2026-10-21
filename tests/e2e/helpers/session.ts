import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

import { API, PASSWORD } from "./config.js";
import { registerAndVerifyUser, uniqueEmail } from "./register-and-verify.js";
import { signInViaUi } from "./ui.js";

/** A fresh verified account (email prefixed by the spec), signed in through the real login form.
 * Returns the account's email. */
export async function arrangeSignedIn(
  page: Page,
  request: APIRequestContext,
  emailPrefix: string,
): Promise<string> {
  const email = uniqueEmail(emailPrefix);
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  return email;
}

/** Signs `email` in through the API on `request` (its cookie jar keeps the session) and returns
 * the user's id. */
export async function signInApi(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { id: string }).id;
}

export async function jsonOf<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}
