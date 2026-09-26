/**
 * Every email the platform can send belongs to exactly one category (ADR-014, M14):
 *
 * - `transactional` — account, security and service messages the user needs regardless of any
 *   marketing choice (verification, password reset, the newsletter's own double opt-in
 *   confirmation). Never gated on marketing consent, never "unsubscribable".
 * - `marketing` — the newsletter. Sent only to a confirmed subscription and always carries an
 *   unsubscribe link.
 *
 * The category follows from the template, never from the caller, so no use case can send a
 * newsletter "as transactional" to skip the consent check.
 */
export const EMAIL_CATEGORIES = ["transactional", "marketing"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const TRANSACTIONAL_TEMPLATE_IDS = [
  "email-verification",
  "password-reset",
  "newsletter-confirmation",
] as const;
export type TransactionalTemplateId = (typeof TRANSACTIONAL_TEMPLATE_IDS)[number];

export const MARKETING_TEMPLATE_IDS = ["newsletter-issue"] as const;
export type MarketingTemplateId = (typeof MARKETING_TEMPLATE_IDS)[number];

export type EmailTemplateId = TransactionalTemplateId | MarketingTemplateId;

export const EMAIL_TEMPLATE_IDS: readonly EmailTemplateId[] = [
  ...TRANSACTIONAL_TEMPLATE_IDS,
  ...MARKETING_TEMPLATE_IDS,
];

export function isTransactionalTemplate(value: string): value is TransactionalTemplateId {
  return (TRANSACTIONAL_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function isMarketingTemplate(value: string): value is MarketingTemplateId {
  return (MARKETING_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function categoryOfTemplate(template: EmailTemplateId): EmailCategory {
  return isMarketingTemplate(template) ? "marketing" : "transactional";
}
