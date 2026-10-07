import {
  createCoachMessage,
  normalizeCoachHistory,
  type CoachMode,
  type CoachTurn,
  type GeneratedPractice,
  type LanguageId,
  type LevelId,
} from "@tfm-bic/domain";

import {
  CoachBusyError,
  CoachResponseError,
  CoachUnavailableError,
} from "../errors/coach-errors.js";
import {
  AI_COACH_INSTRUCTIONS_VERSION,
  aiCoachInstructions,
} from "../instructions/ai-coach-instructions.js";
import type { AgentToolCall, AgentToolResult, AiAgentService } from "../ports/ai-agent-service.js";
import {
  declarationsForMode,
  type CoachToolContext,
  type CoachToolRegistry,
} from "../tools/coach-tool.js";
import { ToolArgumentError } from "../tools/tool-arguments.js";

/**
 * One coaching turn, from a learner's message to the coach's answer (M23, ADR-034).
 *
 * This is the orchestrator the brief asks for, and its whole job is to keep the application in
 * charge of a conversation the model is driving:
 *
 * 1. validate the learner's message and the replayed history (domain),
 * 2. build the instruction for the mode and a minimal context block,
 * 3. ask the provider,
 * 4. while the provider asks for tools: check the tool exists for this mode, run it with the
 *    **session's** user id, minimise and return the result — bounded by `MAX_TOOL_ROUNDS`,
 * 5. return the answer, plus any practice activity the model proposed and we validated.
 *
 * A tool failure is never an HTTP failure: it goes back to the model as `{ error }` so it can
 * recover or say it could not look something up. A *provider* failure does end the turn — that is
 * mapped to one safe message by `apps/api` (see `coach-errors.ts`).
 */

export interface AskCoachInput {
  /** From the session. Never from the request body. */
  readonly userId: string;
  readonly languageId: LanguageId;
  readonly levelId: LevelId | undefined;
  readonly mode: CoachMode;
  /** What the learner typed, unvalidated. */
  readonly message: string;
  /** The conversation so far, as the client has it. Untrusted; normalised before use. */
  readonly history: readonly { role: CoachTurn["role"]; text: string }[];
  /**
   * What the learner has open, already resolved and authorised by the caller (the route turns an
   * id into a title through the same use case the page uses). Labels and values only — no ids the
   * learner may not see, and nothing about the account.
   */
  readonly context: readonly { readonly label: string; readonly value: string }[];
}

export interface AskCoachResult {
  readonly answer: string;
  /** Which tools actually ran, in order. For the UI's "what I looked at" line and for logs. */
  readonly toolsUsed: readonly string[];
  /** A validated activity the coach proposed, if any. */
  readonly practice: GeneratedPractice | undefined;
  readonly instructionsVersion: string;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number } | undefined;
}

/**
 * How many times the provider may ask for tools in one turn. Four is enough for the real chains
 * ("find my weak words" → "look one up" → "propose practice"), and it is the cap that stops a
 * model that keeps calling tools from costing an unbounded number of requests.
 */
export const MAX_TOOL_ROUNDS = 4;

/** Tool calls honoured per round. More than this in one round is a model loop, not a need. */
const MAX_CALLS_PER_ROUND = 4;

/** Characters of one tool result handed to the provider. Each tool already minimises; this is the backstop. */
const MAX_TOOL_RESULT_CHARACTERS = 6_000;

export interface AskCoachDependencies {
  readonly agent: AiAgentService;
  /** Built per request (it holds the practice collector) — see `createCoachToolRegistry`. */
  readonly registryFor: () => {
    registry: CoachToolRegistry;
    practice: () => GeneratedPractice | undefined;
  };
  /** `false` when the deployment has the coach switched off. */
  readonly enabled: boolean;
  /** Coaching turns this process will run at once. Beyond it, `CoachBusyError`. */
  readonly maxConcurrent: number;
}

export class AskCoachUseCase {
  private inFlight = 0;

  constructor(private readonly deps: AskCoachDependencies) {}

  async execute(input: AskCoachInput): Promise<AskCoachResult> {
    if (!this.deps.enabled) {
      throw new CoachUnavailableError();
    }
    // A cheap, in-process guard on a slow and paid operation (ADR-034, decision 9). It is per
    // instance, like M12's audio limit, and is the last line after the route's rate limits.
    if (this.inFlight >= this.deps.maxConcurrent) {
      throw new CoachBusyError();
    }
    this.inFlight += 1;
    try {
      return await this.run(input);
    } finally {
      this.inFlight -= 1;
    }
  }

  private async run(input: AskCoachInput): Promise<AskCoachResult> {
    // Domain validation first: an over-long or control-character message never reaches the provider.
    const message = createCoachMessage(input.message);
    const history = normalizeCoachHistory(input.history);
    const { registry, practice } = this.deps.registryFor();
    const toolContext: CoachToolContext = {
      userId: input.userId,
      languageId: input.languageId,
      levelId: input.levelId,
    };
    const offered = declarationsForMode(registry, input.mode);
    const offeredNames = new Set(offered.map((declaration) => declaration.name));
    const toolsUsed: string[] = [];
    let inputTokens = 0;
    let outputTokens = 0;

    let response = await this.deps.agent.respond({
      instructions: aiCoachInstructions(input.mode),
      history,
      message,
      context: input.context,
      tools: offered,
    });

    for (let round = 0; ; round += 1) {
      inputTokens += response.usage?.inputTokens ?? 0;
      outputTokens += response.usage?.outputTokens ?? 0;

      if (response.kind === "answer") {
        const answer = response.text.trim();
        if (answer === "") {
          throw new CoachResponseError("the provider returned no text");
        }
        return {
          answer,
          toolsUsed,
          practice: practice(),
          instructionsVersion: AI_COACH_INSTRUCTIONS_VERSION,
          usage: { inputTokens, outputTokens },
        };
      }

      if (round >= MAX_TOOL_ROUNDS) {
        // The model is still asking for data after four rounds. Ending here is deliberate: a
        // learner waiting on a loop is worse than a plain "I could not finish that".
        throw new CoachResponseError("the provider kept asking for tools");
      }

      const calls = response.calls.slice(0, MAX_CALLS_PER_ROUND);
      const results: AgentToolResult[] = [];
      for (const call of calls) {
        results.push(await this.runTool(registry, offeredNames, toolContext, call, toolsUsed));
      }
      response = await this.deps.agent.continueWithToolResults(response.continuation, results);
    }
  }

  /**
   * Runs one tool call defensively. Every failure becomes a readable refusal for the model:
   *
   * - a name the mode does not offer (or no tool at all) — including anything a learner's prompt
   *   might have talked the model into trying,
   * - arguments that do not parse,
   * - a not-found (or any other error) from the application service, reported without its message,
   *   so a domain error can never leak an id, a path or a provider detail into the conversation.
   */
  private async runTool(
    registry: CoachToolRegistry,
    offeredNames: ReadonlySet<string>,
    context: CoachToolContext,
    call: AgentToolCall,
    toolsUsed: string[],
  ): Promise<AgentToolResult> {
    const refuse = (error: string): AgentToolResult => ({
      id: call.id,
      name: call.name,
      content: { error },
    });

    const tool = registry.get(call.name);
    if (!tool || !offeredNames.has(call.name)) {
      return refuse(
        `No tool named "${call.name}" is available here. Use only the tools you were given.`,
      );
    }

    try {
      const content = await tool.execute(context, call.arguments);
      toolsUsed.push(call.name);
      return { id: call.id, name: call.name, content: capped(content) };
    } catch (error) {
      if (error instanceof ToolArgumentError) {
        return refuse(error.message);
      }
      // A domain not-found, an unexpected content shape, a database hiccup: the model is told the
      // lookup failed and nothing else. The route's error hook still records the real error.
      return refuse(`The lookup failed for "${call.name}". Do not retry it more than once.`);
    }
  }
}

/** Last-resort size guard on a tool result, applied to the serialised form the provider receives. */
function capped(content: unknown): unknown {
  const serialised = JSON.stringify(content) ?? "null";
  if (serialised.length <= MAX_TOOL_RESULT_CHARACTERS) {
    return content;
  }
  return {
    error: "The result was too large to send. Ask for fewer items with a smaller limit.",
  };
}
