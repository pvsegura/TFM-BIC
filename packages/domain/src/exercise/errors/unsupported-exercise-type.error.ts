/** No evaluator is registered for this exercise type. Only types the application
 * itself registered can ever be evaluated; nothing in content or a request can add one. */
export class UnsupportedExerciseTypeError extends Error {
  constructor(type: string) {
    super(`Exercise type "${type}" is not supported.`);
    this.name = "UnsupportedExerciseTypeError";
  }
}
