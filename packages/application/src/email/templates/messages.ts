/**
 * Email wording, kept apart from rendering and from the use cases (M14). One entry per locale;
 * only English exists today because the whole interface is English (interface localisation is not
 * built yet). Adding a locale means adding an entry here — no template or use case changes.
 */
export const EMAIL_LOCALES = ["en"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "en";

export interface EmailMessages {
  readonly productName: string;
  readonly footerTransactional: string;
  readonly footerMarketing: string;
  readonly unsubscribeLabel: string;
  readonly linkFallback: string;
  readonly emailVerification: {
    readonly subject: string;
    readonly heading: string;
    readonly body: string;
    readonly action: string;
    readonly note: string;
  };
  readonly passwordReset: {
    readonly subject: string;
    readonly heading: string;
    readonly body: string;
    readonly action: string;
    readonly note: string;
  };
  readonly newsletterConfirmation: {
    readonly subject: string;
    readonly heading: string;
    readonly body: string;
    readonly action: string;
    readonly note: string;
  };
}

export const EMAIL_MESSAGES: Record<EmailLocale, EmailMessages> = {
  en: {
    productName: "TFM-BIC",
    footerTransactional:
      "This is an account email. It is sent because of an action on your account and is not a newsletter.",
    footerMarketing:
      "You receive this newsletter because you subscribed and confirmed your subscription.",
    unsubscribeLabel: "Unsubscribe",
    linkFallback: "If the button does not work, copy this link into your browser:",
    emailVerification: {
      subject: "Verify your email address",
      heading: "Confirm your email address",
      body: "Thanks for creating an account. Please confirm that this email address is yours.",
      action: "Verify email address",
      note: "This link expires in 24 hours. If you did not create an account, you can ignore this email.",
    },
    passwordReset: {
      subject: "Reset your password",
      heading: "Reset your password",
      body: "Someone asked to reset the password for your account. Use the link below to choose a new one.",
      action: "Choose a new password",
      note: "This link expires in 1 hour and can be used once. If you did not request a reset, you can ignore this email — your password will not change.",
    },
    newsletterConfirmation: {
      subject: "Confirm your newsletter subscription",
      heading: "Confirm your newsletter subscription",
      body: "You asked to receive our newsletter with news about lessons and features. Please confirm this request.",
      action: "Confirm subscription",
      note: "This link expires in 48 hours. If you did not ask for this, ignore this email — you will not be subscribed.",
    },
  },
};
