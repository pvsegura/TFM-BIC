import {
  PRACTICE_EXPLANATION_MAX_LENGTH,
  PRACTICE_MAX_ITEMS,
  PRACTICE_MAX_OPTIONS,
  PRACTICE_MIN_OPTIONS,
  PRACTICE_OPTION_MAX_LENGTH,
  PRACTICE_PROMPT_MAX_LENGTH,
  PRACTICE_TITLE_MAX_LENGTH,
  validateGeneratedPractice,
  type GeneratedPractice,
} from "@tfm-bic/domain";

import type { CoachTool } from "./coach-tool.js";
import { readArguments, requiredString, ToolArgumentError } from "./tool-arguments.js";

/**
 * The practice-generation tool (M23, ADR-034, decision 4).
 *
 * The model *supplies* the activity as the arguments of a tool call; the backend validates it and
 * keeps it for the response. Two things follow from doing it this way rather than with a second,
 * structured-output request:
 *
 * - **One provider call**, not two, for a feature a learner may use repeatedly.
 * - **The application validates before anything is shown**: counts, lengths and above all that the
 *   answer index names an option that exists. An activity that fails validation is reported back to
 *   the model with the reasons, so it can correct itself in the same turn.
 *
 * It writes nothing. A generated activity is not an exercise: no id, no attempt, no points, no
 * progress (that is M7's job and stays M7's job). The UI renders it as plain text in fixed
 * components, so nothing generated can become markup.
 */

/** Where a validated activity is left for the orchestrator to put in the response. */
export interface PracticeCollector {
  readonly activity: GeneratedPractice | undefined;
  collect(activity: GeneratedPractice): void;
}

export function createPracticeCollector(): PracticeCollector {
  let collected: GeneratedPractice | undefined;
  return {
    get activity() {
      return collected;
    },
    collect(activity) {
      // The last accepted activity wins: if the model corrects itself after a validation failure,
      // the learner sees the corrected one.
      collected = activity;
    },
  };
}

function parseItems(raw: unknown): GeneratedPractice["items"] {
  if (!Array.isArray(raw)) {
    throw new ToolArgumentError('"items" is required and must be an array');
  }
  if (raw.length > PRACTICE_MAX_ITEMS) {
    throw new ToolArgumentError(`"items" must contain at most ${PRACTICE_MAX_ITEMS} items`);
  }
  return raw.map((entry, index) => {
    const at = `items[${index}]`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ToolArgumentError(`${at} must be an object`);
    }
    const item = readArguments(entry, ["prompt", "options", "answerIndex", "explanation"]);
    const options = item.options;
    if (!Array.isArray(options)) {
      throw new ToolArgumentError(`${at}.options must be an array of strings`);
    }
    if (!options.every((option) => typeof option === "string")) {
      throw new ToolArgumentError(`${at}.options must contain only strings`);
    }
    if (typeof item.answerIndex !== "number") {
      throw new ToolArgumentError(`${at}.answerIndex must be a number`);
    }
    return {
      prompt: requiredString(item, "prompt", PRACTICE_PROMPT_MAX_LENGTH),
      options: options.map((option) => option.trim()),
      answerIndex: item.answerIndex,
      explanation: requiredString(item, "explanation", PRACTICE_EXPLANATION_MAX_LENGTH),
    };
  });
}

export function createPracticeTools(collector: PracticeCollector): readonly CoachTool[] {
  return [
    {
      declaration: {
        name: "propose_practice_activity",
        description:
          "Offer the learner a short multiple-choice practice activity you have written from their real course content and progress. The application validates it and shows it in the interface, so do not also write the questions out in your reply — introduce it in one sentence. Nothing is recorded and no points are awarded.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: `A short title for the activity, at most ${PRACTICE_TITLE_MAX_LENGTH} characters.`,
            },
            items: {
              type: "array",
              maxItems: PRACTICE_MAX_ITEMS,
              description: `${PRACTICE_MAX_ITEMS} items at most; 3 is usually right.`,
              items: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                    description: `The question, at most ${PRACTICE_PROMPT_MAX_LENGTH} characters.`,
                  },
                  options: {
                    type: "array",
                    minItems: PRACTICE_MIN_OPTIONS,
                    maxItems: PRACTICE_MAX_OPTIONS,
                    items: { type: "string" },
                    description: `${PRACTICE_MIN_OPTIONS}-${PRACTICE_MAX_OPTIONS} answer options, each at most ${PRACTICE_OPTION_MAX_LENGTH} characters.`,
                  },
                  answerIndex: {
                    type: "integer",
                    description: "Zero-based index of the correct option in `options`.",
                  },
                  explanation: {
                    type: "string",
                    description: `Why that answer is correct, at most ${PRACTICE_EXPLANATION_MAX_LENGTH} characters.`,
                  },
                },
                required: ["prompt", "options", "answerIndex", "explanation"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "items"],
          additionalProperties: false,
        },
      },
      // Nothing here awaits anything — the activity arrives in the arguments. The body runs inside
      // `Promise.resolve().then` so a `ToolArgumentError` becomes a *rejection*, like every other
      // tool's, rather than a synchronous throw the port's signature does not promise.
      execute(_context, args: unknown) {
        return Promise.resolve().then(() => {
          const record = readArguments(args, ["title", "items"]);
          const candidate: GeneratedPractice = {
            title: requiredString(record, "title", PRACTICE_TITLE_MAX_LENGTH),
            items: parseItems(record.items),
          };
          const problems = validateGeneratedPractice(candidate);
          if (problems.length > 0) {
            return {
              accepted: false,
              problems,
              note: "The activity was not shown to the learner. Fix these problems and call this tool once more.",
            };
          }
          collector.collect(candidate);
          return {
            accepted: true,
            itemCount: candidate.items.length,
            note: "The activity is now shown in the interface. Introduce it in one sentence; do not repeat the questions.",
          };
        });
      },
    },
  ];
}
