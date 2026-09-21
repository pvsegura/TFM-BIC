import type { VocabularyItemId } from "./vocabulary-item-id.js";

/**
 * What is stored, in the order a word normally moves through:
 * - `saved`: the student put the word on their list to study.
 * - `learning`: the student is actively studying it.
 * - `learned`: the student says they know it.
 *
 * `new` — a word the student has done nothing with — is deliberately absent: it is the absence of
 * a record (`statusOf`), so there is no redundant row per student per word.
 */
export const STORED_VOCABULARY_STATUSES = ["saved", "learning", "learned"] as const;
export type StoredVocabularyStatus = (typeof STORED_VOCABULARY_STATUSES)[number];

/** What a student sees for a word: the stored statuses plus the derived `new`. */
export const VOCABULARY_VIEW_STATUSES = ["new", ...STORED_VOCABULARY_STATUSES] as const;
export type VocabularyStatus = (typeof VOCABULARY_VIEW_STATUSES)[number];

/**
 * One student's relationship to one vocabulary entry. It belongs to the student; the word itself
 * (lemma, meaning, language, category) belongs to the content and is never copied here, so
 * content is never duplicated per student.
 *
 * Invariant: `learnedAt` is set if and only if `status` is `learned`. Kept to what M9 needs —
 * review schedules, counters and difficulty belong to the spaced-repetition milestone and can be
 * added as further columns without touching this shape's meaning.
 */
export interface UserVocabularyEntry {
  userId: string;
  vocabularyItemId: VocabularyItemId;
  status: StoredVocabularyStatus;
  /** When the word first got a record (was first saved, started or marked learned). */
  createdAt: Date;
  updatedAt: Date;
  learnedAt: Date | null;
}

export function statusOf(entry: UserVocabularyEntry | null): VocabularyStatus {
  return entry === null ? "new" : entry.status;
}

/**
 * Every change of an *existing* record that is allowed, as data (`[from, to]`), so the storage
 * adapter can enforce exactly this list in one atomic statement instead of restating the rule.
 * Forward is always allowed (a student may skip a step: a word they already know can go straight
 * to `learned`); the one step back is `learned → learning` ("I forgot it"). Any other step back
 * is refused — to start over, remove the word and save it again. Creating a record (a word with
 * none) may target any status and is not listed.
 */
export const ALLOWED_STATUS_CHANGES: readonly (readonly [
  StoredVocabularyStatus,
  StoredVocabularyStatus,
])[] = [
  ["saved", "learning"],
  ["saved", "learned"],
  ["learning", "learned"],
  ["learned", "learning"],
];

export type StatusChange = "apply" | "unchanged" | "invalid";

/** `apply`: the record changes (or is created). `unchanged`: already there — a no-op, not an error. `invalid`: refused. */
export function evaluateStatusChange(
  from: StoredVocabularyStatus | null,
  to: StoredVocabularyStatus,
): StatusChange {
  if (from === null) {
    return "apply";
  }
  if (from === to) {
    return "unchanged";
  }
  return ALLOWED_STATUS_CHANGES.some(([a, b]) => a === from && b === to) ? "apply" : "invalid";
}

/**
 * Saving puts a word on the list and is safe to repeat: a word that already has a record keeps
 * it exactly as it is — saving a `learned` word never sends it back to `saved`.
 */
export function saveVocabularyItem(
  existing: UserVocabularyEntry | null,
  userId: string,
  vocabularyItemId: VocabularyItemId,
  now: Date,
): UserVocabularyEntry {
  return (
    existing ?? {
      userId,
      vocabularyItemId,
      status: "saved",
      createdAt: now,
      updatedAt: now,
      learnedAt: null,
    }
  );
}

export interface StatusChangeResult {
  change: StatusChange;
  /** The record after the change; the untouched existing record when nothing changed or it was refused. */
  entry: UserVocabularyEntry;
}

/**
 * Moves a word to `target` under `evaluateStatusChange`. The learned time is stamped when a word
 * becomes learned and cleared when it leaves that status, so it is never stale. A no-op or a
 * refused change returns the existing record itself, unmodified.
 */
export function changeVocabularyStatus(
  existing: UserVocabularyEntry | null,
  userId: string,
  vocabularyItemId: VocabularyItemId,
  target: StoredVocabularyStatus,
  now: Date,
): StatusChangeResult {
  const change = evaluateStatusChange(existing?.status ?? null, target);
  if (existing !== null && change !== "apply") {
    return { change, entry: existing };
  }
  return {
    change: "apply",
    entry: {
      userId,
      vocabularyItemId,
      status: target,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      learnedAt: target === "learned" ? now : null,
    },
  };
}
