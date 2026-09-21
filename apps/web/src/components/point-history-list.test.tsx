import type { PointTransactionResponse } from "@tfm-bic/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PointHistoryList } from "./point-history-list.js";

const EXERCISE: PointTransactionResponse = {
  id: 1,
  amount: 10,
  reason: "exercise-completed",
  sourceId: "pl-greetings-polite-hello",
  title: null,
  createdAt: "2026-01-15T12:00:00.000Z",
};
const LESSON: PointTransactionResponse = {
  id: 2,
  amount: 25,
  reason: "lesson-completed",
  sourceId: "pl-greetings",
  title: null,
  createdAt: "2026-01-16T12:00:00.000Z",
};
const ACHIEVEMENT: PointTransactionResponse = {
  id: 3,
  amount: 50,
  reason: "achievement-unlocked",
  sourceId: "first-exercise",
  title: "First exercise",
  createdAt: "2026-01-17T12:00:00.000Z",
};

describe("PointHistoryList", () => {
  it("says how the points were earned: the amount and the reason, in the order given", () => {
    render(<PointHistoryList transactions={[ACHIEVEMENT, LESSON, EXERCISE]} />);

    const items = within(screen.getByRole("list", { name: "Points history" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("+50");
    expect(items[0]).toHaveTextContent("Achievement unlocked: First exercise");
    expect(items[1]).toHaveTextContent("+25");
    expect(items[1]).toHaveTextContent("Lesson completed");
    expect(items[2]).toHaveTextContent("+10");
    expect(items[2]).toHaveTextContent("Exercise completed");
  });

  it("shows when each reward happened, as a machine-readable date too", () => {
    render(<PointHistoryList transactions={[EXERCISE]} />);

    const time = screen.getByText("Jan 15, 2026");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-01-15T12:00:00.000Z");
  });

  it("reads the amount as points for a screen reader, not just a signed number", () => {
    render(<PointHistoryList transactions={[EXERCISE]} />);

    expect(screen.getByRole("listitem")).toHaveTextContent("+10 points");
  });

  it("never shows an internal id such as an exercise id or a student id", () => {
    render(<PointHistoryList transactions={[EXERCISE, LESSON]} />);

    expect(document.body).not.toHaveTextContent("pl-greetings");
  });

  it("falls back to the plain reason for an achievement without a title", () => {
    render(<PointHistoryList transactions={[{ ...ACHIEVEMENT, title: null }]} />);

    expect(screen.getByRole("listitem")).toHaveTextContent("Achievement unlocked");
  });

  it("renders the server's words as text, never as markup", () => {
    render(<PointHistoryList transactions={[{ ...ACHIEVEMENT, title: "<b>x</b>" }]} />);

    expect(screen.getByText(/<b>x<\/b>/)).toBeVisible();
    expect(document.querySelector("b")).toBeNull();
  });
});
