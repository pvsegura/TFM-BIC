/** A generation job's status only ever moves queued -> processing -> completed|failed; this attempted move is not allowed. */
export class InvalidVideoGenerationTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move a video generation job from "${from}" to "${to}".`);
    this.name = "InvalidVideoGenerationTransitionError";
  }
}
