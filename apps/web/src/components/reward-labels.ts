import type { PointTransactionResponse } from "@verbysia/contracts";
import { m } from "../i18n/index.js";

/**
 * What a student reads for each reason points can be earned. The reasons themselves are stable,
 * language-neutral keys from the API; only this table holds the words, so it is the one place
 * interface localisation would extend (the record is keyed by the contract's own type, so a new
 * reason cannot be added without a label).
 */
const REASON_LABELS: Record<PointTransactionResponse["reason"], string> = {
  "exercise-completed": m.learn.rewards.reasons["exercise-completed"] ?? "",
  "lesson-completed": m.learn.rewards.reasons["lesson-completed"] ?? "",
  "achievement-unlocked": m.learn.rewards.reasons["achievement-unlocked"] ?? "",
};

export function rewardReasonLabel(reason: PointTransactionResponse["reason"]): string {
  return REASON_LABELS[reason];
}

const numberFormat = new Intl.NumberFormat("en");

/** A whole number with digit grouping (`1,250`). */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** `+1 point` / `+10 points` — always with the word, so it reads the same to a screen reader. */
export function formatPointsEarned(amount: number): string {
  return `+${formatNumber(amount)} ${amount === 1 ? "point" : "points"}`;
}

/** A calendar date in the student's own time zone, for display next to a `<time>` element. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { dateStyle: "medium" });
}
