/** The requested status change is not one a student may make. Names the two statuses — never the student or the word. */
export class InvalidVocabularyTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`A vocabulary item cannot change from "${from}" to "${to}".`);
    this.name = "InvalidVocabularyTransitionError";
  }
}
