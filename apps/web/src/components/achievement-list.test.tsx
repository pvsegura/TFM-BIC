import type { AchievementResponse } from "@tfm-bic/contracts";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AchievementList } from "./achievement-list.js";

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

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

function card(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  const item = heading.closest("li");
  if (!item) {
    throw new Error(`no card for ${title}`);
  }
  return within(item);
}

describe("AchievementList", () => {
  it("is a list of achievements, each with a title and a description", () => {
    render(<AchievementList achievements={[UNLOCKED, LOCKED]} />);

    const list = screen.getByRole("list", { name: "Achievements" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(card("First exercise").getByText(UNLOCKED.description)).toBeVisible();
    expect(card("Ten exercises").getByText(LOCKED.description)).toBeVisible();
  });

  it("shows an unlocked achievement as unlocked, with the date, in words", () => {
    render(<AchievementList achievements={[UNLOCKED]} />);

    const item = card("First exercise");
    expect(item.getByText(/^Unlocked /)).toHaveTextContent("Unlocked Jan 15, 2026");
    expect(item.queryByText("Locked")).not.toBeInTheDocument();
    expect(item.getByText("+50 points reward")).toBeVisible();
  });

  it("shows a locked achievement as locked, in words, with its progress", () => {
    render(<AchievementList achievements={[LOCKED]} />);

    const item = card("Ten exercises");
    expect(item.getByText("Locked")).toBeVisible();
    expect(item.queryByText(/^Unlocked /)).not.toBeInTheDocument();
    const progress = item.getByRole("progressbar", { name: "Ten exercises progress" });
    expect(progress).toHaveAttribute("value", "3");
    expect(progress).toHaveAttribute("max", "10");
    expect(item.getByText("3 / 10")).toBeVisible();
  });

  it("marks each card's state for assistive technology and for tests, not by colour alone", () => {
    render(<AchievementList achievements={[UNLOCKED, LOCKED]} />);

    expect(screen.getByRole("heading", { name: "First exercise" }).closest("li")).toHaveAttribute(
      "data-unlocked",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Ten exercises" }).closest("li")).toHaveAttribute(
      "data-unlocked",
      "false",
    );
  });

  it("keeps the same words and structure in dark mode", () => {
    document.documentElement.classList.add("dark");
    render(<AchievementList achievements={[UNLOCKED, LOCKED]} />);

    expect(card("First exercise").getByText(/^Unlocked /)).toBeVisible();
    expect(card("Ten exercises").getByText("Locked")).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });

  it("renders an empty catalog as an empty list without failing", () => {
    render(<AchievementList achievements={[]} />);

    expect(screen.getByRole("list", { name: "Achievements" })).toBeEmptyDOMElement();
  });

  it("renders the server's words as text, never as markup", () => {
    render(
      <AchievementList
        achievements={[{ ...LOCKED, title: "<b>bold</b>", description: "<script>x</script>" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "<b>bold</b>" })).toBeVisible();
    expect(document.querySelector("b, script")).toBeNull();
  });

  it("hides the decorative icons from assistive technology", () => {
    render(<AchievementList achievements={[UNLOCKED, LOCKED]} />);

    for (const icon of document.querySelectorAll("[data-testid='achievement-icon']")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });
});
