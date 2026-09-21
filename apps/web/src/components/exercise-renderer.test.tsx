import type { ExerciseResponse } from "@tfm-bic/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExerciseRenderer } from "./exercise-renderer.js";
import { describeCorrectAnswer, exerciseTypeLabel } from "./exercise-view-registry.js";

const BASE = {
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  order: 10,
  instructionLanguage: "en",
  result: { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
};

const CHOICE = {
  ...BASE,
  id: "pl-a-choice",
  type: "multiple-choice",
  prompt: "Pick one",
  options: [
    { id: "a", text: "Dzień dobry" },
    { id: "b", text: "Cześć" },
  ],
} as unknown as ExerciseResponse;
const TYPED = {
  ...BASE,
  id: "pl-a-typed",
  type: "text-answer",
  prompt: "Type it",
} as unknown as ExerciseResponse;
const STATEMENT = {
  ...BASE,
  id: "pl-a-statement",
  type: "true-false",
  prompt: "This is so",
} as unknown as ExerciseResponse;

function renderExercise(exercise: ExerciseResponse) {
  const onSubmit = vi.fn();
  const view = render(
    <ExerciseRenderer
      exercise={exercise}
      language={{ locale: "pl-PL", direction: "ltr" }}
      disabled={false}
      autoFocus={false}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, view, user: userEvent.setup() };
}

describe("ExerciseRenderer", () => {
  it("renders a multiple-choice exercise with its own view", () => {
    renderExercise(CHOICE);

    expect(screen.getByRole("group", { name: "Pick one" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("renders a text-answer exercise with its own view", () => {
    renderExercise(TYPED);

    expect(screen.getByRole("textbox", { name: "Type it" })).toBeInTheDocument();
  });

  it("renders a true/false exercise with its own view", () => {
    renderExercise(STATEMENT);

    expect(screen.getByRole("radio", { name: "True" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "False" })).toBeInTheDocument();
  });

  it("passes what the student chose straight through, whatever the type", async () => {
    const { user, onSubmit } = renderExercise(STATEMENT);

    await user.click(screen.getByRole("radio", { name: "False" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("shows a neutral notice, and none of the exercise's data, for a type this version does not know", () => {
    const future = {
      ...BASE,
      id: "pl-a-future",
      type: "matching",
      prompt: "Match <b>these</b>",
      secret: "do not show",
    } as unknown as ExerciseResponse;

    const { view } = renderExercise(future);

    expect(screen.getByText("This kind of exercise is not available yet.")).toBeInTheDocument();
    expect(view.container).not.toHaveTextContent("Match");
    expect(view.container).not.toHaveTextContent("do not show");
    expect(screen.queryByRole("button", { name: "Check answer" })).not.toBeInTheDocument();
  });
});

describe("exerciseTypeLabel", () => {
  it.each([
    ["multiple-choice", "Multiple choice"],
    ["text-answer", "Text answer"],
    ["true-false", "True or false"],
  ])("names %s in plain words", (type, label) => {
    expect(exerciseTypeLabel(type)).toBe(label);
  });

  it("falls back to a generic word for a type it does not know", () => {
    expect(exerciseTypeLabel("matching")).toBe("Exercise");
    expect(exerciseTypeLabel("__proto__")).toBe("Exercise");
  });
});

describe("describeCorrectAnswer", () => {
  it("says a multiple-choice answer by the option's text, not its id", () => {
    expect(describeCorrectAnswer(CHOICE, "b")).toBe("Cześć");
  });

  it("returns the text of a text answer as it is", () => {
    expect(describeCorrectAnswer(TYPED, "Dobranoc")).toBe("Dobranoc");
  });

  it.each([
    [true, "True"],
    [false, "False"],
  ])("says a true/false answer in words: %s", (answer, words) => {
    expect(describeCorrectAnswer(STATEMENT, answer)).toBe(words);
  });

  it("returns null when the answer cannot be described (an unknown option, a wrong shape)", () => {
    expect(describeCorrectAnswer(CHOICE, "zzz")).toBeNull();
    expect(describeCorrectAnswer(STATEMENT, "true")).toBeNull();
    expect(describeCorrectAnswer(TYPED, true)).toBeNull();
  });

  it("returns null for a type it does not know", () => {
    const future = { ...BASE, id: "pl-a-future", type: "matching" } as unknown as ExerciseResponse;

    expect(describeCorrectAnswer(future, "x")).toBeNull();
  });
});
