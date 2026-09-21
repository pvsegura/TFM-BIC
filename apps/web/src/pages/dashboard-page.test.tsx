import type { GamificationSummaryResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as gamificationApi from "../services/gamification-api.js";
import { DashboardPage } from "./dashboard-page.js";

const SUMMARY: GamificationSummaryResponse = {
  totalPoints: 185,
  achievements: { unlockedCount: 3, totalCount: 4 },
  inProgressAchievements: [],
  recentTransactions: [
    {
      id: 1,
      amount: 10,
      reason: "exercise-completed",
      sourceId: "pl-a",
      title: null,
      createdAt: "2026-01-15T12:00:00.000Z",
    },
  ],
};

function renderPage() {
  const Stub = createRoutesStub([{ path: "/dashboard", Component: DashboardPage }]);
  return renderWithProviders(<Stub initialEntries={["/dashboard"]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  it("has one level-one heading and the student's points from the API", async () => {
    vi.spyOn(gamificationApi, "fetchGamificationSummary").mockResolvedValue(SUMMARY);

    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    expect(await screen.findByText("185")).toBeVisible();
    expect(screen.getByText("3 / 4")).toBeVisible();
    expect(screen.getByText("Exercise completed")).toBeVisible();
  });

  it("makes exactly one request for the whole card, not one per achievement", async () => {
    const summary = vi
      .spyOn(gamificationApi, "fetchGamificationSummary")
      .mockResolvedValue(SUMMARY);
    const achievements = vi.spyOn(gamificationApi, "fetchAchievements");
    const history = vi.spyOn(gamificationApi, "fetchPointHistory");

    renderPage();
    await screen.findByText("185");

    expect(summary).toHaveBeenCalledTimes(1);
    expect(achievements).not.toHaveBeenCalled();
    expect(history).not.toHaveBeenCalled();
  });

  it("says it is loading while it waits, as a status message", () => {
    vi.spyOn(gamificationApi, "fetchGamificationSummary").mockReturnValue(
      new Promise(() => undefined),
    );

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Loading your progress…");
  });

  it("shows a fixed, safe message and a way to try again when the summary cannot be loaded", async () => {
    const spy = vi
      .spyOn(gamificationApi, "fetchGamificationSummary")
      .mockRejectedValueOnce(new ApiError("db exploded: secret-host", 500))
      .mockResolvedValue(SUMMARY);
    const user = userEvent.setup();

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't load your progress. Please try again.");
    expect(document.body).not.toHaveTextContent("secret-host");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("185")).toBeVisible();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("tells a student with no points how to earn their first, rather than showing an empty card", async () => {
    vi.spyOn(gamificationApi, "fetchGamificationSummary").mockResolvedValue({
      totalPoints: 0,
      achievements: { unlockedCount: 0, totalCount: 4 },
      inProgressAchievements: [],
      recentTransactions: [],
    });

    renderPage();

    expect(
      await screen.findByText(
        "No points yet. Complete an exercise or a lesson to earn your first points.",
      ),
    ).toBeVisible();
  });

  it("offers the way to the lessons", async () => {
    vi.spyOn(gamificationApi, "fetchGamificationSummary").mockResolvedValue(SUMMARY);

    renderPage();

    expect(await screen.findByRole("link", { name: "Go to lessons" })).toHaveAttribute(
      "href",
      "/learn/lessons",
    );
  });
});
