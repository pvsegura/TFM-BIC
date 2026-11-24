/**
 * The privacy notice (M15) — content, not code: the page only renders this structure, so wording
 * can change without touching any logic. It describes what the application **actually** stores
 * and does today (docs/privacy/M15-PRIVACY-DATA-MAP.md) and is a DRAFT: controller identity,
 * contact, legal bases, retention periods and transfer mechanisms are PENDING legal review and
 * are said to be pending rather than invented.
 *
 * Versioning: every published wording gets a new `privacy-policy-vN` id and a new entry in
 * `PRIVACY_NOTICE_VERSIONS`; an id is never reused or rewritten. Nothing records a user's
 * acknowledgement of a version yet — whether the product needs that is a PENDING decision
 * (docs/privacy/PROCESSING-REGISTER.md), and it is not the same thing as newsletter consent.
 */

import type { LegalDocument, LegalSection } from "./legal-document.js";

export type PrivacyNoticeSection = LegalSection;

export interface PrivacyNoticeVersion {
  readonly version: string;
  /** ISO date (YYYY-MM-DD). */
  readonly date: string;
  readonly summary: string;
}

export const PRIVACY_NOTICE_VERSIONS: readonly PrivacyNoticeVersion[] = [
  {
    version: "privacy-policy-v1",
    date: "2026-09-26",
    summary: "First draft, describing the application as built up to milestone M15.",
  },
  {
    version: "privacy-policy-v2",
    date: "2026-11-24",
    summary:
      "Adds purchases, licences and subscriptions (Stripe), the memory trainer, purchase emails and the hosting providers; reference-language version added.",
  },
];

export const PRIVACY_NOTICE = {
  version: "privacy-policy-v2",
  date: "2026-11-24",
  status: "draft-pending-legal-review",
  title: "Privacy notice",
  reviewNote:
    "This notice is a draft pending legal review. It describes what the application currently does, but it has not been reviewed by a legal professional yet, and some of the information below is still pending that review.",
  sections: [
    {
      id: "who",
      heading: "Who is responsible",
      paragraphs: [
        "The identity and contact details of the organisation responsible for your data (the controller) are pending legal review and will be added to this notice before the service is offered to the public.",
      ],
    },
    {
      id: "what",
      heading: "What we store",
      paragraphs: ["The application stores only what it needs to run your account and lessons:"],
      items: [
        "Account: your email address, your password (only as a one-way hash that cannot be read back), your role (student or teacher), whether your email address is verified, and when the account was created and last changed.",
        "Profile, if you fill it in: first name, last name, nickname and the avatar you picked.",
        "Learning activity: the lessons you started or completed, every exercise answer you submit and whether it was correct, your points and achievements, the vocabulary you saved and its status, your phonetics progress, and your video generation requests.",
        "Purchases: which product you bought, the amount, currency and date, the payment provider's references for the payment, customer and subscription, your subscription's status and renewal date, and the access (licences) they give you. Card details never reach us — they are handled by the payment provider.",
        "Memory trainer: the words you review, how well you remembered them and when each is due again.",
        "Email preferences: whether you subscribed to the newsletter, which version of the consent text you agreed to, and when you subscribed, confirmed or unsubscribed.",
        "Security: your sign-in sessions and the one-time links for email verification and password reset, stored only as hashes.",
        "Teacher links: if an operator linked your account to a teacher, that link and when it was created.",
        "Server logs: each request's method, path (without its query string) and IP address, and some events with your account's internal identifier — never your password, session, answers or exported data.",
      ],
    },
    {
      id: "browser",
      heading: "What is stored in your browser",
      paragraphs: [
        "A session cookie that keeps you signed in (it expires after 7 days or when you log out), and, in local storage, your light or dark mode choice, your interface language and — only if you try the free demo without an account — your demo progress, which stays on your device. The application uses no analytics, advertising or tracking technologies and loads no third-party scripts.",
      ],
    },
    {
      id: "why",
      heading: "Why it is used",
      paragraphs: ["Your information is used to:"],
      items: [
        "create your account, sign you in and keep it secure;",
        "run lessons and exercises and show your progress, points and achievements;",
        "send essential account emails, such as email verification and password resets, purchase confirmations and payment notices;",
        "take payments, grant the access you paid for and keep the records the law requires for sales;",
        "send the newsletter — only if you subscribed and confirmed by email;",
        "let a teacher linked to your account follow your learning progress.",
      ],
    },
    {
      id: "legal-basis",
      heading: "Legal basis",
      paragraphs: [
        "The legal basis for each of these uses is pending legal review. The newsletter is sent only with your explicit consent, which you can withdraw at any time.",
      ],
    },
    {
      id: "who-sees",
      heading: "Who can see it",
      paragraphs: [
        "You. A teacher linked to your account can see your names, nickname and avatar, your lesson, exercise and points progress, your recent activity and your achievements — never your email address, your submitted answers, your vocabulary or phonetics progress, your email preferences or your account settings. Operators with access to the database can see stored data.",
      ],
    },
    {
      id: "services",
      heading: "External services",
      items: [
        "Payments: Stripe (Stripe Payments Europe Ltd.) processes payments. When you buy, it receives your email address and account identifier from us and collects your payment details directly on its own page.",
        "Email: when an email provider is switched on (Resend), it receives your email address and the content of the emails sent to you.",
        "Speech audio: if the operator enables it, the text of a vocabulary word or example is sent to Google's Gemini API to generate audio. Nothing about you — no name, email address or account identifier — is sent. It is switched off by default.",
        "AI coach: if the operator enables it, the messages you write to the coach and a short summary of your learning progress (no name, email address or account identifier) are sent to Google's Gemini API to generate the reply. The conversation is not stored by the application.",
        "Video rendering: videos are rendered on the application's own server; nothing about you is sent anywhere.",
        "Hosting and database: the application runs on Render and its database on Neon (PostgreSQL). [Data locations and transfer safeguards pending legal review.]",
      ],
      paragraphs: [],
    },
    {
      id: "retention",
      heading: "How long it is kept",
      paragraphs: [
        "Your data is kept until you delete your account; deleting it removes your account data from the application's database. Records of sales may have to be kept for the periods tax and accounting law require, and the payment provider keeps its own records. Server logs are not removed by account deletion; how long they are kept depends on the hosting provider. Other retention periods are pending legal review.",
      ],
    },
    {
      id: "controls",
      heading: "Your controls",
      linkToProfile: true,
      paragraphs: ["You can, at any time and without contacting anyone:"],
      items: [
        "correct or clear your names, nickname and avatar;",
        "download a copy of your data as a machine-readable JSON file;",
        "unsubscribe from the newsletter — this keeps your account and your essential emails;",
        "delete your account and its data permanently (your password is required).",
      ],
    },
    {
      id: "rights",
      heading: "Your rights",
      paragraphs: [
        "Data protection law may give you rights over your personal data, such as access, correction, erasure, restriction of processing, data portability, objection and withdrawing consent. The controls above let you exercise several of them yourself. Changing your email address is not available yet. For any other request, the controller's contact details are pending (see “Who is responsible”).",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this notice",
      paragraphs: [
        "Each version of this notice has its own identifier, and earlier versions stay identifiable. This is version privacy-policy-v2.",
      ],
    },
  ],
} as const satisfies LegalDocument;
