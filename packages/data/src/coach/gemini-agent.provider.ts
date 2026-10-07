import {
  CoachConfigurationError,
  CoachProviderRateLimitedError,
  CoachProviderRejectedError,
  CoachProviderUnavailableError,
  CoachResponseError,
  CoachTimeoutError,
  type AgentContinuation,
  type AgentRequest,
  type AgentResponse,
  type AgentToolResult,
  type AgentUsage,
  type AiAgentService,
} from "@tfm-bic/application";

import {
  geminiBackoffMs,
  geminiRetryAfterMs,
  GEMINI_RETRYABLE_STATUSES,
  isGeminiTimeout,
  postGeminiInteraction,
  translateGeminiStatus,
} from "../providers/gemini/gemini-interactions.js";

/**
 * The Gemini adapter for the AI Learning Coach (M23, ADR-034) — the only file that knows how
 * Gemini *converses and calls tools*. Nothing above it names a model, a step type, a signature or
 * `store`.
 *
 * Verified against the official documentation on 2026-10-06 **and confirmed by real calls** with
 * this project's key (throwaway script, not a test — ADR-034 records the findings):
 *
 * - `POST .../v1beta/interactions` with `model`, `system_instruction`, `input` (an array of steps),
 *   `tools`, `generation_config` and `store`.
 * - Tools: `{type: "function", name, description, parameters}`. The model answers
 *   `status: "requires_action"` with steps `{type: "function_call", id, signature, name, arguments}`.
 * - A result goes back as an input step `{type: "function_result", name, call_id, result: [{type:
 *   "text", text}]}`. The call's identity arrives as **`id`** and is sent back as **`call_id`** —
 *   the two documentation pages disagree, and this is what the real API does.
 * - A `function_call` step must be echoed back **verbatim, signature included**, before its result:
 *   with `store: false` there is no server-side state (the response carries no interaction id at
 *   all), so each request replays the whole turn.
 * - Prior conversation turns replay as `user_input` and `model_output` steps, and the model uses
 *   them (confirmed: a follow-up "that word" resolved correctly).
 * - `generation_config.thinking_level: "low"` is accepted and removed thought tokens entirely on an
 *   equivalent request. Thought tokens are billed as output, so this is the single biggest cost
 *   control available here.
 *
 * `store: false` on every request: Gemini is asked to retain nothing. That is also why history is
 * replayed rather than referenced by `previous_interaction_id`, which requires `store: true` and
 * 55-day provider-side retention (ADR-034, decision 5).
 */

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_RETRIES = 2;

/** Low, not zero: the coach should be consistent about facts but not robotic in a conversation. */
const DEFAULT_TEMPERATURE = 0.3;

export interface GeminiAgentProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
  temperature?: number;
  /** Injected in tests only. */
  fetch?: typeof fetch;
  /** Injected in tests only. */
  sleep?: (ms: number) => Promise<void>;
}

/** A Gemini step, as sent and received. Opaque beyond the few fields this adapter reads. */
type GeminiStep = Record<string, unknown>;

/** What a continuation actually is. Never visible above this file (the port's type is opaque). */
interface AgentTurnState {
  readonly base: Record<string, unknown>;
  /** Everything replayed so far: history, the learner's message, and each round's calls/results. */
  readonly input: readonly GeminiStep[];
  /** The `function_call` steps of the response these results answer, echoed back with the results. */
  readonly pendingCalls: readonly GeminiStep[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A field only when it really is a string: nothing from the provider is coerced with `String()`,
 * which would turn an unexpected object into "[object Object]" and hide the problem. */
function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function textStep(type: "user_input" | "model_output", text: string): GeminiStep {
  return { type, content: [{ type: "text", text }] };
}

/** An HTTP failure in the coach's error vocabulary, classified by the shared Gemini rules. */
function translateStatus(status: number): Error {
  return translateGeminiStatus(status, {
    configuration: (detail) => new CoachConfigurationError(detail),
    rejected: (detail) => new CoachProviderRejectedError(detail),
    unavailable: (detail) => new CoachProviderUnavailableError(detail),
    rateLimited: () => new CoachProviderRateLimitedError(),
  });
}

function usageOf(body: Record<string, unknown>): AgentUsage | undefined {
  const usage = body.usage;
  if (!isRecord(usage)) return undefined;
  const input = usage.total_input_tokens;
  const output = usage.total_output_tokens;
  return {
    inputTokens: typeof input === "number" ? input : 0,
    outputTokens: typeof output === "number" ? output : 0,
  };
}

/** Every `model_output` text item, joined — the coach's answer. */
function answerText(steps: readonly unknown[]): string {
  const parts: string[] = [];
  for (const step of steps) {
    if (!isRecord(step) || step.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const item of step.content) {
      if (isRecord(item) && item.type === "text" && typeof item.text === "string") {
        parts.push(item.text);
      }
    }
  }
  return parts.join("\n").trim();
}

function functionCallSteps(steps: readonly unknown[]): GeminiStep[] {
  return steps.filter(
    (step): step is GeminiStep =>
      isRecord(step) && step.type === "function_call" && typeof step.name === "string",
  );
}

export class GeminiAgentProvider implements AiAgentService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly temperature: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: GeminiAgentProviderOptions) {
    if (options.apiKey.trim() === "") {
      throw new CoachConfigurationError("no API key configured");
    }
    if (options.model.trim() === "") {
      throw new CoachConfigurationError("no model configured");
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    this.fetchFn = options.fetch ?? fetch;
    this.sleep =
      options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms).unref()));
  }

  async respond(request: AgentRequest): Promise<AgentResponse> {
    const base: Record<string, unknown> = {
      model: this.model,
      system_instruction: request.instructions,
      tools: request.tools.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
      // Documented opt-out of Gemini's default server-side storage of interactions.
      store: false,
      generation_config: { temperature: this.temperature, thinking_level: "low" },
    };

    const input: GeminiStep[] = [];
    for (const turn of request.history) {
      input.push(textStep(turn.role === "learner" ? "user_input" : "model_output", turn.text));
    }
    // The application's context travels as its own labelled block, kept apart from both the
    // instructions and the learner's words: the learner's text is never concatenated with data the
    // model is meant to trust.
    if (request.context.length > 0) {
      const lines = request.context.map((entry) => `${entry.label}: ${entry.value}`).join("\n");
      input.push(textStep("user_input", `[Learner context from the application]\n${lines}`));
    }
    input.push(textStep("user_input", request.message));

    return this.send({ base, input, pendingCalls: [] });
  }

  async continueWithToolResults(
    continuation: AgentContinuation,
    results: readonly AgentToolResult[],
  ): Promise<AgentResponse> {
    const state = continuation as unknown as AgentTurnState;
    if (!isRecord(state) || !Array.isArray(state.input)) {
      throw new CoachResponseError("the conversation state was lost");
    }
    const replayed: readonly GeminiStep[] = state.input;
    const input: GeminiStep[] = [
      ...replayed,
      // The model's own call steps go back verbatim (signature included) before their results.
      ...state.pendingCalls,
      ...results.map((result) => ({
        type: "function_result",
        name: result.name,
        call_id: result.id,
        result: [{ type: "text", text: JSON.stringify(result.content) }],
      })),
    ];
    return this.send({ base: state.base, input, pendingCalls: [] });
  }

  /**
   * One request, plus at most `maxRetries` more for documented-transient failures (429, 500, 503,
   * 504, network errors) with exponential backoff. Never retried: our own timeout (the abandoned
   * call may still be billed) and every other 4xx.
   */
  private async send(state: AgentTurnState): Promise<AgentResponse> {
    const body = JSON.stringify({ ...state.base, input: state.input });

    for (let attempt = 0; ; attempt += 1) {
      const outcome = await this.attempt(body, state);
      if (outcome.kind === "done") {
        return outcome.response;
      }
      if (attempt >= this.maxRetries) {
        throw outcome.error;
      }
      await this.sleep(geminiBackoffMs(attempt, outcome.delayMs));
    }
  }

  private async attempt(
    body: string,
    state: AgentTurnState,
  ): Promise<
    | { kind: "done"; response: AgentResponse }
    | { kind: "retry"; error: Error; delayMs: number | null }
  > {
    let response: Response;
    let payload: unknown;
    try {
      response = await postGeminiInteraction(body, {
        apiKey: this.apiKey,
        timeoutMs: this.timeoutMs,
        fetch: this.fetchFn,
      });
      if (!response.ok) {
        if (GEMINI_RETRYABLE_STATUSES.has(response.status)) {
          return {
            kind: "retry",
            error: translateStatus(response.status),
            delayMs: geminiRetryAfterMs(response),
          };
        }
        throw translateStatus(response.status);
      }
      payload = await response.json().catch(() => {
        throw new CoachProviderUnavailableError("unreadable response body");
      });
    } catch (error) {
      if (isGeminiTimeout(error)) {
        throw new CoachTimeoutError(this.timeoutMs);
      }
      if (error instanceof TypeError) {
        return {
          kind: "retry",
          error: new CoachProviderUnavailableError("network error"),
          delayMs: null,
        };
      }
      throw error;
    }

    return { kind: "done", response: this.toAgentResponse(payload, state) };
  }

  private toAgentResponse(payload: unknown, state: AgentTurnState): AgentResponse {
    if (!isRecord(payload) || !Array.isArray(payload.steps)) {
      throw new CoachResponseError("no steps in the response");
    }
    const usage = usageOf(payload);
    const calls = functionCallSteps(payload.steps);

    if (calls.length > 0) {
      const nextState: AgentTurnState = {
        base: state.base,
        input: state.input,
        pendingCalls: calls,
      };
      return {
        kind: "tool-calls",
        calls: calls.map((step) => ({
          // Verified: the call's identity arrives as `id`. `call_id` is accepted as a fallback in
          // case the documented reference shape is what a future version returns.
          id: text(step.id) ?? text(step.call_id) ?? "",
          name: text(step.name) ?? "",
          arguments: step.arguments ?? {},
        })),
        continuation: nextState as unknown as AgentContinuation,
        usage,
      };
    }

    const answer = answerText(payload.steps);
    if (answer === "") {
      // A finished interaction with no text and no tool call: refused by a safety filter, or an
      // output shape this adapter does not know. Either way the turn cannot be answered.
      throw new CoachResponseError(`no answer text (status: ${text(payload.status) ?? "unknown"})`);
    }
    return { kind: "answer", text: answer, usage };
  }
}
