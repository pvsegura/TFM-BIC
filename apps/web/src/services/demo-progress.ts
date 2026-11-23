import type { ExerciseAnswerRequest } from "@verbysia/contracts";

import { completeLesson, startLesson } from "./lessons-api.js";
import { submitAnswer } from "./exercises-api.js";

/**
 * What a visitor did in the free demo, kept in this browser only (a per-browser convenience, like
 * the theme). When they sign in, `syncDemoProgress` replays it into their account — lessons are
 * started and completed, answers submitted — and then clears it. Storage can be unavailable
 * (private mode): everything degrades to "no saved progress".
 */
const KEY = "verbysia-demo-progress";

export interface DemoProgress {
  completedLessons: string[];
  answers: Record<string, ExerciseAnswerRequest["answer"]>;
}

const EMPTY: DemoProgress = { completedLessons: [], answers: {} };

export function readDemoProgress(): DemoProgress {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return { ...EMPTY, answers: {} };
    const parsed = JSON.parse(raw) as Partial<DemoProgress>;
    return {
      completedLessons: Array.isArray(parsed.completedLessons)
        ? parsed.completedLessons.filter((id): id is string => typeof id === "string").slice(0, 50)
        : [],
      answers: parsed.answers && typeof parsed.answers === "object" ? { ...parsed.answers } : {},
    };
  } catch {
    return { ...EMPTY, answers: {} };
  }
}

function write(progress: DemoProgress): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage blocked: the demo still works, progress just isn't kept.
  }
}

export function recordDemoAnswer(
  exerciseId: string,
  answer: ExerciseAnswerRequest["answer"],
): void {
  const progress = readDemoProgress();
  progress.answers[exerciseId] = answer;
  write(progress);
}

export function recordDemoLessonCompleted(lessonId: string): void {
  const progress = readDemoProgress();
  if (!progress.completedLessons.includes(lessonId)) progress.completedLessons.push(lessonId);
  write(progress);
}

export function hasDemoProgress(): boolean {
  const progress = readDemoProgress();
  return progress.completedLessons.length > 0 || Object.keys(progress.answers).length > 0;
}

export function clearDemoProgress(): void {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Replays the demo into the signed-in account, then clears it. Each step is independent: one that
 * fails (an exercise removed since, a network blip) does not stop the others. Returns how many
 * steps succeeded.
 */
export async function syncDemoProgress(): Promise<number> {
  const progress = readDemoProgress();
  let synced = 0;
  for (const [exerciseId, answer] of Object.entries(progress.answers)) {
    try {
      await submitAnswer(exerciseId, answer);
      synced += 1;
    } catch {
      // Skipped: the rest still syncs.
    }
  }
  for (const lessonId of progress.completedLessons) {
    try {
      await startLesson(lessonId);
      await completeLesson(lessonId);
      synced += 1;
    } catch {
      // Skipped.
    }
  }
  clearDemoProgress();
  return synced;
}
