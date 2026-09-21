/**
 * The kinds of exercise the platform can present and evaluate. A type is a
 * closed, code-defined set — never something content can invent — because each
 * one needs its own configuration schema, evaluator and renderer.
 *
 * Adding a type is: one entry here, a module under `types/` (configuration,
 * answer, evaluator, presentation), a schema in `packages/contracts`, a view in
 * `apps/web`, and tests. No language, lesson, profile or authentication code
 * changes, and no other type's evaluator is touched.
 */
export const EXERCISE_TYPES = ["multiple-choice", "text-answer", "true-false"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export function isValidExerciseType(value: string): value is ExerciseType {
  return EXERCISE_TYPES.some((type) => type === value);
}
