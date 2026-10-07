import {
  CoachUnavailableError,
  type AgentContinuation,
  type AgentRequest,
  type AgentResponse,
  type AgentToolResult,
  type AiAgentService,
} from "@tfm-bic/application";

/**
 * The default AI Coach provider in development, every automated test and CI (M23, ADR-034,
 * decision 7) — a real, committed adapter that calls nothing and costs nothing.
 *
 * It is not a stub that returns one canned string: it exercises the orchestrator properly. Given
 * tools, it asks for one on the first turn and answers from the result on the second, so the tool
 * loop, the authorization path, the result minimisation and the UI's "what I looked at" line are
 * all covered without a provider. Answers are deterministic, which is what makes them testable.
 *
 * It is deliberately obvious: every answer says it is the offline coach, so a misconfigured
 * deployment cannot look like a working one.
 */

interface FakeTurnState {
  readonly message: string;
}

/** Which tool the fake reaches for, if it was offered one — the most informative first. */
const PREFERRED_TOOLS = [
  "get_exercise_context",
  "get_vocabulary_item",
  "get_lesson",
  "get_weak_areas",
  "recommend_next_activity",
  "get_progress_summary",
  "get_learner_context",
];

/** Arguments the fake can supply without inventing an id it has no way to know. */
const NO_ARGUMENT_TOOLS = new Set([
  "get_weak_areas",
  "recommend_next_activity",
  "get_progress_summary",
  "get_learner_context",
]);

export class FakeAiAgentService implements AiAgentService {
  respond(request: AgentRequest): Promise<AgentResponse> {
    const tool = request.tools.find(
      (declaration) =>
        NO_ARGUMENT_TOOLS.has(declaration.name) && PREFERRED_TOOLS.includes(declaration.name),
    );
    const state: FakeTurnState = { message: request.message };

    if (tool) {
      return Promise.resolve({
        kind: "tool-calls",
        calls: [{ id: "fake-call-1", name: tool.name, arguments: {} }],
        continuation: state as unknown as AgentContinuation,
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    }
    return Promise.resolve({
      kind: "answer",
      text: this.answer(state, undefined),
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  }

  continueWithToolResults(
    continuation: AgentContinuation,
    results: readonly AgentToolResult[],
  ): Promise<AgentResponse> {
    const state = continuation as unknown as FakeTurnState;
    return Promise.resolve({
      kind: "answer",
      text: this.answer(state, results[0]),
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  }

  private answer(state: FakeTurnState, result: AgentToolResult | undefined): string {
    const quoted = state.message.slice(0, 120);
    const looked =
      result === undefined
        ? "I did not look anything up."
        : `I looked up ${result.name} and received ${JSON.stringify(result.content).length} characters of data.`;
    return [
      "This is the offline AI Coach used in development and tests — no AI provider was called.",
      `You asked: "${quoted}"`,
      looked,
    ].join("\n\n");
  }
}

/**
 * The coach switched off (`AI_COACH_PROVIDER=disabled`, the production default until the provider
 * terms are decided — ADR-013/ADR-034). Refuses every turn; never calls anything. The route turns
 * this into one safe 503 and the UI tells the learner the rest of the application still works.
 */
export class DisabledAiAgentService implements AiAgentService {
  respond(): Promise<AgentResponse> {
    return Promise.reject(new CoachUnavailableError());
  }

  continueWithToolResults(): Promise<AgentResponse> {
    return Promise.reject(new CoachUnavailableError());
  }
}
