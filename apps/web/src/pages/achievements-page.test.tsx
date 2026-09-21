import type {
  AchievementResponse,
  AchievementsResponse,
  PointTransactionResponse,
} from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as gamificationApi from "../services/gamification-api.js";
import { AchievementsPage } from "./achievements-page.js";

const UNLOCKED: AchievementResponse = {
  key: "first-exercise",
  title: "First exercise",
  description: "Answer an exercise correctly for the first time.",
  iconId: "spark",
  rewardPoints: 50,
  unlocked: true,
  unlockedAt: "2026-01-15T12:00:00.000Z",
  progress: { current: 1, target: 1 },
};
const LOCKED: AchievementResponse = {
  key: "ten-correct-exercises",
  title: "Ten exercises",
  description: "Answer ten different exercises correctly.",
  iconId: "target",
  rewardPoints: 50,
  unlocked: false,
  unlockedAt: null,
  progress: { current: 3, target: 10 },
};
const ACHIEVEMENTS: AchievementsResponse = {
  achievements: [UNLOCKED, LOCKED],
  unlockedCount: 1,
  totalCount: 2,
};

const tx = (id: number, reason: PointTransactionResponse["reason"] = "exercise-completed") => ({
  id,
  amount: 10,
  reason,
  sourceId: `pl-ex-${String(id)}`,
  title: null,
  createdAt: "2026-01-15T12:00:00.000Z",
});

function mockApi() {
  return {
    achievements: vi.spyOn(gamificationApi, "fetchAchievements").mockResolvedValue(ACHIEVEMENTS),
    history: vi
      .spyOn(gamificationApi, "fetchPointHistory")
      .mockResolvedValue({ transactions: [tx(2), tx(1)], nextBefore: null }),
  };
}

function renderPage() {
  const Stub = createRoutesStub([{ path: "/achievements", Component: AchievementsPage }]);
  return renderWithProviders(<Stub initialEntries={["/achievements"]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AchievementsPage", () => {
  it("has one level-one heading, the count, and every achievement — unlocked and locked", async () => {
    mockApi();

    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Achievements" })).toBeVisible();
    expect(await screen.findByText("1 of 2 unlocked")).toBeVisible();
    expect(screen.getByRole("heading", { name: "First exercise" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ten exercises" })).toBeVisible();
    expect(screen.getByText("Locked")).toBeVisible();
    expect(screen.getByText("Unlocked Jan 15, 2026")).toBeVisible();
    expect(screen.getByText("3 / 10")).toBeVisible();
  });

  it("makes one request for all the achievements, however many there are", async () => {
    const api = mockApi();

    renderPage();
    await screen.findByText("1 of 2 unlocked");

    expect(api.achievements).toHaveBeenCalledTimes(1);
  });

  it("shows the points history under the achievements, newest first, with why each was earned", async () => {
    mockApi();

    renderPage();

    const history = await screen.findByRole("list", { name: "Points history" });
    expect(within(history).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "Points history" })).toBeVisible();
  });

  it("loads more history on request, following the cursor the server gave, and stops at the end", async () => {
    const api = mockApi();
    api.history
      .mockResolvedValueOnce({ transactions: [tx(3), tx(2)], nextBefore: 2 })
      .mockResolvedValueOnce({ transactions: [tx(1)], nextBefore: null });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Show more" }));

    const history = screen.getByRole("list", { name: "Points history" });
    await waitFor(() => {
      expect(within(history).getAllByRole("listitem")).toHaveLength(3);
    });
    expect(api.history).toHaveBeenNthCalledWith(2, 2);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("does not offer more history when there is no next page", async () => {
    mockApi();

    renderPage();
    await screen.findByRole("list", { name: "Points history" });

    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("says there is no history yet, rather than showing an empty list", async () => {
    const api = mockApi();
    api.history.mockResolvedValue({ transactions: [], nextBefore: null });

    renderPage();

    expect(
      await screen.findByText(
        "No points yet. Complete an exercise or a lesson to earn your first points.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "Points history" })).not.toBeInTheDocument();
  });

  it("says it is loading while it waits", () => {
    vi.spyOn(gamificationApi, "fetchAchievements").mockReturnValue(new Promise(() => undefined));
    vi.spyOn(gamificationApi, "fetchPointHistory").mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getAllByRole("status").map((s) => s.textContent)).toEqual(
      expect.arrayContaining(["Loading achievements…", "Loading points history…"]),
    );
  });

  it("shows a fixed, safe message and a retry when the achievements cannot be loaded", async () => {
    const api = mockApi();
    api.achievements
      .mockRejectedValueOnce(new ApiError("db exploded: secret-host", 500))
      .mockResolvedValue(ACHIEVEMENTS);
    const user = userEvent.setup();

    renderPage();

    const alert = await screen.findByText("We couldn't load your achievements. Please try again.");
    expect(alert).toBeVisible();
    expect(document.body).not.toHaveTextContent("secret-host");
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]!);
    expect(await screen.findByText("1 of 2 unlocked")).toBeVisible();
  });

  it("keeps the achievements when only the history fails, and says so", async () => {
    const api = mockApi();
    api.history.mockRejectedValue(new ApiError("Something went wrong.", 500));

    renderPage();

    expect(await screen.findByText("1 of 2 unlocked")).toBeVisible();
    expect(
      await screen.findByText("We couldn't load your points history. Please try again."),
    ).toBeVisible();
  });
});
