import type { PhoneticRepresentationId } from "./phonetic-representation-id.js";

/**
 * What is stored, in the order a representation normally moves through. "not_started" is
 * deliberately absent: it is the absence of a record (`phoneticProgressStatusOf`), so there is no
 * redundant row per student per representation.
 */
export const PHONETIC_PROGRESS_STATUSES = ["viewed", "practiced", "completed"] as const;
export type StoredPhoneticProgressStatus = (typeof PHONETIC_PROGRESS_STATUSES)[number];

/** What a student sees for a representation: the stored statuses plus the derived `not_started`. */
export const PHONETIC_PROGRESS_VIEW_STATUSES = [
  "not_started",
  ...PHONETIC_PROGRESS_STATUSES,
] as const;
export type PhoneticProgressStatus = (typeof PHONETIC_PROGRESS_VIEW_STATUSES)[number];

/**
 * One student's progress on one phonetic representation. It belongs to the student; the
 * representation itself (its IPA, description, topic) belongs to the content and is never
 * duplicated here.
 *
 * Unlike vocabulary's saved/learning/learned, this progress only ever moves forward: there is no
 * "I forgot it" step back for a sound the way there is for a word, so `viewed → practiced →
 * completed` never reverses. `practicedAt`/`completedAt` are set once their status is first
 * reached and then kept refreshed by repeating the action, without changing the status again.
 *
 * Invariants: `completedAt` is set if and only if `status` is `completed`; `practicedAt` is set
 * once `status` has reached `practiced` or `completed`, `null` while only `viewed`.
 */
export interface UserPhoneticProgress {
  userId: string;
  phoneticRepresentationId: PhoneticRepresentationId;
  status: StoredPhoneticProgressStatus;
  /** When the representation was first viewed. */
  firstViewedAt: Date;
  /** When the representation was last viewed, practiced or completed. */
  lastViewedAt: Date;
  practicedAt: Date | null;
  completedAt: Date | null;
}

export function phoneticProgressStatusOf(
  progress: UserPhoneticProgress | null,
): PhoneticProgressStatus {
  return progress === null ? "not_started" : progress.status;
}

/**
 * Opening a representation records a view. The status only ever moves forward: viewing a
 * representation that is already practiced or completed never takes it back to viewed, but the
 * last-viewed time is always refreshed.
 */
export function recordPhoneticView(
  existing: UserPhoneticProgress | null,
  userId: string,
  phoneticRepresentationId: PhoneticRepresentationId,
  now: Date,
): UserPhoneticProgress {
  if (existing !== null) {
    return { ...existing, lastViewedAt: now };
  }
  return {
    userId,
    phoneticRepresentationId,
    status: "viewed",
    firstViewedAt: now,
    lastViewedAt: now,
    practicedAt: null,
    completedAt: null,
  };
}

/**
 * Practicing advances a viewed representation to practiced, and never takes a completed one back.
 * Practicing again — whatever the current status — refreshes when it was last practiced, so
 * repeated practice is always visible even after completion.
 */
export function recordPhoneticPractice(
  existing: UserPhoneticProgress | null,
  userId: string,
  phoneticRepresentationId: PhoneticRepresentationId,
  now: Date,
): UserPhoneticProgress {
  if (existing === null) {
    return {
      userId,
      phoneticRepresentationId,
      status: "practiced",
      firstViewedAt: now,
      lastViewedAt: now,
      practicedAt: now,
      completedAt: null,
    };
  }
  return {
    ...existing,
    status: existing.status === "viewed" ? "practiced" : existing.status,
    lastViewedAt: now,
    practicedAt: now,
  };
}

/**
 * Completing is the only way a representation becomes completed, and it is idempotent: an already
 * completed representation is returned as it is, keeping its original completion time, so
 * repeating the action changes nothing. A representation that was never viewed or practiced is
 * completed directly, all at the same moment.
 */
export function completePhonetic(
  existing: UserPhoneticProgress | null,
  userId: string,
  phoneticRepresentationId: PhoneticRepresentationId,
  now: Date,
): UserPhoneticProgress {
  if (existing?.status === "completed") {
    return existing;
  }
  return {
    userId,
    phoneticRepresentationId,
    status: "completed",
    firstViewedAt: existing?.firstViewedAt ?? now,
    lastViewedAt: now,
    practicedAt: existing?.practicedAt ?? null,
    completedAt: now,
  };
}
