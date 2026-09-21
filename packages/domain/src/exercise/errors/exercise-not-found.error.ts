/** No visible exercise has this id. Does not reveal whether a draft, archived or hidden exercise exists under it. */
export class ExerciseNotFoundError extends Error {
  constructor(exerciseId: string) {
    super(`Exercise "${exerciseId}" was not found.`);
    this.name = "ExerciseNotFoundError";
  }
}
