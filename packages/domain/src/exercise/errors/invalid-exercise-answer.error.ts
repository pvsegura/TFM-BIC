/** The submitted answer is not a well-formed answer for that exercise. It is
 * refused, not judged: it is neither correct nor incorrect, and never becomes
 * an attempt. The message is fixed and never echoes what was submitted. */
export class InvalidExerciseAnswerError extends Error {
  constructor() {
    super("The submitted answer is not a valid answer for this exercise.");
    this.name = "InvalidExerciseAnswerError";
  }
}
