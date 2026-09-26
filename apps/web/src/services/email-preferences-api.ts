import {
  emailPreferencesResponseSchema,
  NEWSLETTER_CONSENT_VERSION,
  newsletterPreferenceResponseSchema,
  newsletterSubscriptionResponseSchema,
  type EmailPreferencesResponse,
  type NewsletterPreferenceResponse,
  type NewsletterSubscriptionResponse,
} from "@tfm-bic/contracts";
import { z } from "zod";

import { requestJson } from "./api-request.js";

/**
 * Email preferences and newsletter (M14). Same-origin like every other API path (see
 * vite.config.ts). The user and their address come from the session cookie; the public
 * confirm/unsubscribe calls send only the token from the emailed link.
 */
const PREFERENCES_URL = "/email-preferences";
const SUBSCRIPTION_URL = "/email-preferences/newsletter/subscription";
const CONFIRM_URL = "/email-preferences/newsletter/confirm";
const UNSUBSCRIBE_URL = "/email-preferences/newsletter/unsubscribe";

const JSON_HEADERS = { "Content-Type": "application/json" };
const newsletterEnvelopeSchema = z.object({ newsletter: newsletterPreferenceResponseSchema });

export async function fetchEmailPreferences(): Promise<EmailPreferencesResponse> {
  return emailPreferencesResponseSchema.parse(await requestJson(PREFERENCES_URL));
}

/** Double opt-in step 1: the user ticked the consent box for the current consent text. */
export async function subscribeToNewsletter(): Promise<NewsletterSubscriptionResponse> {
  const body = await requestJson(SUBSCRIPTION_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ consent: true, consentVersion: NEWSLETTER_CONSENT_VERSION }),
  });
  return newsletterSubscriptionResponseSchema.parse(body);
}

export async function unsubscribeFromNewsletter(): Promise<NewsletterPreferenceResponse> {
  const body = await requestJson(SUBSCRIPTION_URL, { method: "DELETE" });
  return newsletterEnvelopeSchema.parse(body).newsletter;
}

/** Double opt-in step 2, from the emailed link. */
export async function confirmNewsletterSubscription(
  token: string,
): Promise<NewsletterPreferenceResponse> {
  const body = await requestJson(CONFIRM_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token }),
  });
  return newsletterEnvelopeSchema.parse(body).newsletter;
}

/** Unsubscribe from the link in a newsletter — no login needed. */
export async function unsubscribeWithToken(token: string): Promise<void> {
  await requestJson(UNSUBSCRIBE_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ token }),
  });
}
