/** A teacher–student link that the relationship rules refuse (see `assertCanLink`). */
export class InvalidTeacherStudentLinkError extends Error {
  constructor(reason: string) {
    super(`Cannot link these users: ${reason}.`);
    this.name = "InvalidTeacherStudentLinkError";
  }
}
