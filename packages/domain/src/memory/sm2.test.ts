import { describe, expect, it } from "vitest";

import { isDifficultCard, MIN_EASE, newMemoryCardSchedule, scheduleReview } from "./sm2.js";

const now = new Date("2026-11-21T10:00:00.000Z");
const days = (card: { dueAt: Date }) => (card.dueAt.getTime() - now.getTime()) / 86_400_000;

describe("scheduleReview", () => {
  it("grows the interval 1 → 6 → interval × ease for good answers", () => {
    const first = scheduleReview(newMemoryCardSchedule(now), "good", now);
    expect(first.intervalDays).toBe(1);
    const second = scheduleReview(first, "good", now);
    expect(second.intervalDays).toBe(6);
    const third = scheduleReview(second, "good", now);
    expect(third.intervalDays).toBe(Math.round(6 * third.ease));
    expect(days(third)).toBe(third.intervalDays);
  });

  it("brings a forgotten card back in the same session and counts the lapse", () => {
    const learnt = scheduleReview(
      scheduleReview(newMemoryCardSchedule(now), "good", now),
      "good",
      now,
    );
    const forgotten = scheduleReview(learnt, "again", now);
    expect(forgotten.repetitions).toBe(0);
    expect(forgotten.lapses).toBe(1);
    expect(days(forgotten)).toBeLessThan(1);
    expect(forgotten.ease).toBeLessThan(learnt.ease);
  });

  it("never lets the ease fall below the minimum", () => {
    let card = newMemoryCardSchedule(now);
    for (let i = 0; i < 20; i += 1) card = scheduleReview(card, "again", now);
    expect(card.ease).toBe(MIN_EASE);
    expect(isDifficultCard(card)).toBe(true);
  });

  it("gives easy answers a longer interval than good ones", () => {
    const base = scheduleReview(
      scheduleReview(newMemoryCardSchedule(now), "good", now),
      "good",
      now,
    );
    expect(scheduleReview(base, "easy", now).intervalDays).toBeGreaterThan(
      scheduleReview(base, "good", now).intervalDays,
    );
  });
});
