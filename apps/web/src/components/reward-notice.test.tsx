import type { RewardsResponse } from "@tfm-bic/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RewardNotice } from "./reward-notice.js";

const FIRST_EXERCISE = {
  key: "first-exercise",
  title: "First exercise",
  description: "Answer an exercise correctly for the first time.",
  iconId: "spark",
  rewardPoints: 50,
} as const;

describe("RewardNotice", () => {
  it("says how many points were earned", () => {
    render(<RewardNotice rewards={{ pointsAwarded: 10, achievementsUnlocked: [] }} />);

    expect(screen.getByText("+10 points")).toBeVisible();
  });

  it("uses the singular for one point", () => {
    render(<RewardNotice rewards={{ pointsAwarded: 1, achievementsUnlocked: [] }} />);

    expect(screen.getByText("+1 point")).toBeVisible();
  });

  it("names each achievement that was unlocked, with its description and its reward", () => {
    const rewards: RewardsResponse = {
      pointsAwarded: 60,
      achievementsUnlocked: [FIRST_EXERCISE],
    };
    render(<RewardNotice rewards={rewards} />);

    const list = screen.getByRole("list", { name: "Achievements unlocked" });
    const item = within(list).getByRole("listitem");
    expect(item).toHaveTextContent("Achievement unlocked: First exercise");
    expect(item).toHaveTextContent("Answer an exercise correctly for the first time.");
    expect(item).toHaveTextContent("+50 points");
    expect(screen.getByText("+60 points")).toBeVisible();
  });

  it("lists several unlocked achievements in the order given", () => {
    render(
      <RewardNotice
        rewards={{
          pointsAwarded: 125,
          achievementsUnlocked: [
            FIRST_EXERCISE,
            { ...FIRST_EXERCISE, key: "hundred-points", title: "One hundred points" },
          ],
        }}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("First exercise");
    expect(items[1]).toHaveTextContent("One hundred points");
  });

  it("renders nothing when nothing was earned — a repeat, or a wrong answer", () => {
    const { container } = render(
      <RewardNotice rewards={{ pointsAwarded: 0, achievementsUnlocked: [] }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the server's words as text, never as markup", () => {
    render(
      <RewardNotice
        rewards={{
          pointsAwarded: 50,
          achievementsUnlocked: [{ ...FIRST_EXERCISE, title: "<img src=x onerror=alert(1)>" }],
        }}
      />,
    );

    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  it("hides the decorative icon from assistive technology", () => {
    render(
      <RewardNotice rewards={{ pointsAwarded: 50, achievementsUnlocked: [FIRST_EXERCISE] }} />,
    );

    expect(document.querySelector("[data-testid='achievement-icon']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
