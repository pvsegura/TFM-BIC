import type { CoachMessageResponse, CoachStatusResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as authApi from "../services/auth-api.js";
import * as catalogApi from "../services/catalog-api.js";
import * as coachApi from "../services/coach-api.js";
import { AiCoachPage } from "./ai-coach-page.js";

/**
 * The AI Coach page (M23, ADR-034).
 *
 * What is worth testing here is the product's honesty, not the chat mechanics: that the page shows
 * the context the coach was given, says what it looked at, admits the conversation is not saved,
 * stays usable when the coach is off, and sends nothing the API would refuse.
 */

const STATUS: CoachStatusResponse = {
  available: true,
  modes: [
    "explain",
    "practice",
    "conversation",
    "vocabulary",
    "lesson-help",
    "video-help",
    "pronunciation",
  ],
  maxMessageLength: 1000,
  learner: { languageId: "pl", languageName: "Polish", cefrLevel: "A2" },
};

function answer(overrides: Partial<CoachMessageResponse> = {}): CoachMessageResponse {
  return {
    answer: "You wrote “dobranoc”, which is said at night. “Dzień dobry” is the daytime greeting.",
    mode: "explain",
    toolsUsed: ["get_exercise_context"],
    practice: null,
    ...overrides,
  };
}

function renderAt(path = "/learn/coach") {
  const Stub = createRoutesStub([
    { path: "/learn/coach", Component: AiCoachPage },
    { path: "/learn/lessons", Component: () => <p>Lessons page</p> },
    { path: "/privacy", Component: () => <p>Privacy</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
  vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue({
    languages: [{ code: "pl", name: "Polish", locale: "pl-PL", direction: "ltr" }],
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AiCoachPage", () => {
  it("shows the course context the coach was given, including the derived level", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);

    renderAt();

    expect(await screen.findByText("Polish")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText(/comes from the lessons you have worked on/i)).toBeInTheDocument();
  });

  it("says the level is not set rather than guessing one", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue({
      ...STATUS,
      learner: { languageId: "pl", languageName: "Polish", cefrLevel: null },
    });

    renderAt();

    expect(await screen.findByText("Not set yet")).toBeInTheDocument();
  });

  it("answers a question and reports what it looked at, in the learner's words", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    const send = vi.spyOn(coachApi, "sendCoachMessage").mockResolvedValue(answer());
    renderAt();
    const box = await screen.findByLabelText("Your message");

    await userEvent.type(box, "Why was my answer wrong?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/Dzień dobry.*daytime greeting/)).toBeInTheDocument();
    // Not the tool's name: the learner reads what was consulted, not an internal identifier.
    expect(screen.getByText(/Looked at: your answer to that exercise/)).toBeInTheDocument();
    expect(screen.queryByText(/get_exercise_context/)).not.toBeInTheDocument();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Why was my answer wrong?", languageCode: "pl" }),
    );
  });

  it("sends the conversation so far, so a follow-up has context", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    const send = vi.spyOn(coachApi, "sendCoachMessage").mockResolvedValue(answer());
    renderAt();
    const box = await screen.findByLabelText("Your message");

    await userEvent.type(box, "First question");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText(/daytime greeting/);
    await userEvent.type(box, "Another example?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1]?.[0].history).toEqual([
      { role: "learner", text: "First question" },
      { role: "coach", text: answer().answer },
    ]);
  });

  it("never sends a user id, a level or a model name", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    const send = vi.spyOn(coachApi, "sendCoachMessage").mockResolvedValue(answer());
    renderAt();

    await userEvent.type(await screen.findByLabelText("Your message"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    const sent = JSON.stringify(send.mock.calls[0]?.[0]);
    for (const forbidden of ["userId", "studentId", "level", "model", "instructions"]) {
      expect(sent).not.toContain(forbidden);
    }
  });

  it("passes the contextual entry point's id and opens in that mode", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    const send = vi.spyOn(coachApi, "sendCoachMessage").mockResolvedValue(answer());
    renderAt("/learn/coach?vocabulary=pl-dom&language=pl");

    // The mode the entry point promised is pre-selected.
    expect(await screen.findByLabelText("Your message")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your message"), "Help me remember this word");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      mode: "vocabulary",
      context: { type: "vocabulary-item", vocabularyItemId: "pl-dom" },
    });
  });

  it("ignores a malformed id in the URL instead of sending it", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    const send = vi.spyOn(coachApi, "sendCoachMessage").mockResolvedValue(answer());
    renderAt("/learn/coach?lesson=NOT%20AN%20ID&language=pl");

    await userEvent.type(await screen.findByLabelText("Your message"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0]?.[0].context).toBeUndefined();
  });

  it("renders a generated activity without scoring it, and reveals the answer on request", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    vi.spyOn(coachApi, "sendCoachMessage").mockResolvedValue(
      answer({
        answer: "Here are three questions.",
        mode: "practice",
        toolsUsed: ["get_weak_areas", "propose_practice_activity"],
        practice: {
          title: "Greetings recall",
          items: [
            {
              prompt: 'How do you say "good morning"?',
              options: ["Dobranoc", "Dzień dobry"],
              answerIndex: 1,
              explanation: "Dzień dobry is the daytime greeting.",
            },
          ],
        },
      }),
    );
    renderAt();

    await userEvent.type(await screen.findByLabelText("Your message"), "practice");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Greetings recall")).toBeInTheDocument();
    expect(screen.getByText(/Nothing here is saved or scored/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    // The verdict is in words, and the explanation comes with it.
    expect(screen.getByRole("status")).toHaveTextContent(/Dzień dobry/);
  });

  it("tells the learner the conversation is not saved", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);

    renderAt();

    expect(await screen.findByText(/not saved/i)).toBeInTheDocument();
  });

  it("stays usable when the coach is switched off, and points at the rest of the product", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue({ ...STATUS, available: false });

    renderAt();

    expect(await screen.findByText(/not switched on here yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "lessons" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Your message")).not.toBeInTheDocument();
  });

  it("shows a failure with a retry, without blaming the learner", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    const send = vi
      .spyOn(coachApi, "sendCoachMessage")
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(answer());
    renderAt();

    await userEvent.type(await screen.findByLabelText("Your message"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/went wrong/i);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/daytime greeting/)).toBeInTheDocument();
    // The learner's message is not duplicated by the retry.
    expect(screen.getAllByText("hello")).toHaveLength(1);
  });

  it("keeps one request in flight and announces that it is thinking", async () => {
    vi.spyOn(coachApi, "fetchCoachStatus").mockResolvedValue(STATUS);
    let resolve: (value: CoachMessageResponse) => void = () => undefined;
    const send = vi
      .spyOn(coachApi, "sendCoachMessage")
      .mockImplementation(() => new Promise((r) => (resolve = r)));
    renderAt();

    await userEvent.type(await screen.findByLabelText("Your message"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("status")).toHaveTextContent(/thinking/i);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    resolve(answer());
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  });
});
