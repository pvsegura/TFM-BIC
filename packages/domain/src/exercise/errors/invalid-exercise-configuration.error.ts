/** An exercise reached an evaluator with a configuration that cannot be
 * evaluated (for example a correct option the exercise does not offer). Content
 * is validated when it is loaded, so this is a defect on the server side, never
 * something a student caused. */
export class InvalidExerciseConfigurationError extends Error {
  constructor(exerciseId: string, reason: string) {
    super(`Exercise "${exerciseId}" has an invalid configuration: ${reason}`);
    this.name = "InvalidExerciseConfigurationError";
  }
}
