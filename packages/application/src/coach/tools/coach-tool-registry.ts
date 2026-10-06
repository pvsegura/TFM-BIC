import type { CoachTool, CoachToolRegistry } from "./coach-tool.js";
import { createContentTools, type ContentToolDependencies } from "./content-tools.js";
import { createExerciseTools, type ExerciseToolDependencies } from "./exercise-tools.js";
import { createLearnerTools, type LearnerToolDependencies } from "./learner-tools.js";
import { createPracticeTools, type PracticeCollector } from "./practice-tools.js";

export type CoachToolDependencies = LearnerToolDependencies &
  ContentToolDependencies &
  ExerciseToolDependencies;

/**
 * Every tool the coach can call, by name (M23, ADR-034).
 *
 * This is the whole surface the model has on the application: if a capability is not here, no
 * prompt can reach it. There is deliberately nothing that writes a record, nothing that names a
 * user, and nothing generic (no SQL, no HTTP, no file access) — the brief's "the model never
 * executes arbitrary application code" is a property of this map, not of an instruction.
 *
 * The practice collector is per-request, so the registry is built per request too. That is cheap
 * (closures over already-constructed use cases) and it is what keeps one learner's generated
 * activity from being visible to another's turn.
 */
export function createCoachToolRegistry(
  deps: CoachToolDependencies,
  practice: PracticeCollector,
): CoachToolRegistry {
  const tools: readonly CoachTool[] = [
    ...createLearnerTools(deps),
    ...createContentTools(deps),
    ...createExerciseTools(deps),
    ...createPracticeTools(practice),
  ];
  const registry = new Map<string, CoachTool>();
  for (const tool of tools) {
    if (registry.has(tool.declaration.name)) {
      // A duplicate name would make which tool runs depend on construction order.
      throw new Error(`Two coach tools are named "${tool.declaration.name}".`);
    }
    registry.set(tool.declaration.name, tool);
  }
  return registry;
}
