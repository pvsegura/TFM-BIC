export class InvalidExerciseIdError extends Error {
  constructor(value: string) {
    super(
      `"${value}" is not a valid exerciseId (expected lowercase letters, digits and single hyphens, starting with a letter, at most 64 characters).`,
    );
    this.name = "InvalidExerciseIdError";
  }
}
