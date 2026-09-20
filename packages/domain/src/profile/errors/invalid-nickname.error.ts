/** Deliberately omits the rejected input — see InvalidProfileNameError. */
export class InvalidNicknameError extends Error {
  constructor() {
    super("Not a valid nickname.");
    this.name = "InvalidNicknameError";
  }
}
