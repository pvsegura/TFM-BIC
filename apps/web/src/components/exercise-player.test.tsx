import type { ExerciseAnswerResponse, ExerciseResponse } from "@tfm-bic/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { ExercisePlayer, type ExercisePlayerProps } from "./exercise-player.js";

const UNANSWERED = { status: "unanswered", attemptCount: 0, lastAnsweredAt: null } as const;

const CHOICE = {
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
  ],
  result: UNANSWERED,
} as unknown as ExerciseResponse;

const TYPED = {
  ...CHOICE,
  id: "pl-greetings-good-night",
  type: "text-answer",
  prompt: "Type the Polish for: Good night.",
  options: undefined,
} as unknown as ExerciseResponse;

const CORRECT: ExerciseAnswerResponse = {
  correct: true,
  feedback: "Dzień dobry is polite.",
  correctAnswer: "a",
  result: { status: "correct", attemptCount: 1, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
};
const INCORRECT: ExerciseAnswerResponse = {
  correct: false,
  feedback: "Dzień dobry is polite.",
  correctAnswer: "a",
  result: { status: "incorrect", attemptCount: 1, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
};

type Overrides = Partial<ExercisePlayerProps>;

const DEFAULTS: ExercisePlayerProps = {
  exercise: CHOICE,
  language: { locale: "pl-PL", direction: "ltr" },
  position: 2,
  total: 3,
  nextHref: "/learn/exercises/pl-greetings-next",
  lessonHref: "/learn/lessons/pl-greetings",
  lessonFinished: false,
  evaluation: undefined,
  isSubmitting: false,
  submitFailed: false,
  onSubmit: () => undefined,
  onRetry: () => undefined,
};

function renderPlayer(overrides: Overrides = {}) {
  return render(
    <MemoryRouter>
      <ExercisePlayer {...DEFAULTS} {...overrides} />
    </MemoryRouter>,
  );
}

/** Holds the verdict the way the exercise page does: set by a submission, cleared by a retry. */
function Harness({ verdict, ...overrides }: Overrides & { verdict: ExerciseAnswerResponse }) {
  const [evaluation, setEvaluation] = useState<ExerciseAnswerResponse | undefined>(undefined);
  return (
    <MemoryRouter>
      <ExercisePlayer
        {...DEFAULTS}
        {...overrides}
        evaluation={evaluation}
        onSubmit={() => {
          setEvaluation(verdict);
        }}
        onRetry={() => {
          setEvaluation(undefined);
        }}
      />
    </MemoryRouter>
  );
}

describe("ExercisePlayer", () => {
  it("names the exercise by its place in the lesson, and its kind", () => {
    renderPlayer();

    expect(screen.getByRole("heading", { level: 1, name: "Exercise 2 of 3" })).toBeInTheDocument();
    expect(screen.getByText("Multiple choice")).toBeInTheDocument();
  });

  it("says just 'Exercise' when its place is not known", () => {
    renderPlayer({ position: null, total: null });

    expect(screen.getByRole("heading", { level: 1, name: "Exercise" })).toBeInTheDocument();
  });

  it("shows the exercise through the renderer for its type", () => {
    renderPlayer({ exercise: TYPED });

    expect(screen.getByLabelText("Type the Polish for: Good night.")).toBeInTheDocument();
  });

  it("shows no result, and no correct answer, before an answer", () => {
    renderPlayer();

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByText(/Correct answer/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("passes the student's answer up, once", async () => {
    const onSubmit = vi.fn();
    renderPlayer({ onSubmit });
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("locks the controls and says it is checking while an answer is in flight", () => {
    renderPlayer({ isSubmitting: true });

    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Cześć" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your answer…");
  });

  it("tells the student, accessibly, when the answer could not be checked, and lets them try again", () => {
    renderPlayer({ submitFailed: true });

    expect(screen.getByRole("alert")).toHaveTextContent("couldn't check your answer");
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
  });

  it("reminds a returning student how their last attempt went, before they answer", () => {
    renderPlayer({
      exercise: {
        ...CHOICE,
        result: {
          status: "incorrect",
          attemptCount: 2,
          lastAnsweredAt: "2026-01-01T10:00:00.000Z",
        },
      } as unknown as ExerciseResponse,
    });

    expect(screen.getByText(/Your last attempt was not correct/)).toHaveTextContent("2 attempts");
  });

  it("says nothing about earlier attempts to a student who has none", () => {
    renderPlayer();

    expect(screen.queryByText(/last attempt/)).not.toBeInTheDocument();
  });

  it("drops that reminder once a verdict is showing, so the two never disagree", () => {
    renderPlayer({
      exercise: {
        ...CHOICE,
        result: { status: "correct", attemptCount: 1, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
      } as unknown as ExerciseResponse,
      evaluation: INCORRECT,
    });

    expect(screen.queryByText(/last attempt/)).not.toBeInTheDocument();
  });

  describe("with a verdict", () => {
    it("shows the correct verdict, the correct answer as words and the feedback, and makes the exercise read-only", () => {
      renderPlayer({ evaluation: CORRECT });

      expect(screen.getByRole("status")).toHaveTextContent("Correct");
      expect(screen.getByRole("status")).toHaveTextContent("Correct answer: Dzień dobry");
      expect(screen.getByRole("status")).toHaveTextContent("Dzień dobry is polite.");
      expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
      expect(screen.getByRole("radio", { name: "Dzień dobry" })).toBeDisabled();
    });

    it("shows an incorrect verdict as 'Not quite' with the correct answer", () => {
      renderPlayer({ evaluation: INCORRECT });

      expect(screen.getByRole("status")).toHaveTextContent("Not quite");
      expect(screen.getByRole("status")).toHaveTextContent("Correct answer: Dzień dobry");
    });

    it("moves focus to the result, so a keyboard user is not left on a disabled button", async () => {
      const user = userEvent.setup();
      render(<Harness verdict={CORRECT} />);

      await user.click(screen.getByRole("radio", { name: "Dzień dobry" }));
      await user.click(screen.getByRole("button", { name: "Check answer" }));

      expect(screen.getByRole("status")).toHaveFocus();
    });

    it("offers to try again, and to go on to the next exercise", () => {
      renderPlayer({ evaluation: INCORRECT });

      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Next exercise" })).toHaveAttribute(
        "href",
        "/learn/exercises/pl-greetings-next",
      );
    });

    it("offers a way back to the lesson, and says so when this was the last exercise", () => {
      renderPlayer({ evaluation: CORRECT, nextHref: null, lessonFinished: true });

      expect(screen.queryByRole("link", { name: "Next exercise" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Back to lesson" })).toHaveAttribute(
        "href",
        "/learn/lessons/pl-greetings",
      );
      expect(screen.getByText("You have answered every exercise in this lesson.")).toBeVisible();
    });

    it("does not claim the lesson is finished when other exercises are still unanswered", () => {
      renderPlayer({ evaluation: CORRECT, nextHref: null, lessonFinished: false });

      expect(screen.queryByText(/answered every exercise/)).not.toBeInTheDocument();
    });

    it("lets the student retry: a fresh, empty exercise with focus on its first control", async () => {
      const user = userEvent.setup();
      render(<Harness verdict={INCORRECT} />);
      await user.click(screen.getByRole("radio", { name: "Cześć" }));
      await user.click(screen.getByRole("button", { name: "Check answer" }));

      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(screen.getByRole("radio", { name: "Cześć" })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: "Cześć" })).toBeEnabled();
      expect(screen.getByRole("radio", { name: "Dzień dobry" })).toHaveFocus();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("lets the student retry a text exercise with an empty box", async () => {
      const user = userEvent.setup();
      render(<Harness verdict={INCORRECT} exercise={TYPED} />);
      await user.type(screen.getByLabelText("Type the Polish for: Good night."), "wrong");
      await user.click(screen.getByRole("button", { name: "Check answer" }));

      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(screen.getByLabelText("Type the Polish for: Good night.")).toHaveValue("");
      expect(screen.getByLabelText("Type the Polish for: Good night.")).toHaveFocus();
    });
  });

  it("always offers a way back to the lesson", () => {
    renderPlayer();

    expect(screen.getByRole("link", { name: "Back to lesson" })).toHaveAttribute(
      "href",
      "/learn/lessons/pl-greetings",
    );
  });
});
