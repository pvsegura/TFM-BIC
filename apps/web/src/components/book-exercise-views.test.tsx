import type { ExerciseResponse } from "@verbysia/contracts";
import { renderWithProviders } from "@verbysia/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  GapFillExerciseView,
  MatchingExerciseView,
  OpenWritingExerciseView,
  OrderingExerciseView,
} from "./book-exercise-views.js";
import { m } from "../i18n/index.js";

const t = m.learn.exercises;
const result = { status: "unanswered" as const, attemptCount: 0, lastAnsweredAt: null };
const base = {
  id: "es-u3-x",
  lessonId: "es-unit-3-where",
  languageId: "es",
  levelId: "a1",
  order: 1,
  instructionLanguage: "pl",
  prompt: "Ćwiczenie",
  result,
};
const language = { locale: "es" };

type Of<T extends ExerciseResponse["type"]> = Extract<ExerciseResponse, { type: T }>;

describe("OrderingExerciseView", () => {
  it("reorders with the arrow buttons and submits the chosen order", async () => {
    const onSubmit = vi.fn();
    const exercise: Of<"ordering"> = {
      ...base,
      type: "ordering",
      items: ["banco", "El", "cerca"],
      joiner: " ",
    };
    renderWithProviders(
      <OrderingExerciseView
        exercise={exercise}
        language={language}
        disabled={false}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: t.ordering.moveUp("El") }));
    await userEvent.click(screen.getByRole("button", { name: t.check }));

    expect(onSubmit).toHaveBeenCalledWith(["El", "banco", "cerca"]);
  });
});

describe("MatchingExerciseView", () => {
  it("asks for every pair before submitting, then sends one choice per left item", async () => {
    const onSubmit = vi.fn();
    const exercise: Of<"matching"> = {
      ...base,
      type: "matching",
      left: ["el banco", "la farmacia"],
      right: ["apteka", "bank"],
    };
    renderWithProviders(
      <MatchingExerciseView
        exercise={exercise}
        language={language}
        disabled={false}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: t.check }));
    expect(screen.getByRole("alert")).toHaveTextContent(t.matching.completeAll);

    await userEvent.selectOptions(screen.getByLabelText("el banco"), "bank");
    await userEvent.selectOptions(screen.getByLabelText("la farmacia"), "apteka");
    await userEvent.click(screen.getByRole("button", { name: t.check }));

    expect(onSubmit).toHaveBeenCalledWith(["bank", "apteka"]);
  });
});

describe("GapFillExerciseView", () => {
  it("renders one labelled input per gap and submits them in order", async () => {
    const onSubmit = vi.fn();
    const exercise: Of<"gap-fill"> = {
      ...base,
      type: "gap-fill",
      segments: ["El museo ", " en el centro y ", " grande."],
    };
    renderWithProviders(
      <GapFillExerciseView
        exercise={exercise}
        language={language}
        disabled={false}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.type(screen.getByRole("textbox", { name: t.gapFill.gap("1") }), "está");
    await userEvent.click(screen.getByRole("button", { name: t.check }));
    expect(screen.getByRole("alert")).toHaveTextContent(t.gapFill.fillAll);

    await userEvent.type(screen.getByRole("textbox", { name: t.gapFill.gap("2") }), "es");
    await userEvent.click(screen.getByRole("button", { name: t.check }));
    expect(onSubmit).toHaveBeenCalledWith(["está", "es"]);
  });
});

describe("OpenWritingExerciseView", () => {
  it("shows the checklist and refuses a text outside the word limits", async () => {
    const onSubmit = vi.fn();
    const exercise: Of<"open-writing"> = {
      ...base,
      type: "open-writing",
      checklist: ["używasz hay"],
      minWords: 3,
      maxWords: 10,
    };
    renderWithProviders(
      <OpenWritingExerciseView
        exercise={exercise}
        language={language}
        disabled={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("używasz hay")).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: t.openWriting.label });
    await userEvent.type(box, "Hola");
    await userEvent.click(screen.getByRole("button", { name: t.check }));
    expect(screen.getByRole("alert")).toHaveTextContent(t.openWriting.tooShort("3", "10"));
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(box, " hay un parque");
    await userEvent.click(screen.getByRole("button", { name: t.check }));
    expect(onSubmit).toHaveBeenCalledWith("Hola hay un parque");
  });
});
