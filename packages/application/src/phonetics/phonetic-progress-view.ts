import {
  phoneticProgressStatusOf,
  type PhoneticProgressStatus,
  type UserPhoneticProgress,
} from "@tfm-bic/domain";

/** A student's own progress on one representation, as the rest of the system sees it: always
 * present, with `not_started` (and no times) standing in for "no record yet". */
export interface PhoneticUserProgressView {
  status: PhoneticProgressStatus;
  firstViewedAt: Date | null;
  lastViewedAt: Date | null;
  practicedAt: Date | null;
  completedAt: Date | null;
}

export function toPhoneticProgressView(
  progress: UserPhoneticProgress | null,
): PhoneticUserProgressView {
  return {
    status: phoneticProgressStatusOf(progress),
    firstViewedAt: progress?.firstViewedAt ?? null,
    lastViewedAt: progress?.lastViewedAt ?? null,
    practicedAt: progress?.practicedAt ?? null,
    completedAt: progress?.completedAt ?? null,
  };
}
