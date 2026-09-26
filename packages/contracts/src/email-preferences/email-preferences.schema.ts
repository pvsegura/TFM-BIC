import { z } from "zod";

/**
 * Email preferences and newsletter (M14, ADR-025). Request bodies are strict and carry no identity
 * or address: the user and their email always come from the session (or, for the public token
 * routes, from the token alone).
 */

export const newsletterSubscriptionRequestSchema = z
  .object({
    /** Must be literally `true`: an explicit, affirmative choice — never a default. */
    consent: z.literal(true),
    /** The consent text version shown to the user (see NEWSLETTER_CONSENT_VERSION). */
    consentVersion: z.string().min(1).max(100),
  })
  .strict();

export type NewsletterSubscriptionRequest = z.infer<typeof newsletterSubscriptionRequestSchema>;

/** Confirmation (double opt-in) and link-based unsubscribe both send only the emailed token. */
export const newsletterTokenRequestSchema = z
  .object({
    token: z.string().min(1).max(512),
  })
  .strict();

export type NewsletterTokenRequest = z.infer<typeof newsletterTokenRequestSchema>;

export const NEWSLETTER_PREFERENCE_STATUS_VALUES = [
  "not_subscribed",
  "pending",
  "subscribed",
] as const;

export const newsletterPreferenceResponseSchema = z.object({
  status: z.enum(NEWSLETTER_PREFERENCE_STATUS_VALUES),
  since: z.iso.datetime().nullable(),
});

export type NewsletterPreferenceResponse = z.infer<typeof newsletterPreferenceResponseSchema>;

export const emailPreferencesResponseSchema = z.object({
  /** Account and security email: always on, not a user choice. */
  essential: z.object({ enabled: z.literal(true), required: z.literal(true) }),
  newsletter: newsletterPreferenceResponseSchema,
});

export type EmailPreferencesResponse = z.infer<typeof emailPreferencesResponseSchema>;

export const newsletterSubscriptionResponseSchema = z.object({
  newsletter: newsletterPreferenceResponseSchema,
  confirmationEmailSent: z.boolean(),
});

export type NewsletterSubscriptionResponse = z.infer<typeof newsletterSubscriptionResponseSchema>;
