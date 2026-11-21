/**
 * PUENTE's spaced-repetition scheduler: SM-2 (Woźniak, 1990) adapted to four answer buttons.
 * Pure and deterministic — the caller passes `now`, so a review can be replayed from its log.
 * Rationale and button mapping: docs/product/verbysia/METODO-PUENTE.md §3.
 */

/** The learner's self-assessment, shown in Polish as Nie pamiętam / Trudne / Dobrze / Łatwe. */
export const RECALL_GRADES = ["again", "hard", "good", "easy"] as const;
export type RecallGrade = (typeof RECALL_GRADES)[number];

export function isRecallGrade(value: string): value is RecallGrade {
  return RECALL_GRADES.some((grade) => grade === value);
}

export interface MemoryCardSchedule {
  /** Consecutive successful reviews (reset by `again`). */
  repetitions: number;
  /** Days until the next review after the last one. */
  intervalDays: number;
  /** SM-2 easiness factor, never below {@link MIN_EASE}. */
  ease: number;
  dueAt: Date;
  lapses: number;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** A failed card comes back within the same study session rather than tomorrow. */
const RELEARN_DELAY_MS = 10 * 60 * 1000;

const SM2_QUALITY: Record<RecallGrade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function newMemoryCardSchedule(now: Date): MemoryCardSchedule {
  return { repetitions: 0, intervalDays: 0, ease: INITIAL_EASE, dueAt: now, lapses: 0 };
}

/** SM-2's easiness update for quality q (0–5). */
function nextEase(ease: number, quality: number): number {
  const updated = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASE, Math.round(updated * 100) / 100);
}

export function scheduleReview(
  card: MemoryCardSchedule,
  grade: RecallGrade,
  now: Date,
): MemoryCardSchedule {
  const quality = SM2_QUALITY[grade];
  const ease = nextEase(card.ease, quality);

  if (grade === "again") {
    return {
      repetitions: 0,
      intervalDays: 0,
      ease,
      dueAt: new Date(now.getTime() + RELEARN_DELAY_MS),
      lapses: card.lapses + 1,
    };
  }

  let intervalDays: number;
  if (card.repetitions === 0) {
    intervalDays = 1;
  } else if (card.repetitions === 1) {
    intervalDays = grade === "hard" ? 3 : 6;
  } else if (grade === "hard") {
    intervalDays = Math.max(1, Math.round(card.intervalDays * 1.2));
  } else {
    intervalDays = Math.round(card.intervalDays * ease);
  }
  if (grade === "easy") {
    intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * 1.3));
  }

  return {
    repetitions: card.repetitions + 1,
    intervalDays,
    ease,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    lapses: card.lapses,
  };
}

/** A card the learner keeps struggling with — offered again with a fresh association. */
export function isDifficultCard(card: Pick<MemoryCardSchedule, "ease" | "lapses">): boolean {
  return card.ease < 1.8 || card.lapses >= 3;
}
