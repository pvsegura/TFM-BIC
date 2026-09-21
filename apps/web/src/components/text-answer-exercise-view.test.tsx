import type { ExerciseResponse } from "@tfm-bic/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TextAnswerExerciseView } from "./text-answer-exercise-view.js";

type Typed = Extract<ExerciseResponse, { type: "text-answer" }>;

const EXERCISE = {
  id: "pl-greetings-good-night",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "text-answer",
  order: 30,
  instructionLanguage: "en",
  prompt: "Type the Polish for: Good night.",
  result: { status: "unanswered", attemptCount: 0, lastAnsweredAt: null },
} as unknown as Typed;

function renderView(overrides: Partial<Parameters<typeof TextAnswerExerciseView>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <TextAnswerExerciseView
      exercise={EXERCISE}
      language={{ locale: "pl-PL", direction: "ltr" }}
      disabled={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const input = () => screen.getByLabelText("Type the Polish for: Good night.");

describe("TextAnswerExerciseView", () => {
  it("labels the input with the prompt", () => {
    renderView();

    expect(input()).toBeInTheDocument();
    expect(input()).toHaveValue("");
  });

  it("is a text box for the language being learned: tagged with its locale and direction", () => {
    renderView({ language: { locale: "ar-EG", direction: "rtl" } });

    expect(input()).toHaveAttribute("lang", "ar-EG");
    expect(input()).toHaveAttribute("dir", "rtl");
  });

  it("lets the browser decide the direction when the catalog could not supply it", () => {
    renderView({ language: undefined });

    expect(input()).toHaveAttribute("dir", "auto");
  });

  it("switches off autocorrect, autocapitalisation and spellcheck, which would rewrite a foreign word", () => {
    renderView();

    expect(input()).toHaveAttribute("autocomplete", "off");
    expect(input()).toHaveAttribute("autocapitalize", "none");
    expect(input()).toHaveAttribute("autocorrect", "off");
    expect(input()).toHaveAttribute("spellcheck", "false");
  });

  it("submits exactly what was typed, with its diacritics intact", async () => {
    const { user, onSubmit } = renderView();

    await user.type(input(), "Miło mi cię poznać.");
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Miło mi cię poznać.");
  });

  it("submits with the Enter key", async () => {
    const { user, onSubmit } = renderView();

    await user.type(input(), "Dobranoc{Enter}");

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Dobranoc");
  });

  it.each([
    ["nothing", ""],
    ["only spaces", "    "],
  ])("asks for an answer when given %s, and submits nothing", async (_name, typed) => {
    const { user, onSubmit } = renderView();

    if (typed) {
      await user.type(input(), typed);
    }
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter an answer.");
    expect(input()).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("takes the message away once the student types", async () => {
    const { user } = renderView();
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await user.type(input(), "D");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("limits the length of what can be typed to what the API accepts", () => {
    renderView();

    expect(input()).toHaveAttribute("maxlength", "500");
  });

  it("cannot be operated while disabled", async () => {
    const { user, onSubmit } = renderView({ disabled: true });

    expect(input()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("writes the prompt in the instruction language", () => {
    renderView();

    expect(screen.getByText("Type the Polish for: Good night.").closest("[lang]")).toHaveAttribute(
      "lang",
      "en",
    );
  });
});
