/** The user-data register breaks one of its rules (see `validateUserDataRegister`). */
export class InvalidUserDataRegisterError extends Error {
  constructor(reason: string) {
    super(`Invalid user data register: ${reason}.`);
    this.name = "InvalidUserDataRegisterError";
  }
}
