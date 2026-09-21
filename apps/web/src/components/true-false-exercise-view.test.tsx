import type { ExerciseResponse } from "@tfm-bic/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TrueFalseExerciseView } from "./true-false-exercise-view.js";

type Statement = Extract<ExerciseResponse, { type: "true-false" }>;

const EXERCISE = {
  id: "pl-greetings-informal-hi",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "true-false",
  order: 20,
  instructionLanguage: "en",
  prompt: "Cześć is informal.",
  result: { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
} as unknown as Statement;

function renderView(overrides: Partial<Parameters<typeof TrueFalseExerciseView>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <TrueFalseExerciseView
      exercise={EXERCISE}
      language={{ locale: "pl-PL", direction: "ltr" }}
      disabled={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe("TrueFalseExerciseView", () => {
  it("presents the statement as the name of a group with two radio choices, True and False", () => {
    renderView();

    expect(screen.getByRole("group", { name: "Cześć is informal." })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.parentElement?.textContent)).toEqual([
      "True",
      "False",
    ]);
  });

  it("selects neither to begin with", () => {
    renderView();

    expect(screen.getByRole("radio", { name: "True" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "False" })).not.toBeChecked();
  });

  it("states the choice in words and marks it with a check, never by colour alone", async () => {
    const { user } = renderView();

    await user.click(screen.getByRole("radio", { name: "False" }));

    expect(screen.getByRole("radio", { name: "False" })).toBeChecked();
    expect(screen.getAllByTestId("selected-indicator")).toHaveLength(1);
  });

  it.each([
    ["True", true],
    ["False", false],
  ])("submits the boolean %s", async (name, expected) => {
    const { user, onSubmit } = renderView();

    await user.click(screen.getByRole("radio", { name }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it("does not treat False as 'no answer'", async () => {
    const { user, onSubmit } = renderView();

    await user.click(screen.getByRole("radio", { name: "False" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(false);
  });

  it("asks for an answer instead of submitting nothing", async () => {
    const { user, onSubmit } = renderView();

    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose an answer.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("works from the keyboard alone", async () => {
    const { user, onSubmit } = renderView();

    await user.tab();
    await user.keyboard("{ArrowDown}");
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("cannot be operated while disabled", () => {
    renderView({ disabled: true });

    expect(screen.getByRole("radio", { name: "True" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
  });
});
