import type { LevelResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { LevelSelector } from "./level-selector.js";

const LEVELS: LevelResponse[] = [
  { id: "a1", label: "A1", status: "available" },
  { id: "a2", label: "A2", status: "planned" },
  { id: "b1", label: "B1", status: "planned" },
];

function renderSelector(levels: LevelResponse[] = LEVELS, selectedId?: string) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <LevelSelector
          levels={levels}
          selectedId={selectedId}
          getHref={(id) => `/learn/xx/${id}`}
        />
      ),
    },
  ]);
  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

describe("LevelSelector", () => {
  it("offers an available level as a link", () => {
    renderSelector();

    expect(screen.getByRole("link", { name: "A1" })).toHaveAttribute("href", "/learn/xx/a1");
  });

  it("does not offer a planned level as a link, and says so in words (not colour alone)", () => {
    renderSelector();

    expect(screen.queryByRole("link", { name: /A2/ })).not.toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent("A2");
    expect(items[1]).toHaveTextContent("Coming soon");
  });

  it("marks the selected level with aria-current and a visible check mark", () => {
    renderSelector(LEVELS, "a1");

    const selected = screen.getByRole("link", { name: "A1" });
    expect(selected).toHaveAttribute("aria-current", "true");
    expect(within(selected).getByTestId("selected-indicator")).toBeInTheDocument();
  });

  it("only puts the available levels in the keyboard tab order", async () => {
    const user = userEvent.setup();
    renderSelector([
      { id: "a1", label: "A1", status: "available" },
      { id: "a2", label: "A2", status: "planned" },
      { id: "b1", label: "B1", status: "available" },
    ]);

    await user.tab();
    expect(screen.getByRole("link", { name: "A1" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "B1" })).toHaveFocus();
  });

  it("is a labelled navigation region and works for any set of levels", () => {
    renderSelector([
      { id: "a1", label: "A1", status: "available" },
      { id: "c2", label: "C2", status: "available" },
    ]);

    const nav = screen.getByRole("navigation", { name: "Levels" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(expect.arrayContaining(["A1", "C2"]));
  });

  it("renders a language with no levels as an empty list without failing", () => {
    renderSelector([]);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
