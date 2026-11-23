import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { m } from "../../i18n/index.js";
import { bandFor, LISTENING_TEST } from "../../listening-test/listening-test-data.js";
import { ListeningTestPage } from "./listening-test-page.js";

const t = m.marketing.listening;

describe("listening test data", () => {
  it("has four situations with ten well-formed questions each", () => {
    expect(LISTENING_TEST).toHaveLength(4);
    for (const situation of LISTENING_TEST) {
      expect(situation.questions).toHaveLength(10);
      for (const question of situation.questions) {
        expect(question.options[question.correct], question.prompt).toBeDefined();
        expect(new Set(question.options).size).toBe(question.options.length);
      }
    }
  });

  it("maps ratios to orientation bands", () => {
    expect(bandFor(0.2)).toBe("start");
    expect(bandFor(0.6)).toBe("a1");
    expect(bandFor(0.85)).toBe("a1plus");
  });
});

describe("ListeningTestPage", () => {
  it("runs the whole test without an account and shows the final band", () => {
    render(
      <MemoryRouter>
        <ListeningTestPage />
      </MemoryRouter>,
    );
    expect(document.querySelector("audio")).toHaveAttribute("src", "/audio/listening/airport.mp3");

    LISTENING_TEST.forEach((situation, index) => {
      situation.questions.forEach((question) => {
        const group = screen.getByRole("group", { name: (name) => name.endsWith(question.prompt) });
        fireEvent.click(within(group).getByLabelText(question.options[question.correct] ?? ""));
      });
      fireEvent.click(screen.getByRole("button", { name: t.check }));
      expect(screen.getByText(t.situationScore(10, 10))).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: index === LISTENING_TEST.length - 1 ? t.finish : t.next,
        }),
      );
    });

    expect(screen.getByText(t.resultPercent(100))).toBeInTheDocument();
    expect(screen.getByText(t.bands.a1plus)).toBeInTheDocument();
  });

  it("asks to answer every question before checking", () => {
    render(
      <MemoryRouter>
        <ListeningTestPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: t.check }));
    expect(screen.getByRole("alert")).toHaveTextContent(t.answerAll);
  });
});
