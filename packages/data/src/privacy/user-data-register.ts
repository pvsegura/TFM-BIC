import type { UserDataRegisterEntry } from "@tfm-bic/domain";

/**
 * Every table that holds rows about a user, what they are, and what account deletion does to
 * them (M15, ADR-026) — the code form of docs/privacy/DATA-DELETION-MATRIX.md. The erasure store
 * deletes from exactly these tables, in this order, then deletes `users` last.
 *
 * `user-data-register.test.ts` compares this list against the live schema: a new table, or a new
 * foreign key to `users`, fails that test until it is added here with a deliberate disposition.
 * Every current store is deleted: no table holds data with a documented retention requirement
 * (there is no billing or financial data). A legal/product decision to retain or anonymise a
 * category would be recorded here, with its reason, and in the matrix — never assumed.
 */
export const USER_DATA_REGISTER: readonly UserDataRegisterEntry[] = [
  // Identity (M3) — credentials first, so a failure after this point cannot leave a live session.
  {
    store: "sessions",
    context: "identity",
    userReferences: ["user_id"],
    classification: "SECURITY_SENSITIVE",
    erasure: "delete",
  },
  {
    store: "email_verification_tokens",
    context: "identity",
    userReferences: ["user_id"],
    classification: "SECURITY_SENSITIVE",
    erasure: "delete",
  },
  {
    store: "password_reset_tokens",
    context: "identity",
    userReferences: ["user_id"],
    classification: "SECURITY_SENSITIVE",
    erasure: "delete",
  },
  // Newsletter (M14) — the consent record; its deletion also invalidates every unsubscribe link.
  {
    store: "newsletter_subscriptions",
    context: "newsletter",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  // Teaching (M13) — both directions: as a student and as a teacher.
  {
    store: "teacher_students",
    context: "teaching",
    userReferences: ["teacher_id", "student_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "student_profiles",
    context: "profile",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "lesson_progress",
    context: "lessons",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "exercise_attempts",
    context: "exercises",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    // Immutable against UPDATE (M8 trigger); DELETE is allowed precisely for this workflow.
    store: "point_transactions",
    context: "gamification",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "user_achievements",
    context: "gamification",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "user_vocabulary",
    context: "vocabulary",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "user_phonetic_progress",
    context: "phonetics",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  {
    store: "video_generation_jobs",
    context: "video",
    userReferences: ["user_id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
  // The account itself — deleted last. Its "user reference" is its own primary key.
  {
    store: "users",
    context: "identity",
    userReferences: ["id"],
    classification: "PERSONAL",
    erasure: "delete",
  },
];

/** Tables that hold no data about a user. None today; listing one here is a deliberate claim. */
export const NON_USER_STORES: readonly string[] = [];
