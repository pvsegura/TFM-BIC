import type { ExerciseResponse } from "@tfm-bic/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MultipleChoiceExerciseView } from "./multiple-choice-exercise-view.js";

type Choice = Extract<ExerciseResponse, { type: "multiple-choice" }>;

// Branded ids are plain strings at runtime; the API client validates them for real.
const EXERCISE = {
  id: "pl-greetings-polite-hello",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "multiple-choice",
  order: 10,
  instructionLanguage: "en",
  prompt: "Which greeting is polite?",
  options: [
    { id: "a", text: "Dzień dobry" },
    { id: "b", text: "Cześć" },
    { id: "c", text: "Dobranoc" },
  ],
  result: { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
} as unknown as Choice;

function renderView(overrides: Partial<Parameters<typeof MultipleChoiceExerciseView>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <MultipleChoiceExerciseView
      exercise={EXERCISE}
      language={{ locale: "pl-PL", direction: "ltr" }}
      disabled={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe("MultipleChoiceExerciseView", () => {
  it("presents the prompt as the name of a group of radio options, in the order given", () => {
    renderView();

    const group = screen.getByRole("group", { name: "Which greeting is polite?" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.parentElement?.textContent)).toEqual([
      "Dzień dobry",
      "Cześć",
      "Dobranoc",
    ]);
  });

  it("selects nothing to begin with, so it gives nothing away", () => {
    renderView();

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeChecked();
    }
  });

  it("writes the prompt in the instruction language", () => {
    renderView();

    expect(screen.getByText("Which greeting is polite?")).toHaveAttribute("lang", "en");
  });

  it("makes the selected option visible: checked, and marked with a check beside its text", async () => {
    const { user } = renderView();

    await user.click(screen.getByRole("radio", { name: "Cześć" }));

    expect(screen.getByRole("radio", { name: "Cześć" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dobranoc" })).not.toBeChecked();
    expect(screen.getAllByTestId("selected-indicator")).toHaveLength(1);
  });

  it("can be operated from the keyboard alone: tab into the group, arrows to choose, then submit", async () => {
    const { user, onSubmit } = renderView();

    await user.tab();
    expect(screen.getByRole("radio", { name: "Dzień dobry" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Cześć" })).toBeChecked();
    await user.tab();
    expect(screen.getByRole("button", { name: "Check answer" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("b");
  });

  it("submits the id of the chosen option — never its text", async () => {
    const { user, onSubmit } = renderView();

    await user.click(screen.getByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("asks for an answer, accessibly, instead of submitting nothing", async () => {
    const { user, onSubmit } = renderView();

    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose an answer.");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Which greeting is polite?" })).toHaveAttribute(
      "aria-describedby",
    );
  });

  it("clears that message as soon as an option is chosen", async () => {
    const { user } = renderView();
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await user.click(screen.getByRole("radio", { name: "Cześć" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("cannot be operated while disabled (a submission is in flight, or a verdict is showing)", async () => {
    const { user, onSubmit } = renderView({ disabled: true });

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows option text as text: markup in it is inert and creates no element", () => {
    const hostile = {
      ...EXERCISE,
      options: [
        { id: "a", text: "<img src=x onerror=alert(1)>" },
        { id: "b", text: "<script>alert(2)</script>" },
      ],
    };
    const { container } = render(
      <MultipleChoiceExerciseView
        exercise={hostile}
        language={undefined}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img, script")).toBeNull();
  });
});
