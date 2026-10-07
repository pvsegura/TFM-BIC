import type { CoachTurn } from "@tfm-bic/domain";

/**
 * The AI agent capability, provider-independent (M23, ADR-034 / ADR-011's interface-per-capability
 * rule). Nothing in this file names Gemini, a model, an endpoint, a step kind or a token — a
 * different provider is a different adapter in `packages/data` and no change here.
 *
 * It is a *second* capability beside `AudioGenerationService` (M12 TTS), not a replacement:
 * speaking text and holding a tool-using conversation are different things, and the offline media
 * pipeline must keep working exactly as it does.
 */

/**
 * A JSON Schema describing one tool's arguments. Kept as an open-ended structure on purpose: it is
 * data we hand to the provider as-is, and the application's own validation of a call's arguments is
 * done by Zod in the tool itself — the schema only tells the model what to aim for.
 */
export interface AgentToolSchema {
  readonly type: "object";
  readonly properties: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

export interface AgentToolDeclaration {
  /** Snake-case, stable, and never derived from user input. */
  readonly name: string;
  /** What the tool answers, written for the model. No implementation detail, no table name. */
  readonly description: string;
  readonly parameters: AgentToolSchema;
}

/** The model asking for a tool to be run. `arguments` is untrusted: validate before use. */
export interface AgentToolCall {
  /** The provider's id for this call; echoed back with the result so the two are paired. */
  readonly id: string;
  readonly name: string;
  readonly arguments: unknown;
}

/** What the application gives back for one call. Minimised data, or a refusal the model can read. */
export interface AgentToolResult {
  readonly id: string;
  readonly name: string;
  /** JSON-serialisable. For a refusal, `{ error: "..." }` — never an exception, never a stack. */
  readonly content: unknown;
}

/**
 * Provider state for one in-flight turn, opaque to this layer.
 *
 * It exists because a stateless provider conversation (`store: false`) has to be replayed, and a
 * provider may require its own artefacts in that replay — Gemini, for instance, returns an opaque
 * `signature` with each reasoning and tool-call step that must be echoed back verbatim. Carrying
 * it as an unreadable value is what keeps that requirement from leaking into the use case: the
 * orchestrator receives it, holds it for the duration of one request, and hands it back untouched.
 */
export interface AgentContinuation {
  readonly __agentContinuation: unique symbol;
}

export interface AgentUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface AgentRequest {
  /** The versioned coach instruction. Never contains learner text. */
  readonly instructions: string;
  /** Earlier turns of this conversation — text only, already bounded by the domain. */
  readonly history: readonly CoachTurn[];
  /** This turn's learner message, passed as learner input and never concatenated into `instructions`. */
  readonly message: string;
  /** Short, named application context (language, level, what the learner has open). */
  readonly context: readonly { readonly label: string; readonly value: string }[];
  readonly tools: readonly AgentToolDeclaration[];
}

/** Either the coach's answer, or a request to run tools first. */
export type AgentResponse =
  | {
      readonly kind: "answer";
      readonly text: string;
      readonly usage: AgentUsage | undefined;
    }
  | {
      readonly kind: "tool-calls";
      readonly calls: readonly AgentToolCall[];
      readonly continuation: AgentContinuation;
      readonly usage: AgentUsage | undefined;
    };

export interface AiAgentService {
  /** Starts a turn. */
  respond(request: AgentRequest): Promise<AgentResponse>;
  /**
   * Continues the same turn with the results of the calls the provider asked for. The
   * `continuation` must be the one that came with those calls.
   */
  continueWithToolResults(
    continuation: AgentContinuation,
    results: readonly AgentToolResult[],
  ): Promise<AgentResponse>;
}
