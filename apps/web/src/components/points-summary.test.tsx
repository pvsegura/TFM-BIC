import type { GamificationSummaryResponse } from "@tfm-bic/contracts";
import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { PointsSummary } from "./points-summary.js";

const SUMMARY: GamificationSummaryResponse = {
  totalPoints: 1250,
  achievements: { unlockedCount: 8, totalCount: 20 },
  inProgressAchievements: [
    {
      key: "ten-correct-exercises",
      title: "Ten exercises",
      description: "Answer ten different exercises correctly.",
      iconId: "target",
      rewardPoints: 50,
      unlocked: false,
      unlockedAt: null,
      progress: { current: 3, target: 10 },
    },
  ],
  recentTransactions: [
    {
      id: 3,
      amount: 10,
      reason: "exercise-completed",
      sourceId: "pl-a",
      title: null,
      createdAt: "2026-01-15T12:00:00.000Z",
    },
    {
      id: 2,
      amount: 25,
      reason: "lesson-completed",
      sourceId: "pl-b",
      title: null,
      createdAt: "2026-01-14T12:00:00.000Z",
    },
    {
      id: 1,
      amount: 50,
      reason: "achievement-unlocked",
      sourceId: "first-exercise",
      title: "First exercise",
      createdAt: "2026-01-13T12:00:00.000Z",
    },
  ],
};

const EMPTY: GamificationSummaryResponse = {
  totalPoints: 0,
  achievements: { unlockedCount: 0, totalCount: 4 },
  inProgressAchievements: [],
  recentTransactions: [],
};

function renderSummary(summary: GamificationSummaryResponse) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <PointsSummary summary={summary} /> },
    { path: "/achievements", Component: () => <p>Achievements page</p> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("PointsSummary", () => {
  it("shows the total points, with digit grouping", () => {
    renderSummary(SUMMARY);

    expect(screen.getByText("1,250")).toBeVisible();
    expect(screen.getByText("Total points")).toBeVisible();
  });

  it("shows how many achievements are unlocked out of how many exist, and links to them", () => {
    renderSummary(SUMMARY);

    expect(screen.getByText("8 / 20")).toBeVisible();
    expect(screen.getByRole("link", { name: "View all achievements" })).toHaveAttribute(
      "href",
      "/achievements",
    );
  });

  it("lists the recent rewards with what each was for", () => {
    renderSummary(SUMMARY);

    const recent = screen.getByRole("list", { name: "Points history" });
    const items = within(recent).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("+10");
    expect(items[0]).toHaveTextContent("Exercise completed");
    expect(items[1]).toHaveTextContent("Lesson completed");
    expect(items[2]).toHaveTextContent("Achievement unlocked: First exercise");
  });

  it("shows the achievements the student is closest to, with their progress", () => {
    renderSummary(SUMMARY);

    expect(screen.getByRole("heading", { name: "Closest achievements" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Ten exercises progress" })).toHaveAttribute(
      "value",
      "3",
    );
    expect(screen.getByText("3 / 10")).toBeVisible();
  });

  it("says how to earn the first points when there are none, instead of an empty box", () => {
    renderSummary(EMPTY);

    expect(screen.getByText("0")).toBeVisible();
    expect(screen.getByText("0 / 4")).toBeVisible();
    expect(
      screen.getByText(
        "No points yet. Complete an exercise or a lesson to earn your first points.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "Points history" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Closest achievements" })).not.toBeInTheDocument();
  });

  it("is a labelled region with a heading hierarchy a screen reader can navigate", () => {
    renderSummary(SUMMARY);

    const region = screen.getByRole("region", { name: "Your points" });
    expect(within(region).getByRole("heading", { level: 2, name: "Your points" })).toBeVisible();
    expect(within(region).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
  });
});
