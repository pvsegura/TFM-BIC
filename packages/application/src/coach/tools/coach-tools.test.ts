import { createDefaultExerciseTypeRegistry, createLanguageId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeContentRepository } from "../../content/test-support/fakes.js";
import { GetContentUseCase } from "../../content/use-cases/get-content.use-case.js";
import { FakeExerciseRepository, makeExerciseCatalog } from "../../exercise/test-support/fakes.js";
import { FakeLearnerInsightsReadModel } from "../test-support/fakes.js";
import type { CoachToolContext } from "./coach-tool.js";
import { createExerciseTools } from "./exercise-tools.js";
import { createPracticeCollector, createPracticeTools } from "./practice-tools.js";
import { ToolArgumentError } from "./tool-arguments.js";

/**
 * The two tools whose behaviour is a product rule rather than a lookup (M23, ADR-034):
 *
 * - `get_exercise_context` must not hand over an answer the learner has not earned, and must use
 *   M7's own evaluator for the one they have.
 * - `propose_practice_activity` must refuse anything the UI could not safely render — above all an
 *   answer index pointing at an option that does not exist.
 */

const LEARNER = "11111111-1111-4111-8111-111111111111";
const OTHER_LEARNER = "22222222-2222-4222-8222-222222222222";

const context: CoachToolContext = {
  userId: LEARNER,
  languageId: createLanguageId("pl"),
  levelId: "a1",
};

function exerciseTool() {
  const catalog = makeExerciseCatalog();
  const contentRepository = new FakeContentRepository(catalog);
  const insights = new FakeLearnerInsightsReadModel();
  const [tool] = createExerciseTools({
    getContent: new GetContentUseCase(contentRepository),
    exercises: new FakeExerciseRepository([...catalog.exercises]),
    registry: createDefaultExerciseTypeRegistry(),
    insights,
  });
  return { tool: tool!, insights };
}

describe("get_exercise_context", () => {
  it("withholds the correct answer when the learner has not answered yet", async () => {
    const { tool } = exerciseTool();

    const result = (await tool.execute(context, { exerciseId: "pl-first-tf" })) as Record<
      string,
      unknown
    >;

    expect(result.correctAnswer).toBeNull();
    expect(result.learnerAttempts).toEqual([]);
    expect(String(result.note)).toMatch(/withheld/i);
    // Nothing in the payload may reveal the key, including through the authored explanation.
    expect(JSON.stringify(result)).not.toContain("authoredFeedback");
  });

  it("gives the correct answer once the learner has attempted it — from M7's own evaluator", async () => {
    const { tool, insights } = exerciseTool();
    insights.attempts.set(`${LEARNER}|pl-first-tf`, [
      { submittedAnswer: false, correct: false, answeredAt: new Date("2026-01-02T00:00:00.000Z") },
    ]);

    const result = (await tool.execute(context, { exerciseId: "pl-first-tf" })) as Record<
      string,
      unknown
    >;

    // The fixture's true-false exercise is configured with `correctAnswer: true`.
    expect(result.correctAnswer).toBe(true);
    expect(result.authoredFeedback).toContain("Cześć");
    expect(result.learnerAttempts).toHaveLength(1);
  });

  it("reads only the session learner's attempts, never another learner's", async () => {
    const { tool, insights } = exerciseTool();
    insights.attempts.set(`${OTHER_LEARNER}|pl-first-tf`, [
      { submittedAnswer: true, correct: true, answeredAt: new Date("2026-01-02T00:00:00.000Z") },
    ]);

    const result = (await tool.execute(context, { exerciseId: "pl-first-tf" })) as Record<
      string,
      unknown
    >;

    // The other learner's attempt exists, but this turn is not theirs: still withheld.
    expect(result.learnerAttempts).toEqual([]);
    expect(result.correctAnswer).toBeNull();
    expect(insights.calls.every((call) => call.userId === LEARNER)).toBe(true);
  });

  it("is not a way around content visibility — a draft exercise is simply not found", async () => {
    const { tool } = exerciseTool();

    await expect(tool.execute(context, { exerciseId: "pl-first-draft" })).rejects.toThrow();
  });

  it("refuses an unexpected argument instead of ignoring it", async () => {
    const { tool } = exerciseTool();

    await expect(
      tool.execute(context, { exerciseId: "pl-first-tf", userId: OTHER_LEARNER }),
    ).rejects.toThrow(ToolArgumentError);
  });

  it("declares no argument that identifies a person", () => {
    const { tool } = exerciseTool();
    const names = Object.keys(tool.declaration.parameters.properties);

    expect(names).not.toContain("userId");
    expect(names).not.toContain("studentId");
    expect(names).not.toContain("email");
  });
});

describe("propose_practice_activity", () => {
  function practiceTool() {
    const collector = createPracticeCollector();
    const [tool] = createPracticeTools(collector);
    return { tool: tool!, collector };
  }

  const validItem = {
    prompt: 'How do you say "good morning"?',
    options: ["Dobranoc", "Dzień dobry"],
    answerIndex: 1,
    explanation: "Dzień dobry is the daytime greeting.",
  };

  it("accepts a well-formed activity and keeps it for the response", async () => {
    const { tool, collector } = practiceTool();

    const result = (await tool.execute(context, {
      title: "Greetings recall",
      items: [validItem],
    })) as Record<string, unknown>;

    expect(result.accepted).toBe(true);
    expect(collector.activity?.items).toHaveLength(1);
  });

  it("refuses an answer index that names an option that does not exist, and keeps nothing", async () => {
    const { tool, collector } = practiceTool();

    const result = (await tool.execute(context, {
      title: "Broken",
      items: [{ ...validItem, answerIndex: 5 }],
    })) as Record<string, unknown>;

    expect(result.accepted).toBe(false);
    expect(JSON.stringify(result.problems)).toContain("answerIndex");
    expect(collector.activity).toBeUndefined();
  });

  it("refuses more items than the limit", async () => {
    const { tool, collector } = practiceTool();

    await expect(
      tool.execute(context, {
        title: "Too many",
        items: Array.from({ length: 9 }, () => validItem),
      }),
    ).rejects.toThrow(ToolArgumentError);
    expect(collector.activity).toBeUndefined();
  });

  it("refuses options that are not strings", async () => {
    const { tool } = practiceTool();

    await expect(
      tool.execute(context, {
        title: "Bad options",
        items: [{ ...validItem, options: ["ok", { toString: "evil" }] }],
      }),
    ).rejects.toThrow(ToolArgumentError);
  });

  it("keeps the corrected activity when the model fixes itself in the same turn", async () => {
    const { tool, collector } = practiceTool();

    await tool.execute(context, { title: "First try", items: [{ ...validItem, answerIndex: 9 }] });
    await tool.execute(context, { title: "Second try", items: [validItem] });

    expect(collector.activity?.title).toBe("Second try");
  });

  it("writes nothing: it only collects", async () => {
    const { tool, collector } = practiceTool();

    await tool.execute(context, { title: "Recall", items: [validItem] });

    // The activity exists only in the collector — no attempt, no progress, no points anywhere.
    expect(collector.activity).toBeDefined();
    expect(Object.keys(collector.activity ?? {})).toEqual(["title", "items"]);
  });
});
