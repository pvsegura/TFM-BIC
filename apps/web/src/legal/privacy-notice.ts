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

export interface PrivacyNoticeSection {
  readonly id: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
  /** Adds a sentence pointing to the profile page's controls. */
  readonly linkToProfile?: boolean;
}

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
];

export const PRIVACY_NOTICE = {
  version: "privacy-policy-v1",
  date: "2026-09-26",
  status: "draft-pending-legal-review",
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
        "A session cookie that keeps you signed in (it expires after 7 days or when you log out), and your light or dark mode choice in local storage. The application uses no analytics, advertising or tracking technologies and loads no third-party scripts.",
      ],
    },
    {
      id: "why",
      heading: "Why it is used",
      paragraphs: ["Your information is used to:"],
      items: [
        "create your account, sign you in and keep it secure;",
        "run lessons and exercises and show your progress, points and achievements;",
        "send essential account emails, such as email verification and password resets;",
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
        "Email: no external email provider is connected yet, so no email about you is handed to a third party. When one is chosen, it will receive your email address and the content of the emails sent to you, and this notice will be updated.",
        "Speech audio: if the operator enables it, the text of a vocabulary word or example is sent to Google's Gemini API to generate audio. Nothing about you — no name, email address or account identifier — is sent. It is switched off by default.",
        "Video rendering: videos are rendered on the application's own server; nothing about you is sent anywhere.",
        "Hosting and database: the hosting provider has not been chosen yet; this notice will name it.",
      ],
      paragraphs: [],
    },
    {
      id: "retention",
      heading: "How long it is kept",
      paragraphs: [
        "Your data is kept until you delete your account; deleting it removes everything listed above from the application's database at once. Server logs are not part of that database and are not removed by account deletion; how long they are kept depends on the hosting provider, which has not been chosen yet. No other retention periods have been defined yet — they are pending legal review.",
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
        "Each version of this notice has its own identifier, and earlier versions stay identifiable. This is version privacy-policy-v1.",
      ],
    },
  ] satisfies readonly PrivacyNoticeSection[],
} as const;
