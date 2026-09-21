import type { ExerciseAnswerResponse } from "@tfm-bic/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExerciseResult } from "./exercise-result.js";

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
  result: { status: "incorrect", attemptCount: 2, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
};

function renderResult(props: Partial<Parameters<typeof ExerciseResult>[0]> = {}) {
  return render(
    <ExerciseResult
      evaluation={CORRECT}
      correctAnswerText="Dzień dobry"
      instructionLanguage="en"
      learningLanguage={{ locale: "pl-PL", direction: "ltr" }}
      isChecking={false}
      failed={false}
      {...props}
    />,
  );
}

const status = () => screen.getByRole("status");

describe("ExerciseResult", () => {
  it("is present, and empty, before any answer, so a screen reader will announce it when it fills", () => {
    renderResult({ evaluation: undefined });

    expect(status()).toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it("says correct in words, with a check, and the correct answer", () => {
    renderResult();

    expect(status()).toHaveTextContent("Correct");
    expect(status()).toHaveTextContent("Correct answer: Dzień dobry");
    expect(screen.getByTestId("result-indicator")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("result-indicator")).toHaveTextContent("✓");
  });

  it("says incorrect in words, with a cross that is not the only signal, and shows the correct answer", () => {
    renderResult({ evaluation: INCORRECT });

    expect(status()).toHaveTextContent("Not quite");
    expect(status()).toHaveTextContent("Correct answer: Dzień dobry");
    expect(screen.getByTestId("result-indicator")).toHaveTextContent("✗");
  });

  it("marks the correct answer as text in the language being learned", () => {
    renderResult();

    expect(screen.getByText("Dzień dobry")).toHaveAttribute("lang", "pl-PL");
    expect(screen.getByText("Dzień dobry")).toHaveAttribute("dir", "ltr");
  });

  it("shows the exercise's own feedback, in the instruction language", () => {
    renderResult();

    expect(screen.getByText("Dzień dobry is polite.")).toHaveAttribute("lang", "en");
  });

  it("leaves the feedback out when the exercise has none", () => {
    renderResult({ evaluation: { ...CORRECT, feedback: null } });

    expect(status()).not.toHaveTextContent("polite");
  });

  it("does not claim a correct answer it cannot describe", () => {
    renderResult({ correctAnswerText: null });

    expect(status()).not.toHaveTextContent("Correct answer:");
  });

  it("counts the attempt", () => {
    renderResult({ evaluation: INCORRECT });

    expect(status()).toHaveTextContent("Attempt 2");
  });

  it("says it is checking while the answer is in flight", () => {
    renderResult({ evaluation: undefined, isChecking: true });

    expect(status()).toHaveTextContent("Checking your answer…");
  });

  it("says the answer could not be checked, as an alert, and invites another try", () => {
    renderResult({ evaluation: undefined, failed: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't check your answer. Please try again.",
    );
  });

  it("shows feedback as text: markup in it is inert", () => {
    const { container } = renderResult({
      evaluation: { ...CORRECT, feedback: "<img src=x onerror=alert(1)>" },
    });

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("can be focused programmatically, so focus is not lost when the submit button is disabled", () => {
    renderResult();

    expect(status()).toHaveAttribute("tabindex", "-1");
  });
});
